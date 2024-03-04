import '../shimWrapper.js';

import { generateMnemonic, Insight } from "metrixjs-wallet";
import scrypt from "scryptsy";
import { ItemType } from 'react-native-dropdown-picker';

import { MC, BIG_0 } from "./mc";
import { Account, AccountStorageObj } from "./Account";
import { MRC20Token } from './MRC20';



const SCRYPT_PARAMS_PASSWORD = { N: 512, r: 8, p: 1 };  // TODO adjust this for production, MetrisMask browser extension uses SCRYPT_PARAMS_PASSWORD = { N: 131072, r: 8, p: 1 };
const POLLING_INTERVAL_SECS  = 80;



type AccountManagerStorageObj =
    {
    currentAccountName: string;
    accountArray: AccountStorageObj[];
    };

export class AccountManager
    {
    private accountsByName : Map<string, Account> = new Map<string, Account>();
    private currentAccount : Account | null = null;
    private passwordHash : string = ""; // Empty string here means user's logged out.
    private accountNotifications : Map<number, () => any> = new Map<number, () => any>();
    private balanceNotifications : Map<number, () => any> = new Map<number, () => any>();
    private txLogNotifications : Map<number, () => any> = new Map<number, () => any>();
    private pollingNonce : number = 0;
    private pollingTimeout : ReturnType<typeof setTimeout> | null = null;
    private onPollingInitialized : (() => void) | null = null;
    private pollingInitializing : boolean = false;
    private pollingOngoing : boolean = false;
    private pollAll : boolean = false;

    public get hasCurrent() : boolean { return !!this.currentAccount;        }
    public get current()    : Account { return this.currentAccount!;         }
    public get canLogin()   : boolean { return this.accountsByName.size > 0; }

    public get isLoggedIn() : boolean
        {
        if (this.passwordHash.length && this.currentAccount && (this.currentAccount.ensureWallet(this.passwordHash)))
            return true;
        else
            {
            this.triggerLogout();
            return false;
            }
        }

    public get accountDropDownItems() : ItemType<string>[]
        {
        const items : ItemType<string>[] = [ ];
        for (const acnt of this.accountsByName.values()) items.push({ label: acnt.accountName, value: acnt.accountName } );
        return items.sort((a: ItemType<string>, b: ItemType<string>) : number => { return a.label!.localeCompare(b.label!); });
        }

    public hasAccount(name : string) : boolean
        {
        return this.accountsByName.has(name);
        }

    public providePassword(password : string) : void
        {
        const { N, r, p } = SCRYPT_PARAMS_PASSWORD;
        const saltBuffer = Buffer.from(MC.getMC().storage.salt);
        const derivedKey = scrypt(password, saltBuffer, N, r, p, 64);
        this.passwordHash = derivedKey.toString("hex");
        }

    public validatePassword(password : string) : boolean
        {
        if (!this.isLoggedIn) MC.raiseError(`Attempt to validate a password without first logging in.`, "AccountManager validatePassword()");
        const { N, r, p } = SCRYPT_PARAMS_PASSWORD;
        const saltBuffer = Buffer.from(MC.getMC().storage.salt);
        const derivedKey = scrypt(password, saltBuffer, N, r, p, 64);
        return this.passwordHash == derivedKey.toString("hex");
        }

    public login() : boolean
        {
        if (!this.passwordHash.length) MC.raiseError(`Attempt to login without first providing a password.`, "AccountManager login()");
        if (!this.currentAccount) MC.raiseError(`Attempt to login when there are no accounts to login to.`, "AccountManager login()");
        if (this.current.reloadWallet(this.passwordHash))
            {
            this.notifyAccountChanged();
            return true;
            }
        else
            {
            this.triggerLogout();
            return false;
            }
        }

    // Returns a zero length string if it can't create the account because the name's already in use, otherwise returns the mnemonic.
    public createNewAccount(name : string, netId : number) : string 
        {
        if (!this.passwordHash.length) MC.raiseError(`Attempt to create account without first providing a password.`, "AccountManager createNewAccount()");
        if (this.accountsByName.has(name))
            return "";
        else
            {
            const mnemonic = generateMnemonic();
            const acnt = Account.createFromMnemonic(name, netId, mnemonic, this.passwordHash);
            this.addAccount(acnt!);
            this.updateCurrentAccount(acnt!);
            this.saveSelf();
            return mnemonic;
            }
        }

    // Returns false if it can't create the account because the name's already in use or the mnemonic's bad, otherwise returns true.
    public importByMnemonic(name : string, netId : number, mnemonic : string) : boolean 
        {
        if (!this.passwordHash.length) MC.raiseError(`Attempt to import account by mnemonic without first providing a password.`, "AccountManager importByMnemonic()");
        if (this.accountsByName.has(name))
            return false;
        else
            {
            const acnt = Account.createFromMnemonic(name, netId, mnemonic, this.passwordHash);
            if (!acnt) return false;
            this.addAccount(acnt);
            this.updateCurrentAccount(acnt);
            return true;
            }
        }

    // Returns false if it can't create the account because the name's already in use or the WIF's bad, otherwise returns true.
    public importByWIF(name : string, netId : number, wif : string) : boolean 
        {
        if (!this.passwordHash.length) MC.raiseError(`Attempt to import by WIF without first providing a password.`, "AccountManager importByWIF()");
        if (this.accountsByName.has(name))
            return false;
        else
            {
            const acnt = Account.createFromWIF(name, netId, wif, this.passwordHash);
            if (!acnt) return false;
            this.addAccount(acnt);
            this.updateCurrentAccount(acnt);
            return true;
            }
        }

    public setOnPollingInitialized(onPollingInitialized : () => void) : boolean
        {
        if (this.pollingInitializing)
            {
            this.onPollingInitialized = onPollingInitialized;
            return true;
            }
        else
            return false;
        }

    public removeAccount(name : string) : boolean
        {
        const maybeAcnt = this.accountsByName.get(name);
        if (!maybeAcnt) return this.isLoggedIn;
        const acnt = maybeAcnt!;
        acnt.unloadWallet();
        this.accountsByName.delete(name);
        if (this.accountsByName.size == 0)
            {
            this.updateCurrentAccount(null);
            return false;
            }
        if (acnt == this.currentAccount)
            {
            for (const acnt of this.accountsByName.values())
                {
                this.updateCurrentAccount(acnt);
                break;
                }
            }
        return this.isLoggedIn;
        }

    public setCurrentAccountNeedsWork(name : string) : boolean
        {
        const acnt = this.accountsByName.get(name);
        if (!acnt) return false;
        return !acnt.hasWallet;
        }

    public setCurrentAccount(name : string) : boolean
        {
        const acnt = this.accountsByName.get(name);
        if (!acnt) return false;
        if (acnt.wm.hasWallet || (this.passwordHash && acnt.reloadWallet(this.passwordHash)))
            {
            this.updateCurrentAccount(acnt);
            return true;
            }
        else
            {
            this.triggerLogout();
            return false;
            }
        }

    public saveSelf() : void
        {
        MC.getMC().storage.accountManager = this;
        }

    private addAccount(acnt : Account) : void
        {
        this.accountsByName.set(acnt.accountName, acnt);
        }

    public startAccountNotifications(onAccountChange : (() => any)) : number
        {
        const nref = MC.getUniqueInt();
        this.accountNotifications.set(nref, onAccountChange);
        return nref;
        }

    public stopAccountNotifications(notificationRef : number) : void
        {
        this.accountNotifications.delete(notificationRef);
        }

    public startBalanceNotifications(onBalanceChange : (() => any)) : number
        {
        const nref = MC.getUniqueInt();
        this.balanceNotifications.set(nref, onBalanceChange);
        this.softBumpPolling();
        return nref;
        }

    public stopBalanceNotifications(notificationRef : number) : void
        {
        this.balanceNotifications.delete(notificationRef);
        }

    public startTxLogNotifications(onTxLogChange : (() => any)) : number
        {
        const nref = MC.getUniqueInt();
        this.txLogNotifications.set(nref, onTxLogChange);
        this.softBumpPolling();
        return nref;
        }

    public stopTxLogNotifications(notificationRef : number) : void
        {
        this.txLogNotifications.delete(notificationRef);
        }

    public startAllTokensNotifications(onAnyBalanceChange : () => any) : number
        {
        const nref = this.current.tkm.startNotifications(onAnyBalanceChange);
        this.softBumpPolling();
        return nref;
        }

    public stopAllTokensNotifications(notificationRef : number) : void
        {
        this.current.tkm.stopNotifications(notificationRef);
        }

    public startSingleTokenNotifications(tk : MRC20Token, onBalanceChange : (tk : MRC20Token) => any) : number
        {
        const nref = this.current.tkm.startTokenNotifications(tk, onBalanceChange);
        this.softBumpPolling();
        return nref;
        }

    public stopSingleTokenNotifications(tk : MRC20Token, notificationRef : number) : void
        {
        this.current.tkm.stopTokenNotifications(tk, notificationRef);
        }

    private notifyAccountChanged() : void
        {
        for (const onNotify of this.accountNotifications.values()) onNotify();
        if (this.isLoggedIn)
            {
            for (const onNotify of this.balanceNotifications.values()) onNotify();
            for (const onNotify of this.txLogNotifications.values()) onNotify();
            this.current.tkm.issueAllNotifications();
            this.hardBumpPolling(true);
            }
        else
            this.stopPolling();
        }

    private softBumpPolling() : void
        {
        if (!this.pollingOngoing) this.startPolling();
        }

    private hardBumpPolling(pollAll1stTime : boolean) : void
        {
        this.stopPolling();
        this.pollAll = pollAll1stTime;
        this.startPolling();
        }

    private stopPolling() : void
        {
        if (this.pollingTimeout)
            {
            clearTimeout(this.pollingTimeout);
            this.pollingTimeout = null;
            }
        this.pollAll = false;
        this.pollingOngoing = false;
        this.pollingNonce++;
        }

    private startPolling() : void
        {
        this.pollingInitializing = this.pollingOngoing = true;
        this.pollingRepetitionUnit(++this.pollingNonce);
        }

    private pollingRepetitionUnit(myNonce : number) : void
        {
        this.pollingTimeout = null;
        if (myNonce == this.pollingNonce && this.isLoggedIn)
            {
            this.pollingActions(myNonce).then(() : void =>
                {
                this.finishPollingRepetitionUnit(myNonce);
                })
            .catch((e : any) : void =>
                {
                MC.raiseError(e, "Polling action error.");
                this.finishPollingRepetitionUnit(myNonce);
                });
            }
        }

    private finishPollingRepetitionUnit(myNonce : number) : void
        {
        if (myNonce == this.pollingNonce)
            {
            this.pollAll = false;
            if (this.pollingInitializing)
                {
                this.pollingInitializing = false;
                if (this.onPollingInitialized)
                    {
                    this.onPollingInitialized();
                    this.onPollingInitialized = null;
                    }
                }
            if (this.isLoggedIn)
                this.pollingTimeout = setTimeout(() : void => this.pollingRepetitionUnit(myNonce), 1000*POLLING_INTERVAL_SECS);
            else
                this.pollingOngoing = false;
            }
        }

    private pollingActions(myNonce : number) : Promise<void>
        {
        let erroredOut : boolean = false;
        let outCount : number = 0;
        return new Promise<void>((resolve : () => any, reject : (e : any) => any) : void =>
            {
            function reportError(e : any) : void
                {
                if (!erroredOut)
                    {
                    erroredOut = true;
                    reject(e);
                    }
                }

            function finish() : void
                {
                if (!erroredOut && !--outCount) resolve();
                }

            const okToNotify = () : boolean =>
                {
                return myNonce == this.pollingNonce && this.isLoggedIn;
                }

            if (this.isLoggedIn)
                {
                if (this.pollAll || this.current.tkm.needsPolling)
                    {
                    outCount++;
                    this.current.tkm.poll(this.current.wm, this.pollAll, okToNotify).then((anyBalanceChange : boolean) : void => finish()).catch(reportError);
                    }
                outCount++;
                this.current.wm.getInfo().then((info : Insight.IGetInfo | null) : void =>
                    {
                    if (!info)
                        {
                        reportError(`Attempt to use wallet before instantiating it.`);
                        return;
                        }
                    if (okToNotify())
                        {
                        if (this.current.wm.balanceSatDelta != BIG_0 || this.current.wm.unconfirmedBalanceSatDelta != BIG_0 || this.current.wm.balanceUSDChanged)
                            for (const onBalanceChange of this.balanceNotifications.values()) onBalanceChange();
                        if (this.pollAll || this.txLogNotifications.size)
                            {
                            this.current.txLog.poll(this.current.wm, info).then((newTxCount : number) : void =>
                                {
                                if (okToNotify() && newTxCount)
                                    for (const onTxLogChange of this.txLogNotifications.values()) onTxLogChange();
                                finish();
                                })
                            .catch(reportError);
                            return;
                            }
                        }
                    finish();
                    })
                .catch(reportError);
                }
            if (!outCount) this.stopPolling();
            });
        }

    private updateCurrentAccount(acnt : Account | null) : void
        {
        if (acnt != this.currentAccount)
            {
            if (acnt)
                {
                if (this.currentAccount) this.current.tkm.transferNotificationsTo(acnt.tkm);
                }
            else if (this.currentAccount)
                this.current.tkm.clearNotifications();
            this.currentAccount = acnt;
            this.saveSelf();
            if (!acnt || (acnt && (!this.passwordHash.length || !acnt.ensureWallet(this.passwordHash))))
                this.triggerLogout();
            else
                this.notifyAccountChanged();
            }
        }

    private triggerLogout() : void
        {
        if (this.passwordHash.length)
            {
            this.passwordHash = "";
            MC.getMC().logout();
            }
        }

    public accountLogout() : void
        {
        this.unloadAllWallets();
        this.passwordHash = "";
        this.notifyAccountChanged();
        }

    private unloadAllWallets() : void
        {
        for (const acnt of this.accountsByName.values()) acnt.unloadWallet();
        }

    public static fromStorageStr(storageStr : string) : AccountManager
        {
        const aman = new AccountManager();
        const storageObj = JSON.parse(storageStr) as AccountManagerStorageObj;
        let someAcnt : Account | null = null;
        for (const aso of storageObj.accountArray)
            {
            someAcnt = Account.fromStorageObj(aso);
            aman.addAccount(someAcnt);
            }
        const curAcnt = aman.accountsByName.get(storageObj.currentAccountName);
        if (curAcnt)
            aman.currentAccount = curAcnt;
        else if (someAcnt)
            aman.currentAccount = someAcnt;
        return aman;
        }

    public toStorageStr() : string
        {
        let storageObj : AccountManagerStorageObj;
        if (this.accountsByName.size)
            {
            const accountStorageArray : AccountStorageObj[] = [ ];
            for (const acnt of this.accountsByName.values()) accountStorageArray.push(acnt.toStorageObj());
            storageObj = { currentAccountName: (this.currentAccount ? this.currentAccount.accountName : ""), accountArray: accountStorageArray };
            }
        else
            storageObj = { currentAccountName: "", accountArray: [ ] };
        return JSON.stringify(storageObj);
        }
    }
