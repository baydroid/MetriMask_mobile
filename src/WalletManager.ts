import "../shimWrapper.js";

const bitcoin = require("bitcoinjs-lib");
import metrixMessage from "bitcoinjs-message";
import { Insight, Wallet as MRXWallet, WalletRPCProvider } from "metrixjs-wallet";
import { Mweb3 } from "mweb3";

import { MC, BIG_0, SATOSHIS_PER_MRX, MRX_DECIMALS, DEFAULT_GAS_LIMIT, DEFAULT_GAS_PRICE_MRX } from "./mc";
import { NetInfo } from "./NetInfo";
import { mrc20TokenABI } from "./mrc20TokenABI";
import { SerializableMRC20Token } from "./MRC20";



const SCRYPT_PARAMS_PRIV_KEY = { N: 512, r: 8, p: 1 }; // TODO adjust this for production, MetriMask browser extension uses const SCRYPT_PARAMS_PRIV_KEY = { N: 8192, r: 8, p: 1 };
const SEND_WIERDNESS_ERROR   = "Unable to send because of an unknown error."



// These Mweb3 typescript APIs are here because mweb3 is in javascript, and doesn't yet have them.

abstract class Mweb3Main
    {
    /**
     * Mweb3 constructor.
     * @param {string|Mweb3Provider} provider Either URL string to create HttpProvider or a Mweb3 compatible provider.
     */
    constructor(provider : WalletRPCProvider) { }

    /**
     * Constructs a new Contract instance.
     * @param {string} address Address of the contract.
     * @param {array} abi ABI of the contract.
     * @return {Contract} Contract instance.
     */
    public abstract Contract(address : string, abi : object) : Mweb3Contract;
    }

interface Mweb3ContractCallParams
    {
    methodArgs    : any[];
    senderAddress : string;
    }

interface Mweb3ContractSendParams extends Mweb3ContractCallParams
    {
    amount?   : number;
    gasLimit? : number | string;
    gasPrice? : number; // MRX/GAS (i.e. not Satoshi/GAS)
    }

abstract class Mweb3Contract
    {
    /**
     * Contract constructor.
     * @param {string|Mweb3Provider} provider Either URL string to create HttpProvider or a Mweb3 compatible provider.
     * @param {string} address Address of the contract.
     * @param {array} abi ABI of the contract.
     */
    constructor(provider : WalletRPCProvider, address : string, abi : any[]) { }

    /**
     * Executes a callcontract on a view/pure method.
     * @param {string} methodName Name of contract method
     * @param {object} params Parameters of contract method
     * @return {Promise} Call result.
     */
    public abstract call(methodName : string, params : Mweb3ContractCallParams) : Promise<object>;

    /**
     * Executes a sendtocontract transaction.
     * @param {string} methodName Method name to call.
     * @param {object} params Parameters of the contract method.
     * @return {Promise} Transaction ID of the sendtocontract.
     */
    public abstract send(methodName : string, params : Mweb3ContractSendParams) : Promise<object>;
    }



export enum RPC_METHOD
    {
    SEND_TO_CONTRACT = 'sendtocontract',
    CALL_CONTRACT    = 'callcontract'
    };

export type ContractCallParams =
    {
    method : string;
    args   : any[];
    };

export type ContractSendParams = ContractCallParams &
    {
    account :
        {
        name    : string;
        address : string;
        };
    };

export type WebliblVerifyResult =
    {
    verifiedOK? : boolean;
    error?      : string;
    };

export type WeblibSignResult =
    {
    signedMsgBase64? : string;
    error?           : string;
    };

export class WalletManager
    {
    private ownNinfo : NetInfo;
    private ownWallet : MRXWallet | null = null;
    private walletRpcProvider : WalletRPCProvider | null = null;
    private walletMweb3 : Mweb3Main | null = null;
    private walletAddress : string = "";
    private nnsNameByReversal : string = "";
    private lastBalanceSat : bigint = BigInt(-10);
    private lastBalanceSatDelta : bigint = BIG_0;
    private lastUnconfirmedBalanceSat : bigint = BigInt(-10);
    private lastUnconfirmedBalanceSatDelta : bigint = BIG_0;
    private lastTxCount : number = 0;
    private lastUnconfirmedTxCount : number = 0;
    private lastTxCountDelta : number = 0;
    private lastUnconfirmedTxCountDelta : number = 0;
    private lastUpdated : number = 0;

    public constructor(ninfo : NetInfo)
        {
        this.ownNinfo = ninfo;
        }

    public get ninfo()                      : NetInfo           { return this.ownNinfo;                       }
    public get hasWallet()                  : boolean           { return !!this.ownWallet;                    }
    public get wallet()                     : MRXWallet         { return this.ownWallet!;                     }
    public get rpcProvider()                : WalletRPCProvider { return this.walletRpcProvider!              }
    public get address()                    : string            { return this.walletAddress;                  }
    public get mnsNmae()                    : string            { return this.nnsNameByReversal;              }
    public get balanceSat()                 : bigint            { return this.lastBalanceSat;                 }
    public get balanceSatDelta()            : bigint            { return this.lastBalanceSatDelta;            }
    public get unconfirmedBalanceSat()      : bigint            { return this.lastUnconfirmedBalanceSat;      }
    public get unconfirmedBalanceSatDelta() : bigint            { return this.lastUnconfirmedBalanceSatDelta; }
    public get txCount()                    : number            { return this.lastTxCount;                    }
    public get unconfirmedTxCount()         : number            { return this.lastUnconfirmedTxCount;         }
    public get txCountDelta()               : number            { return this.lastTxCountDelta;               }
    public get unconfirmedTxCountDelta()    : number            { return this.lastUnconfirmedTxCountDelta;    }
    public get whenUpdated()                : number            { return this.lastUpdated;                    }

    public createFromMnemonic(mnemonic : string, passwordHash : string) : string
        {
        try
            {   
            this.ownWallet = this.ownNinfo.network.fromMnemonic(mnemonic, passwordHash);
            this.loadWalletExtras();
            return this.ownWallet.toEncryptedPrivateKey(passwordHash, SCRYPT_PARAMS_PRIV_KEY);
            }
        catch (e : any)
            {
            this.unloadWallet();
            return "";
            }
        }

    public createFromWIF(wif : string, passwordHash : string) : string
        {
        try
            {
            this.ownWallet = this.ownNinfo.network.fromWIF(wif);
            this.loadWalletExtras();
            return this.ownWallet.toEncryptedPrivateKey(passwordHash, SCRYPT_PARAMS_PRIV_KEY);
            }
        catch (e : any)
            {
            this.unloadWallet();
            return "";
            }
        }

    public ensureWallet(encPrivKey : string, passwordHash : string) : boolean
        {
        return this.hasWallet ? true : this.reloadWallet(encPrivKey, passwordHash);
        }

    public reloadWallet(encPrivKey : string, passwordHash : string) : boolean
        {
        try
            {
            this.ownWallet = this.ownNinfo.network.fromEncryptedPrivateKey(encPrivKey, passwordHash, SCRYPT_PARAMS_PRIV_KEY);
            this.loadWalletExtras();
            }
        catch (e)
            {
            this.unloadWallet();
            return false;
            }
        return true;
        }

    private loadWalletExtras() : void
        {
        this.walletAddress = this.ownWallet!.keyPair.getAddress();
        this.walletRpcProvider = new WalletRPCProvider(this.ownWallet!);
        this.walletMweb3 = new Mweb3(this.walletRpcProvider);
        this.lastBalanceSat = BigInt(-10);
        this.lastBalanceSatDelta = BIG_0;
        this.lastUnconfirmedBalanceSat = BigInt(-10);
        this.lastUnconfirmedBalanceSatDelta = BIG_0;
        this.lastTxCount = 0;
        this.lastUnconfirmedTxCount = 0;
        this.lastTxCountDelta = 0;
        this.lastUnconfirmedTxCountDelta = 0;
        this.lastUpdated = 0;
        }

    public loadInfoAndMns() : Promise<Insight.IGetInfo | null>
        {
        return new Promise<Insight.IGetInfo | null>((resolve : (info : Insight.IGetInfo | null) => any, reject : (e : any) => any) : void =>
            {
            let outCount : number = 2;
            let rejected : boolean = false;
            let infoReported : Insight.IGetInfo | null = null;

            function complete(e : any) : void
                {
                if (!rejected)
                    {
                    if (e !== null)
                        {
                        rejected = true;
                        reject(e);
                        }
                    else if (--outCount == 0)
                        resolve(infoReported);
                    }
                }

            this.getInfo().then((info : Insight.IGetInfo | null) : void => { infoReported = info; complete(null); }).catch(complete);
            this.reverseResolveMnsName().then((label : string) : void => complete(null)).catch(complete);
            });
        }

    private reverseResolveMnsName() : Promise<string>
        {
        return new Promise<string>((resolve : (label : string) => any, reject : (e : any) => any) : void =>
            {
            this.ninfo.mnsReverseResolve(this.walletAddress).then((label : string) : void =>
                {
                this.nnsNameByReversal = label;
                resolve(label);
                })
            .catch(reject);
            });
        }

    public unloadWallet() : void
        {
        this.ownWallet = null;
        this.walletRpcProvider = null;
        this.walletMweb3 = null;
        this.walletAddress = ``;
        }

    public getInfo() : Promise<Insight.IGetInfo | null>
        {
        return new Promise<Insight.IGetInfo | null>((resolve : (info : Insight.IGetInfo | null) => any, reject : (e : any) => any) : void =>
            {
            if (!this.ownWallet)
                setTimeout(() : void => resolve(null), 0);
            else
                this.ownWallet!.getInfo().then((info : Insight.IGetInfo) : void =>
                    {
                    const balanceSat = BigInt(info.balanceSat);
                    this.lastBalanceSatDelta = this.lastBalanceSat - balanceSat;
                    this.lastBalanceSat = balanceSat;
                    const unconfirmedBalanceSat = BigInt(info.unconfirmedBalanceSat);
                    this.lastUnconfirmedBalanceSatDelta = this.lastUnconfirmedBalanceSat - unconfirmedBalanceSat;
                    this.lastUnconfirmedBalanceSat = unconfirmedBalanceSat;
                    this.lastTxCountDelta = info.txApperances - this.lastTxCount;
                    this.lastUnconfirmedTxCountDelta = info.unconfirmedTxApperances - this.lastUnconfirmedTxCount;
                    this.lastTxCount = info.txApperances;
                    this.lastUnconfirmedTxCount = info.unconfirmedTxApperances;
                    this.lastUpdated = Date.now();
                    resolve(info);
                    })
                .catch(reject);
            });
        }

    public getTransactions(pageNum : number) : Promise<Insight.IRawTransactions>
        {
        return this.ownWallet!.getTransactions(pageNum);
        }

    public getMRC20Balance(contractAddress : string) : Promise<string>
        {
        const contractAddr = MC.canonicalizeEvmAddress(contractAddress)!;
        return new Promise<string>((resolve : (balanceStr : string) => any, reject : (e : any) => any) =>
            {
            const c : Mweb3Contract = this.walletMweb3!.Contract(contractAddr, mrc20TokenABI);
            const p : Mweb3ContractCallParams = { senderAddress: this.walletAddress, methodArgs: [ this.walletAddress ]};
            c.call("balanceOf", p).then((result : any) =>
                {
                if (result && result.executionResult && result.executionResult.formattedOutput && result.executionResult.formattedOutput.balance)
                    resolve(result.executionResult.formattedOutput.balance.toString());
                else
                    reject(`Error calling contract to get balance.`);
                })
            .catch(reject);
            });
        }

    public getMRC20Info(contractAddress : string) : Promise<SerializableMRC20Token>
        {
        const contractAddr = MC.canonicalizeEvmAddress(contractAddress)!;
        return new Promise<SerializableMRC20Token>((resolve : (info : SerializableMRC20Token) => any, reject : (e : any) => any) =>
            {
            const c : Mweb3Contract = this.walletMweb3!.Contract(contractAddr, mrc20TokenABI);
            const p : Mweb3ContractCallParams = { senderAddress: this.walletAddress, methodArgs: [ ]};
            let error : any = null;
            const info : SerializableMRC20Token = { address: contractAddr, name: ``, symbol: ``, decimals: -1 };
            let outCount = 4;

            function call(methodName : string, setInfo : (formattedOutput_0 : any) => any) : void
                {
                c.call(methodName, p).then((result : any) =>
                    {
                    if (result && result.executionResult && result.executionResult.formattedOutput && result.executionResult.formattedOutput[`0`])
                        setInfo(result.executionResult.formattedOutput[`0`]);
                    else
                        error = `Error calling contract to get info`;
                    finish();
                    })
                .catch((e : any) =>
                    {
                    finish();
                    });
                }

            function finish() : void
                {
                outCount--;
                if (!outCount)
                    {
                    if (error)
                        reject(error);
                    else
                        resolve(info);
                    }
                }

            this.getMRC20Balance(contractAddr).then((balance : string) : void =>
                {
                info.balanceSat = balance;
                finish();
                })
            .catch((e : any) : void =>
                {
                error = Error(e);
                finish();
                });
            call(`name`, (formattedOutput_0 : any) : void => { info.name = formattedOutput_0; });
            call(`symbol`, (formattedOutput_0 : any) : void => { info.symbol = formattedOutput_0; });
            call(`decimals`, (formattedOutput_0 : any) : void => { info.decimals = Number.parseInt(formattedOutput_0); });
            });
        }

    public mrc20Send(contractAddress : string, recipientAddr : string, amount : bigint, gasLimit? : number | undefined, gasPriceSat? : number | undefined) : Promise<string>
        {
        const contractAddr = MC.canonicalizeEvmAddress(contractAddress)!;
        return new Promise<string>((resolve : (txid : string) => any, reject : (e : any) => any) =>
            {
            const mrxPerGas : number = gasPriceSat ? gasPriceSat/SATOSHIS_PER_MRX : DEFAULT_GAS_PRICE_MRX;
            if (!gasLimit) gasLimit = DEFAULT_GAS_LIMIT;
            const c : Mweb3Contract = this.walletMweb3!.Contract(contractAddr, mrc20TokenABI);
            const p : Mweb3ContractSendParams = { senderAddress: this.walletAddress, methodArgs: [ recipientAddr, amount.toString() ], gasLimit: gasLimit.toFixed(MRX_DECIMALS), gasPrice: mrxPerGas };
            c.send("transfer", p).then((result : any) =>
                {
                if (result.txid)
                    resolve(result.txid);
                else
                    reject(result.message ? result.message : SEND_WIERDNESS_ERROR);
                })
            .catch(reject);
            });
        }

    public weblibRawCall(params : ContractCallParams) : Promise<Insight.IContractCall | Insight.ISendRawTxResult>
        {
        return this.walletRpcProvider!.rawCall(params.method, params.args);
        }

    public weblibSign(args: any[]) : WeblibSignResult // args[0] is a web page provided string supposed to identify the signature requester, it's displayed on the permission to sign screen.
        {
        if (args.length < 2) return { error: `Not enough arguments supplied to sign message.` };
        const message = args[1]
        const prefix = (args.length === 3 && args[2] === true) ? `\x17Metrix Signed Message:\n` : undefined;
        const options = (args.length === 4 && JSON.stringify(args[3]).indexOf(`segwitType` || `extraEntropy`) !== -1) ? args[3] : undefined;
        try
            {
            const keyPair = bitcoin.ECPair.fromWIF(this.ownWallet!.toWIF(), this.ninfo.network.info);
            const signedMessage = metrixMessage.sign(message, keyPair.privateKey, keyPair.compressed, prefix, options);
            if (signedMessage)
                return { signedMsgBase64: signedMessage.toString(`base64`) };
            else
                return { error: `Error signing message.` };
            }
        catch (e : any)
            {
            const error = e && e.message ? e.message : `Error during signature calculation.`;
            return { error };
            }
        }

    public weblibVerify(args: any[]) : WebliblVerifyResult
        {
        if (args.length < 3) return { error: `Not enough arguments supplied to verify message.` };
        const message = args[0];
        const address = args[1];
        const signature = args[2];
        const prefix = (args.length === 4 && args[3] === true) ? '\x17Metrix Signed Message:\n' : undefined;
        let checkSegwitAlways;
        if (args.length === 5 && typeof args[4] === 'boolean') checkSegwitAlways = args[4];
        try
            {
            return { verifiedOK: metrixMessage.verify(message, address, signature, prefix, checkSegwitAlways) };
            }        
        catch (e : any)
            {
            const error = e && e.message ? e.message : `Error during signature verificastion calculation.`;
            return { error };
            }
        }
    }
