import '../shimWrapper.js';

import toBigInteger, { BigInteger } from "big-integer";
import { Insight } from "metrixjs-wallet";

import { WalletManager } from "./WalletManager";
import { MC, BIG_0 } from "./mc";



//{"blockhash": "7422f9e840870cdbb2b56050a32eeb59f59da981ed19b5f404141c1658cee66e", "blockheight": 556335, "confirmations": 8105, "fees": 0, "isqrc20Transfer": false, "locktime": 0, "receipt": [], "time": 1650365344, "txid": "acde3dd0ef24dcbcfaf86455796f5bab82d2cd75660683e8ad3c895d3015e97f", "valueIn": "80684667708770", "valueOut": "80840847502266", "version": 2, "vin": [{"addr": "mMzmQvS85QGCY2ebiARauDpDSm6UySoQhL", "txid": "17eb894b269677c5f853e0b77bd9a9b6288dd8aec30bfda9992889b37ff05a72"}], "vout": [{"scriptPubKey": [Object], "value": "0"}, {"scriptPubKey": [Object], "value": "80787253735969"}, {"scriptPubKey": [Object], "value": "0"}, {"scriptPubKey": [Object], "value": "52454536297"}, {"scriptPubKey": [Object], "value": "1139230000"}]}
//[{"addr": "mMzmQvS85QGCY2ebiARauDpDSm6UySoQhL", "txid": "17eb894b269677c5f853e0b77bd9a9b6288dd8aec30bfda9992889b37ff05a72"}]
//[{"scriptPubKey": {"addresses": undefined}, "value": "0"}, {"scriptPubKey": {"addresses": "mMzmQvS85QGCY2ebiARauDpDSm6UySoQhL"}, "value": "80787253735969"}, {"scriptPubKey": {"addresses": "0000000000000000000000000000000000000089"}, "value": "0"}, {"scriptPubKey": {"addresses": "0000000000000000000000000000000000000090"}, "value": "52454536297"}, {"scriptPubKey": {"addresses": "mYbETUoAf4ZZZJoNKfL9K8T8mcUo52mDNB"}, "value": "1139230000"}]



const DEFAULT_MAX_LOG_LENGTH = 256;
const WALLET_PAGE_SIZE       =  10;
const DEFAULT_TXS_PER_EXTEND =   4;



export class TransactionLog
    {
    private txArray : TransactionInfo[] = [ ];
    private txMap : Map<string, TransactionInfo> = new Map<string, TransactionInfo>();
    private maxLogLength : number = DEFAULT_MAX_LOG_LENGTH;
    private whenLastUpdated : number = 0;
    private lastTxCount : number = 0;
    private lastUnconfirmedTxCount : number = 0;
    private atEndOfTxReads : boolean = false;

    public constructor(maxLogLength : number = DEFAULT_MAX_LOG_LENGTH)
        {
        this.maxLogLength = maxLogLength;
        }

    public get log() : TransactionInfo[]   { return this.txArray;                                                    }
    public get whenUpdated() : number      { return this.whenLastUpdated;                                            }
    public get canLoadMoreTxs() : boolean  { return !this.atEndOfTxReads && this.txArray.length < this.maxLogLength; }

    public clearLog() : void
        {
        this.txArray = [ ];
        this.txMap.clear();
        this.whenLastUpdated = 0;
        this.lastTxCount = 0;
        this.lastUnconfirmedTxCount = 0;
        this.atEndOfTxReads = false;
        }

    public poll(wm : WalletManager, info : Insight.IGetInfo, minExtensionSize : number = DEFAULT_TXS_PER_EXTEND) : Promise<number>
        {
        return new Promise<number>((resolve : (newTxCount : number) => any, reject : (e : any) => any) : void =>
            {
            if (!this.txArray.length)
                {
                this.extendGivenInfo(wm, info, minExtensionSize).then((moreTxsAvailable : boolean) : void =>
                    {
                    resolve(this.txArray.length);
                    })
                .catch(reject);
                }
            else
                {
                this.addNewest(wm, info).then((newTxCount : number) : void =>
                    {
                    resolve(newTxCount);
                    })
                .catch(reject);
                }
            });
        }

    public extend(wm : WalletManager, minExtensionSize : number = DEFAULT_TXS_PER_EXTEND) : Promise<boolean>
        {
        return new Promise<boolean>((resolve : (canLoadMoreTxs : boolean) => any, reject : (e : any) => any) : void =>
            {
            wm.wallet.getInfo().then((info : Insight.IGetInfo) : void =>
                {
                this.extendGivenInfo(wm, info, minExtensionSize).then((moreTxsAvailable : boolean) : void =>
                    {
                    resolve(moreTxsAvailable);
                    })
                .catch(reject);
                })
            .catch(reject);
            });
        }

    private extendGivenInfo(wm : WalletManager, info : Insight.IGetInfo, minExtensionSize : number = DEFAULT_TXS_PER_EXTEND) : Promise<boolean>
        {
        return new Promise<boolean>((resolve : (moreTxsAvailable : boolean) => any, reject : (e : any) => any) : void =>
            {
            const addNewest = () : void =>
                {
                this.addNewest(wm, info).then((newTxCount : number) : void =>
                    {
                    resolve(this.canLoadMoreTxs);
                    })
                .catch(reject);
                }

            if (!this.txArray.length)
                {
                this.addOlder(wm, minExtensionSize).then((moreTxsAvailable : boolean) : void =>
                    {
                    resolve(moreTxsAvailable);
                    })
                .catch(reject);
                }
            else if (!this.atEndOfTxReads && this.txArray.length < this.maxLogLength)
                {
                this.addOlder(wm, minExtensionSize).then((moreTxsAvailable : boolean) : void =>
                    {
                    addNewest();
                    })
                .catch(reject);
                }
            else
                addNewest();
            });
        }

    private addOlder(wm : WalletManager, minExtensionSize : number) : Promise<boolean>
        {
        const newTxs : TransactionInfo[] = [ ];
        const newTxsSet : Set<string> = new Set<string>();
        let pageNum : number = Math.floor(this.txArray.length/WALLET_PAGE_SIZE);
        if (pageNum > 0 && pageNum*WALLET_PAGE_SIZE >= this.txArray.length) pageNum--;
        let moveForwards : boolean = pageNum == 0;
        return new Promise<boolean>((resolve : (moreTxsAvailable : boolean) => any, reject : (e : any) => any) : void =>
            {
            const get1Page = () : void =>
                {
                wm.getTransactions(pageNum).then((rtxs : Insight.IRawTransactions) : void =>
                    {
                    for (const rti of rtxs.txs)
                        {
                        if (this.txMap.has(rti.txid))
                            moveForwards = true;
                        else if (!newTxsSet.has(rti.txid) && rti.time && rti.time > 0)
                            {
                            newTxsSet.add(rti.txid);
                            newTxs.push(new TransactionInfo(rti, wm.address));
                            }
                        }
                    if (pageNum + 1 >= rtxs.pagesTotal) this.atEndOfTxReads = true;
                    const atEnd : boolean = this.atEndOfTxReads || this.txArray.length >= this.maxLogLength;
                    if (atEnd || newTxs.length >= minExtensionSize)
                        {
                        newTxs.sort((a : TransactionInfo, b : TransactionInfo) : number => a.compareTo(b));
                        this.txArray = this.txArray.concat(newTxs);
                        for (const ti of newTxs) this.txMap.set(ti.id, ti);
                        resolve(atEnd);
                        }
                    else
                        {
                        if (moveForwards) pageNum++; else pageNum--;
                        if (pageNum == 0) moveForwards = true;
                        get1Page();
                        }
                    })
                .catch((e : any) : void =>
                    {
                    if (this.isStatus500Error(e))
                        resolve(this.atEndOfTxReads || this.txArray.length >= this.maxLogLength);
                    else
                        reject(e);
                    });
                }
            
            if (this.atEndOfTxReads || this.txArray.length >= this.maxLogLength)
                setTimeout(() : void => resolve(true), 0);
            else
                get1Page();
            });
        }

    private addNewest(wm : WalletManager, info : Insight.IGetInfo) : Promise<number>
        {
        this.whenLastUpdated = Date.now();
        let pageNum : number = 0;
        const newTxs : TransactionInfo[] = [ ];
        const newTxsSet : Set<string> = new Set<string>();
        let ignoredCount : number = 0;
        return new Promise<number>((resolve : (newTxCount : number) => any, reject : (e : any) => any) : void =>
            {
            const get1Page = () : void =>
                {
                wm.getTransactions(pageNum).then((rtxs : Insight.IRawTransactions) : void =>
                    {
                    for (const rti of rtxs.txs)
                        {
                        if (!this.txMap.has(rti.txid))
                            {
                            if (!newTxsSet.has(rti.txid))
                                {
                                if (rti.time && rti.time > 0)
                                    {
                                    newTxsSet.add(rti.txid);
                                    newTxs.push(new TransactionInfo(rti, wm.address));
                                    }
                                else
                                    ignoredCount++;
                                }
                            }
                        else
                            {
                            newTxs.sort((a : TransactionInfo, b : TransactionInfo) : number => a.compareTo(b));
                            this.txArray = newTxs.concat(this.txArray);
                            for (const ti of newTxs) this.txMap.set(ti.id, ti);
                            this.lastTxCount = info.txApperances - ignoredCount;
                            this.lastUnconfirmedTxCount = info.unconfirmedTxApperances;
                            resolve(newTxs.length);
                            return;
                            }
                        }
                    pageNum++;
                    get1Page();
                    })
                .catch((e : any) : void =>
                    {
                    if (this.isStatus500Error(e))
                        resolve(0);
                    else
                        reject(e);
                    });
                }

            if (this.lastTxCount != info.txApperances || this.lastUnconfirmedTxCount != info.unconfirmedTxApperances)
                get1Page();
            else
                setTimeout(() : void => resolve(0), 0);
            });
        }

    private isStatus500Error(e : any) : boolean
        {
        const str = MC.errorToString(e);
        return str.includes("code 500");
        }
    }



export class TransactionInfo
    {
    private txId : string;
    private txConfirmations : number;
    private txBlockheight : number;
    private txValueSat : BigInteger;
    private txEpochTime : number;
    private txDateTimeStr : string;

    public constructor(rti : Insight.IRawTransactionInfo, ownAddr : string)
        {
        this.txId = rti.txid;
        this.txConfirmations = rti.confirmations;
        this.txBlockheight = rti.blockheight;
        this.txValueSat = this.extractValue(rti, ownAddr);
        this.txEpochTime = rti.time;
        const when = new Date(1000*rti.time);
        this.txDateTimeStr = when.toLocaleDateString() + " " + when.toLocaleTimeString(undefined, { hour12: false });
        }

    private extractValue(rti : Insight.IRawTransactionInfo, ownAddr : string) : BigInteger
        {
        function vinContainsAddr(vin : Insight.IVin[], address : string) : boolean
            {
            for (const v of vin) if (v.addr == address) return true;
            return false;
            }

        function voutContainsAddr(vout : Insight.IVout, address : string) : boolean
            {
            if (!vout.scriptPubKey.addresses) return false;
            if (typeof vout.scriptPubKey.addresses === "string") return vout.scriptPubKey.addresses == address;
            for (const a of vout.scriptPubKey.addresses) if (a == address) return true;
            return false;
            }

        let value : BigInteger = BIG_0;
        if (vinContainsAddr(rti.vin, ownAddr))
            {
            for (const vout of rti.vout) if (!voutContainsAddr(vout, ownAddr)) value = value.add(toBigInteger(vout.value));
            value = value.negate();
            }
        else
            {
            for (const vout of rti.vout) if (voutContainsAddr(vout, ownAddr)) value = value.add(toBigInteger(vout.value));
            }
        return value;
        }

    public compareTo(other : TransactionInfo) : number
        {
        const txidComp : number = this.id.localeCompare(other.id, "en");
        if (!txidComp)
            return 0;
        else if (this.blockheight != other.blockheight)
            return other.blockheight - this.blockheight;
        else if (this.epochTime != other.epochTime)
            return other.epochTime - this.epochTime;
        else
            return txidComp;
        }

    public get id()            : string     { return this.txId;           }
    public get confirmations() : number     { return this.txConfirmations }
    public get blockheight()   : number     { return this.txBlockheight;  }
    public get valueSat()      : BigInteger { return this.txValueSat;     }
    public get epochTime()     : number     { return this.txEpochTime;    }
    public get dateTimeStr()   : string     { return this.txDateTimeStr;  }
    }
