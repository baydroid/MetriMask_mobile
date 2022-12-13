import '../shimWrapper.js';

import toBigInteger, { BigInteger } from "big-integer";

import { MC, BIG_0 } from "./mc";
import { WalletManager } from "./WalletManager";



const NO_INFO_STR = "< Not Loaded >";



export class MRC20Manager
    {
    private tkArray : MRC20Token[] = [ ];
    private tkByAddr : Map<string, MRC20Token> = new Map<string, MRC20Token>();
    private notifyingTkCount : number = 0;
    private whenLastUpdated : number = 0;
    private tkListChangeCount : number = 0;
    private notifications : Map<number, () => void> = new Map<number, () => void>();

    public get tokenArray()            : MRC20Token[] { return this.tkArray;                                         }
    public get tokenArrayChangeCount() : number       { return this.tkListChangeCount;                               }
    public get whenUpdated()           : number       { return this.whenLastUpdated;                                 }
    public get needsPolling()          : boolean      { return !!this.notifyingTkCount || !!this.notifications.size; }

    public startNotifications(onAnyTokenBalanceChange : () => any) : number
        {
        const nref = MC.getUniqueInt();
        this.notifications.set(nref, onAnyTokenBalanceChange);
        return nref;
        }

    public stopNotifications(nref : number) : boolean
        {
        return this.notifications.delete(nref);
        }

    public transferNotificationsTo(recipient : MRC20Manager) : void
        {
        for (const ni of this.notifications) recipient.notifications.set(ni[0], ni[1]);
        this.notifications.clear();
        }

    public clearNotifications() : void
        {
        this.notifications.clear();
        }

    public startTokenNotifications(tk : MRC20Token, onBalanceChange : (tk : MRC20Token) => any) : number
        {
        this.notifyingTkCount++;
        return tk.startNotifications(onBalanceChange);
        }

    public stopTokenNotifications(tk : MRC20Token, nref : number) : void
        {
        if (tk.stopNotifications(nref)) this.notifyingTkCount--;
        }

    public issueAllNotifications() : void
        {
        for (const onAnyTokenBalanceChange of this.notifications.values()) onAnyTokenBalanceChange();
        for (const tk of this.tkArray) tk.issueAllNotifications();
        }

    private issueNotifications(okToNotify : () => boolean) : void
        {
        if (okToNotify())
            for (const onAnyTokenBalanceChange of this.notifications.values()) onAnyTokenBalanceChange();
        }

    public createCandidateToken(wm : WalletManager, address : string) : Promise<MRC20Token>
        {
        const existingToken = this.tkByAddr.get(address);
        if (existingToken)
            return new Promise<MRC20Token>((resolve : (token : MRC20Token) => any, reject : (e : any) => any) =>
                {
                setTimeout(() : void => resolve(existingToken), 0);
                });
        else
            return new Promise<MRC20Token>((resolve : (token : MRC20Token) => any, reject : (e : any) => any) =>
                {
                const nt = new MRC20Token(address);
                nt.loadInfo(wm).then(() : void =>
                    {
                    resolve(nt);
                    })
                .catch(reject);
                });
        }

    public addCandidateToken(token : MRC20Token) : void
        {
        const existingToken = this.tkByAddr.get(token.address);
        if (existingToken)
            {
            if (existingToken.updateInfo(token)) this.issueNotifications(() : boolean => true);
            }
        else
            {
            this.tkListChangeCount++;
            this.tkArray.push(token);
            this.tkArray.sort((a : MRC20Token, b : MRC20Token) : number => a.compareTo(b));
            this.tkByAddr.set(token.address, token);
            MC.getMC().storage.accountManager.saveSelf();
            this.issueNotifications(() : boolean => true);
            }
        }

    public findToken(address : string) : MRC20Token | null
        {
        const tk = this.tkByAddr.get(address);
        return tk ? tk : null;
        }

    public removeToken(address : string) : void
        {
        const tk : MRC20Token | undefined = this.tkByAddr.get(address);
        if (tk)
            {
            this.tkByAddr.delete(address);
            this.notifyingTkCount -= tk.notificationCount;
            this.tkListChangeCount++;
            const newTkArray : MRC20Token[] = [ ];
            for (const tk of this.tkArray) if (tk.address != address) newTkArray.push(tk);
            this.tkArray = newTkArray;
            this.issueNotifications(() : boolean => true);
            }
        }

    public poll(wm : WalletManager, pollAll : boolean, okToNotify : () => boolean) : Promise<boolean>
        {
        if (pollAll || this.notifications.size)
            return this.refreshBalances(wm, true, okToNotify);
        else if (this.notifyingTkCount)
            return this.refreshBalances(wm, false, okToNotify);
        else
            return new Promise<boolean>((resolve : (anyBalanceChanged : boolean) => any, reject : (e : any) => any) : void =>
                {
                setTimeout(() : void => resolve(false), 0);
                });
        }

    public refreshAllTokenBalances(wm : WalletManager, okToNotify : () => boolean) : Promise<boolean>
        {
        return this.refreshBalances(wm, true, okToNotify);
        }

    private refreshBalances(wm : WalletManager, pollAll : boolean, okToNotify : () => boolean) : Promise<boolean>
        {
        return new Promise<boolean>((resolve : (anyBalanceChanged : boolean) => any, reject : (e : any) => any) : void =>
            {
            let erroredOut : boolean = false;
            let anyBalanceChanged : boolean = false;
            let outCount = 0;
            for (const tk of this.tkArray)
                {
                if (pollAll || tk.notificationCount)
                    {
                    outCount++;
                    tk.refreshBalance(wm, okToNotify).then((balanceChanged : boolean) : void =>
                        {
                        if (erroredOut) return;
                        if (balanceChanged) anyBalanceChanged = true;
                        if (!--outCount)
                            {
                            if (anyBalanceChanged)
                                {
                                this.issueNotifications(okToNotify);
                                resolve(true);
                                }
                            else
                                resolve(false);
                            }
                        })
                    .catch((e : any) : void =>
                        {
                        erroredOut = true;
                        reject(e);
                        });
                    }
                }
            if (!outCount) setTimeout(() : void => resolve(false), 0);
            });
        }

    public initFromStorageArray(thing : any) : void
        {
        this.tkListChangeCount++;
        const storageArray = thing as SerializableMRC20Token[];
        for (const sobj of storageArray)
            {
            const token = MRC20Token.fromSerializable(sobj);
            this.tkArray.push(token);
            this.tkByAddr.set(token.address, token);
            }
        this.tkArray.sort((a : MRC20Token, b : MRC20Token) : number => a.compareTo(b));
        }

    public toStorageArray() : SerializableMRC20Token[]
        {
        const storageArray : SerializableMRC20Token[] = [ ];
        for (const tk of this.tkArray) storageArray.push(tk.toSerializableObject(false));
        return storageArray;
        }
    }



export type SerializableMRC20Token =
    {
    address     : string;
    name        : string;
    symbol      : string;
    decimals    : number;
    balanceSat? : string;
    }

export class MRC20Token
    {
    private tkAddress : string = "";
    private tkName : string = "";
    private tkSymbol : string = "";
    private tkDecimals : number = -1; // -1 here means we haven't yet called the contract to get the token name, balance, etc.
    private tkBalanceSat : BigInteger = BIG_0;
    private notifications : Map<number, (tk : MRC20Token) => any> = new Map<number, (tk : MRC20Token) => any>();

    public constructor(address : string)
        {
        this.tkAddress = address;
        }

    public static fromSerializable(so : SerializableMRC20Token) : MRC20Token
        {
        const tk = new MRC20Token(so.address);
        tk.updateInfoFromSerializable(so);
        return tk;
        }

    public toSerializableObject(includeBalance : boolean) : SerializableMRC20Token
        {
        const so : SerializableMRC20Token =
            {
            address: this.tkAddress,
            name: this.tkName,
            symbol: this.tkSymbol,
            decimals: this.tkDecimals,
            };
        if (includeBalance) so.balanceSat = this.tkBalanceSat.toString();
        return so;
        }

    public get infoIsValid()       : boolean    { return this.tkDecimals >= 0;    }
    public get address()           : string     { return this.tkAddress;          }
    public get name()              : string     { return this.tkName;             }
    public get symbol()            : string     { return this.tkSymbol;           }
    public get decimals()          : number     { return this.tkDecimals;         }
    public get balanceSat()        : BigInteger { return this.tkBalanceSat;       }
    public get notificationCount() : number     { return this.notifications.size; }

    public compareTo(other : MRC20Token) : number
        {
        if (this.address == other.address) return 0;
        let cmp = this.name.localeCompare(other.name, "en");
        if (cmp != 0) return cmp;
        cmp = this.symbol.localeCompare(other.symbol, "en");
        if (cmp != 0) return cmp;
        return this.address.localeCompare(other.address, "en");
        }

    public startNotifications(onBalanceChange : (tk : MRC20Token) => any) : number
        {
        const nref = MC.getUniqueInt();
        this.notifications.set(nref, onBalanceChange);
        return nref;
        }

    public stopNotifications(nref : number) : boolean
        {
        return this.notifications.delete(nref);
        }

    public issueAllNotifications() : void
        {
        for (const onBalanceChange of this.notifications.values()) onBalanceChange(this);
        }

    private issueNotifications(okToNotify : () => boolean) : void
        {
        if (okToNotify())
            for (const onBalanceChange of this.notifications.values()) onBalanceChange(this);
        }

    public updateInfo(other : MRC20Token) : boolean
        {
        this.tkName = other.tkName;
        this.tkSymbol = other.tkSymbol;
        this.tkDecimals = other.tkDecimals;
        if (other.balanceSat.greaterOrEquals(BIG_0) && !other.balanceSat.equals(this.balanceSat))
            {
            this.tkBalanceSat = other.tkBalanceSat;
            this.issueNotifications(() : boolean => true);
            return true;
            }
        else
            return false;
        }

    private updateInfoFromSerializable(so : SerializableMRC20Token) : boolean
        {
        this.tkName = so.name;
        this.tkSymbol = so.symbol;
        this.tkDecimals = so.decimals;
        if (so.balanceSat)
            {
            const newBalance = toBigInteger(so.balanceSat);
            if (newBalance.greaterOrEquals(BIG_0) && !newBalance.equals(this.tkBalanceSat))
                {
                this.tkBalanceSat = newBalance;
                return true;
                }
            }
        return false;
        }

    public loadInfo(wm : WalletManager) : Promise<boolean>
        {
        return (new Promise<boolean>((resolve : (wasChanged : boolean) => any, reject : (e : string) => any) =>
            {
            wm.getMRC20Info(this.tkAddress).then((so : SerializableMRC20Token) : void =>
                {
                resolve(this.updateInfoFromSerializable(so));
                })
            .catch((e : any) : void =>
                {
                this.tkName = NO_INFO_STR;
                this.tkSymbol = NO_INFO_STR;
                this.tkDecimals = -1;
                this.tkBalanceSat = BIG_0;
                reject(`Failed to load.`);
                });
            }));
        }

    public refreshBalance(wm : WalletManager, okToNotify : () => boolean) : Promise<boolean>
        {
        return new Promise<boolean>((resolve : (wasChanged : boolean) => any, reject : (e : any) => any) =>
            {
            wm.getMRC20Balance(this.tkAddress).then((balanceStr : string) : void =>
                {
                const newBalance = toBigInteger(balanceStr);
                if (!newBalance.equals(this.tkBalanceSat))
                    {
                    this.tkBalanceSat = newBalance;
                    this.issueNotifications(okToNotify);
                    resolve(true);
                    }
                else
                    resolve(false);
                })
            .catch(reject);
            });
        }
    }
