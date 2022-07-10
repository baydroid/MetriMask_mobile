import AsyncStorage from '@react-native-async-storage/async-storage';
import { isEmpty, split } from 'lodash';

import { AccountManager } from "./AccountManager";
import { MC } from './mc';
import { DEFAULT_INACTIVITY_TIMEOUT_MILLIS } from "./rn/MainView";



export const SALT_BYTE_LEN = 32;



type StoredType<ValueType> =
    {
    toStoredStr   : (value : ValueType) => string;
    fromStoredStr : (storedStr : string) => ValueType;
    };

const TYPE_STRING : StoredType<string> =
    {
    toStoredStr: (value : string) : string =>
        {
        return value;
        },
    fromStoredStr: (storedStr : string) : string =>
        {
        return storedStr;
        }
    };

const TYPE_NUMBER : StoredType<number> =
    {
    toStoredStr: (value : number) : string =>
        {
        return value.toString();
        },
    fromStoredStr: (storedStr : string) : number =>
        {
        return Number.parseFloat(storedStr);
        }
    };

const TYPE_ACCOUNT_MANAGER : StoredType<AccountManager> =
    {
    toStoredStr: (value : AccountManager) : string =>
        {
        return value.toStorageStr();
        },
    fromStoredStr: (storedStr : string) : AccountManager =>
        {
        return AccountManager.fromStorageStr(storedStr);
        }
    };

const TYPE_UINT8ARRAY : StoredType<Uint8Array> =
    {
    toStoredStr: (value : Uint8Array) : string =>
        {
        return (isEmpty(value) || !value.length) ? "" : value.toString();
        },
    fromStoredStr: (storedStr : string) : Uint8Array =>
        {
        const array = split(storedStr, ",").map((str) => parseInt(str, 10));
        return Uint8Array.from(array);
        }
    };



class StoredItem<ValueType>
    {
    private storageKey : string;
    private itemType : StoredType<ValueType>;
    private nullValue : ValueType;
    private currentValue : ValueType;
    private isInitialized : boolean = false;

    public constructor (storageKey : string, itemType : StoredType<ValueType>, nullValue : ValueType)
        {
        this.storageKey = storageKey;
        this.itemType = itemType;
        this.nullValue = this.currentValue = nullValue;
        }

    public initItem() : Promise<void>
        {

        return new Promise<void>((resolve : () => any, reject : (e : any) => any) : void =>
            {
            if (!this.isInitialized)
                {
                AsyncStorage.getItem(this.storageKey).then((rawStoredStr : string | null) : void =>
                    {
                    const storedStr : string = rawStoredStr ? rawStoredStr : "";
                    this.currentValue = !isEmpty(storedStr) ? this.itemType.fromStoredStr(storedStr!) : this.nullValue;
                    this.isInitialized = true;
                    resolve();
                    })
                .catch(reject);
                }
            else
                setTimeout(resolve, 0);
            });
        }

    public getValue() : ValueType
        {
        if (!this.isInitialized) MC.raiseError(`StoredItem ${ this.storageKey } is being read before it's been initialized.`, "MRXStorage getValue()");
        return this.currentValue;
        }

    public setValue(value : ValueType) : Promise<void>
        {
        if (!this.isInitialized) MC.raiseError(`StoredItem ${ this.storageKey } is being written before it's been initialized.`, "MRXStorage setValue()");
        this.currentValue = value;
        if (isEmpty(value) && typeof value != "number")
            return AsyncStorage.setItem(this.storageKey, "");
        else
            {
            const storedStr = this.itemType.toStoredStr(value);
            if (isEmpty(storedStr))
                return AsyncStorage.setItem(this.storageKey, "");
            else
                return AsyncStorage.setItem(this.storageKey, storedStr);
            }
        }
    }



export class MRXStorage
    {
    private inactivityTimeoutItem = new StoredItem<number>        ("inactivityTimeout", TYPE_NUMBER,          DEFAULT_INACTIVITY_TIMEOUT_MILLIS);
    private versionItem           = new StoredItem<number>        ("version",           TYPE_NUMBER,          0                                );
    private saltItem              = new StoredItem<Uint8Array>    ("salt",              TYPE_UINT8ARRAY,      new Uint8Array(0)                );
    private accountManagerItem    = new StoredItem<AccountManager>("accountManager",    TYPE_ACCOUNT_MANAGER, new AccountManager()             );

    public init() : Promise<void>
        {
        return new Promise<void>((resolve : () => any, reject : (e : any) => any) =>
            {
            Promise.all(
                [
                this.inactivityTimeoutItem.initItem(),
                this.versionItem.initItem(),
                this.saltItem.initItem(),
                this.accountManagerItem.initItem(),
                ])
            .then((empties : void[]) : void =>
                {
                resolve();
                })
            .catch(reject);
            });
        }

    public get inactivityTimeout() : number                          { return this.inactivityTimeoutItem.getValue();      }
    public set inactivityTimeout(value : number)                     { this.inactivityTimeoutItem.setValue(value);        }
    public setInactivityTimeout(value : number) : Promise<void>      { return this.inactivityTimeoutItem.setValue(value); }

    public get version() : number                                    { return this.versionItem.getValue();                }
    public set version(value : number)                               { this.versionItem.setValue(value);                  }
    public setVersion(value : number) : Promise<void>                { return this.versionItem.setValue(value);           }
    
    public get salt() : Uint8Array                                   { return this.saltItem.getValue();                   }
    public set salt(value : Uint8Array)                              { this.saltItem.setValue(value);                     }
    public setSalt(value : Uint8Array) : Promise<void>               { return this.saltItem.setValue(value);              }

    public get accountManager() : AccountManager                     { return this.accountManagerItem.getValue();         }
    public set accountManager(value : AccountManager)                { this.accountManagerItem.setValue(value);           }
    public setAccountManager(value : AccountManager) : Promise<void> { return this.accountManagerItem.setValue(value);    }
    }
