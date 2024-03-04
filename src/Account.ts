import '../shimWrapper.js';

import { MC } from "./mc";
import { nim } from "./NetInfo";
import { WalletManager } from "./WalletManager";
import { MRC20Manager, MRC20Token, SerializableMRC20Token } from "./MRC20";
import { TransactionLog } from "./TransactionLog";
import { AccountManager } from './AccountManager';



export type AccountStorageObj =
    {
    name       : string;
    netId      : number;
    encPrivKey : string;
    tokens     : SerializableMRC20Token[];
    };

export class Account
    {
    private name : string;
    private encPrivKey : string = "";
    private ownWm : WalletManager;
    private mrc20 : MRC20Manager = new MRC20Manager();
    private txl : TransactionLog = new TransactionLog();


    public static createFromMnemonic(name : string, currentNetId : number, mnemonic : string, passwordHash : string) : Account | null
        {
        const a = new Account(name, currentNetId);
        a.encPrivKey = a.wm.createFromMnemonic(mnemonic, passwordHash);
        return a.encPrivKey.length ? a : null;
        }

    public static createFromWIF(name : string, currentNetId : number, wif : string, passwordHash : string) : Account | null
        {
        const a = new Account(name, currentNetId);
        a.encPrivKey = a.wm.createFromWIF(wif, passwordHash);
        return a.encPrivKey.length ? a : null;
        }

    public static createFromEncPrivKey(name : string, netId : number, encPrivKey : string) : Account
        {
        const a = new Account(name, netId);
        a.encPrivKey = encPrivKey;
        return a;
        }

    private constructor(name : string, netId : number)
        {
        this.name =  name;
        this.ownWm = new WalletManager(nim().fromId(netId));
        }

    public get accountName() : string         { return this.name;         }
    public get hasWallet()   : boolean        { return this.wm.hasWallet; }
    public get wm()          : WalletManager  { return this.ownWm;        }
    public get tkm()         : MRC20Manager   { return this.mrc20;        }
    public get txLog()       : TransactionLog { return this.txl;          }
    
    public static fromStorageObj(obj : object) : Account
        {
        const storageObj = obj as AccountStorageObj;
        const acnt =  Account.createFromEncPrivKey(storageObj.name, storageObj.netId, storageObj.encPrivKey);
        acnt.mrc20.initFromStorageArray(storageObj.tokens);
        return acnt;
        }

    public toStorageObj() : AccountStorageObj
        {
        return { name: this.name, netId: this.wm.ninfo.id, encPrivKey: this.encPrivKey, tokens: this.mrc20.toStorageArray() };
        }

    public finishLoad() : Promise<void>
        {
        return new Promise<void>((resolve : () => any, reject : (e : any) => any) : void =>
            {
            const am : AccountManager = MC.getMC().storage.accountManager;
            let outCount : number = 1;
            let rejected : boolean = false;

            function complete() : void
                {
                if (!rejected && --outCount == 0) resolve();
                }

            function fail(e : any) : void
                {
                if (!rejected)
                    {
                    rejected = true;
                    reject(e);
                    }
                }

            this.ownWm.reverseResolveMnsName().then(complete).catch(fail);
            if (am.setOnPollingInitialized(complete)) outCount++;
            });
        }

    public reloadWallet(passwordHash : string) : boolean
        {
        return this.wm.reloadWallet(this.encPrivKey, passwordHash);
        }

    public ensureWallet(passwordHash : string) : boolean
        {
        return this.wm.ensureWallet(this.encPrivKey, passwordHash);
        }

    public unloadWallet() : void
        {
        this.ownWm.unloadWallet();
        this.txLog.clearLog();
        }

    public extendTxLog() : Promise<boolean>
        {
        return this.txLog.extend(this.wm);
        }

    public createCandidateToken(address : string) : Promise<MRC20Token>
        {
        return this.mrc20.createCandidateToken(this.wm, address);
        }

    public refreshTokenBalance(tk : MRC20Token) : Promise<boolean>
        {
        return tk.refreshBalance(this.wm, () : boolean => this.okToNotify());
        }

    public refreshAllTokenBalances() : Promise<boolean>
        {
        return this.mrc20.refreshAllTokenBalances(this.wm, () : boolean => this.okToNotify());
        }

    private okToNotify() : boolean
        {
        const am : AccountManager = MC.getMC().storage.accountManager;
        return am.isLoggedIn && am.current == this;
        }
    }
