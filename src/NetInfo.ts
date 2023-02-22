import ethers from "ethers";
import { Network, networks } from "metrixjs-wallet";
import { MNS, Name, getMNSAddress, DefaultReverseResolver, getMNSContract, BaseResolver } from '@metrixnames/mnslib';
import ABI from '@metrixnames/mnslib/lib/abi';
import { APIProvider, NetworkType, Provider, MetrixContract } from '@metrixcoin/metrilib';
import bs58 from "bs58";
import { decode, encode } from 'base-64';

import { ADDRESS_SYNTAX, MC } from "./mc";

if (!global.btoa) global.btoa = encode;
if (!global.atob) global.atob = decode;



const ZERO_ADDRESS : string = "0x0000000000000000000000000000000000000000";

export enum NET_ID
    {
    MAIN   = 0,
    TEST   = 1,
    length = 2
    };

export class NetInfo
    {
    protected ownId : number;
    protected ownName : string;
    protected txUrlHeader : string;
    protected tokenUrlHeader : string;
    protected hostNetwork : Network;

    public constructor(name : string, id : number, txUrlHeader : string, tokenUrlHeader : string, network : Network)
        {
        this.ownName = name;
        this.ownId = id;
        this.txUrlHeader = txUrlHeader;
        this.tokenUrlHeader = tokenUrlHeader;
        this.hostNetwork = network;
        }

    public get name()    : string  { return this.ownName;     }
    public get id()      : number  { return this.ownId;       }
    public get network() : Network { return this.hostNetwork; }

    public toTxUrl(txId : string) : string
        {
        return `${ this.txUrlHeader }${ txId }`;
        }

    public toTokenUrl(contractAddress : string) : string
        {
        return `${ this.tokenUrlHeader }${ MC.canonicalizeEvmAddress(contractAddress) }`;
        }

    public mnsResolveEvm(mnsName : string) : Promise<string>
        {
        return new Promise<string>((resolve : (evmAddress : string) => any, reject : (e : any) => any) : void =>
            {
            this.mnsResolveGeneral(mnsName).then((data : string) : void =>
                {
                if (data && MC.validateEvmAddress(data))
                    resolve(data.startsWith("0x") ? data.substring(2) : data);
                else
                    resolve(``);
                })
            .catch(reject);
            });
        }

    public mnsResolveMRX(mnsName : string) : Promise<string>
        {
        return new Promise<string>((resolve : (address : string) => any, reject : (e : any) => any) =>
            {
            setTimeout(() : void => resolve(``), 0);
            });
        }

    public mnsResolveGeneral(mnsName : string) : Promise<string>
        {
        return new Promise<string>((resolve : (data : string) => any, reject : (e : any) => any) =>
            {
            setTimeout(() : void => resolve(``), 0);
            });
        }

    public mnsReverseResolve(data : string) : Promise<string>
        {
        return new Promise<string>((resolve : (label : string) => any, reject : (e : any) => any) =>
            {
            setTimeout(() : void => resolve(``), 0);
            });
        }
    }



export class NetInfoWithMns extends NetInfo
    {
    private provider : Provider;
    private mns : MNS;
    private mnsContract : MetrixContract;
    private reverseResolver : DefaultReverseResolver;

    constructor(name : string, id : number, ownTxUrlHeader : string, ownTokenUrlHeader : string, network : Network)
        {
        super(name, id, ownTxUrlHeader, ownTokenUrlHeader, network);
        const netType : NetworkType = name as NetworkType;
        this.provider = new APIProvider(netType);
        this.mns = new MNS(netType, this.provider, getMNSAddress(netType));
        this.mnsContract = getMNSContract(getMNSAddress(netType), this.provider);
        this.reverseResolver = new DefaultReverseResolver(this.provider);
        }

    public mnsResolveMRX(mnsName : string) : Promise<string>
        {
        return new Promise<string>((resolve : (address : string) => any, reject : (e : any) => any) : void =>
            {
            const name : Name = this.mns.name(mnsName);
            this.mnsContract.call(`recordExists(bytes32)`, [ name.hash ]).then((result? : ethers.Result) : void =>
                {
                if (result && result.toString() === `true`)
                    name.getAddress('MRX').then(resolve).catch(reject);
                else
                    resolve(``);
                })
            .catch(reject);
            });
        }

    public mnsResolveGeneral(mnsName : string) : Promise<string>
        {
        return new Promise<string>((resolve : (data : string) => any, reject : (e : any) => any) : void =>
            {
            const self : NetInfoWithMns = this;
            const name : Name = this.mns.name(mnsName);
            let outCount : number = 2;
            let resolverAddr : string = ``;

            function part2() : void
                {
                if (--outCount > 0) return;

                const resolver = new class extends BaseResolver
                    {
                    public constructor()
                        {
                        super(resolverAddr, self.provider, ABI.PublicResolver);
                        }
                
                    public addr(node : string) : Promise<string>
                        {
                        return new Promise<string>((resolve : (data : string) => any, reject : (e : any) => any) =>
                            {
                            this.call('addr(bytes32)', [ node ])
                                .then((result? : ethers.Result) : void => resolve(result ? result.toString() : ``))
                                .catch((e : any) : void => resolve(``));
                            });
                        }
                    }();

                resolver.supportsInterface(`0x3b3b57de`).then((hasInterface : boolean) : void =>
                    {
                    if (hasInterface)
                        resolver.addr(name.hash).then(resolve).catch((e : any) : void => resolve(``));
                    else
                        resolve(``);
                    })
                .catch((e : any) : void => resolve(``));
                }

            name.getResolverAddr().then((address : string) : void =>
                {
                if (address != ZERO_ADDRESS)
                    {
                    resolverAddr = address;
                    part2();
                    }
                else
                    resolve(``);
                })
            .catch((e : any) : void => resolve(``));
            this.mnsContract.call('recordExists(bytes32)', [ name.hash ]).then((result? : ethers.Result) : void =>
                {
                if (result && result.toString() === `true`)
                    part2();
                else
                    resolve(``);
                })
            .catch(reject);
            });
        }

    public mnsReverseResolveAddr(address : string) : Promise<string>
        {
        if (MC.anaylizeAddressSyntax(address) == ADDRESS_SYNTAX.MRX) address = this.toHexAddress(address);
        const reverseInput : string = `${ MC.canonicalizeEvmAddress(address) }.addr.reverse`;
        return new Promise<string>((resolve : (label : string) => any, reject : (e : any) => any) : void =>
            {
            const reverseName : Name = this.mns.name(reverseInput, this.reverseResolver.address);
            this.reverseResolver.name(reverseName.hash).then(resolve).catch(reject);
            });
        }

    private toHexAddress(address : string) : string
        {
        const bytes : Uint8Array = bs58.decode(address);
        const hex : string = Buffer.from(bytes.buffer).toString('hex');
        return hex.substring(2, hex.length - 8);
        }
    }



export class NetInfoManager
    {
    private infoArray : NetInfo[] = [ ];
    private infosByNmae : Map<string, NetInfo> = new Map<string, NetInfo>();

    public constructor()
        {
        this.infoArray.push(new NetInfoWithMns("MainNet", NET_ID.MAIN, "https://explorer.metrixcoin.com/tx/",         "https://explorer.metrixcoin.com/mrc20/",         networks.mainnet));
        this.infoArray.push(new NetInfoWithMns("TestNet", NET_ID.TEST, "https://testnet-explorer.metrixcoin.com/tx/", "https://testnet-explorer.metrixcoin.com/mrc20/", networks.testnet));
        for (const ni of this.infoArray) this.infosByNmae.set(ni.name, ni);
        }

    public fromId(id : number) : NetInfo
        {
        if (0 <= id && id < NET_ID.length)
            return this.infoArray[id];
        else
            MC.raiseError(`NetInfoManager unknown network id ${ id }`, "NetInfoManager fromId()");
        return this.infoArray[0]; // This never happens because MC.raiseError() exits the program. But I don't know how to tell typescript that.
        }

    public fromName(name : string) : NetInfo
        {
        const ni = this.infosByNmae.get(name);
        if (!ni) MC.raiseError(`NetInfoManager unknown network name ${ name }`, "NetInfoManager fromName()");
        return ni!;
        }
    }

const manager = new NetInfoManager();

export function nim() : NetInfoManager
    {
    return manager;
    }
