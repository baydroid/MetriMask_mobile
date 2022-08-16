import AsyncStorage from '@react-native-async-storage/async-storage';
import { isEmpty, split } from 'lodash';

import { AccountManager } from "./AccountManager";
import { MC, DEFAULT_INITIAL_URL } from './mc';
import { DEFAULT_INACTIVITY_TIMEOUT_MILLIS } from "./rn/MainView";
import { WebHistoryList, WebFavouritesList } from "./rn/BrowserView";



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

const TYPE_WEB_FAVOURITES : StoredType<WebFavouritesList> =
    {
    toStoredStr: (value : WebFavouritesList) : string =>
        {
        return value.toStorageStr();
        },
    fromStoredStr: (storedStr : string) : WebFavouritesList =>
        {
        return WebFavouritesList.fromStorageStr(storedStr);
        }
    };

const TYPE_WEB_HISTORY : StoredType<WebHistoryList> =
    {
    toStoredStr: (value : WebHistoryList) : string =>
        {
        return value.toStorageStr();
        },
    fromStoredStr: (storedStr : string) : WebHistoryList =>
        {
        return WebHistoryList.fromStorageStr(storedStr);
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
    private inactivityTimeoutItem = new StoredItem<number>           ("inactivityTimeout", TYPE_NUMBER,          DEFAULT_INACTIVITY_TIMEOUT_MILLIS);
    private versionItem           = new StoredItem<number>           ("version",           TYPE_NUMBER,          0                                );
    private saltItem              = new StoredItem<Uint8Array>       ("salt",              TYPE_UINT8ARRAY,      new Uint8Array(0)                );
    private accountManagerItem    = new StoredItem<AccountManager>   ("accountManager",    TYPE_ACCOUNT_MANAGER, new AccountManager()             );
    private browserHomePageItem   = new StoredItem<string>           ("browserHomePage",   TYPE_STRING,          DEFAULT_INITIAL_URL              );
    private browserFavouritesItem = new StoredItem<WebFavouritesList>("browserFaourites",  TYPE_WEB_FAVOURITES,  new WebFavouritesList()          );
    private browserHistoryItem    = new StoredItem<WebHistoryList>   ("browserHistory",    TYPE_WEB_HISTORY,     new WebHistoryList()             );
    private searchEngineIndexItem = new StoredItem<number>           ("seIndex",           TYPE_NUMBER,          0                                );

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
                this.browserHomePageItem.initItem(),
                this.browserFavouritesItem.initItem(),
                this.browserHistoryItem.initItem(),
                this.searchEngineIndexItem.initItem(),
                ])
            .then((empties : void[]) : void =>
                {
                resolve();
                })
            .catch(reject);
            });
        }

    public get inactivityTimeout() : number                                { return this.inactivityTimeoutItem.getValue();      }
    public set inactivityTimeout(value : number)                           { this.inactivityTimeoutItem.setValue(value);        }
    public setInactivityTimeout(value : number) : Promise<void>            { return this.inactivityTimeoutItem.setValue(value); }

    public get version() : number                                          { return this.versionItem.getValue();                }
    public set version(value : number)                                     { this.versionItem.setValue(value);                  }
    public setVersion(value : number) : Promise<void>                      { return this.versionItem.setValue(value);           }
    
    public get salt() : Uint8Array                                         { return this.saltItem.getValue();                   }
    public set salt(value : Uint8Array)                                    { this.saltItem.setValue(value);                     }
    public setSalt(value : Uint8Array) : Promise<void>                     { return this.saltItem.setValue(value);              }

    public get accountManager() : AccountManager                           { return this.accountManagerItem.getValue();         }
    public set accountManager(value : AccountManager)                      { this.accountManagerItem.setValue(value);           }
    public setAccountManager(value : AccountManager) : Promise<void>       { return this.accountManagerItem.setValue(value);    }

    public get browserHomePage() : string                                  { return this.browserHomePageItem.getValue();        }
    public set browserHomePage(value : string)                             { this.browserHomePageItem.setValue(value);          }
    public setBrowserHomePage(value : string) : Promise<void>              { return this.browserHomePageItem.setValue(value);   }

    public get browserFavourites() : WebFavouritesList                     { return this.browserFavouritesItem.getValue();      }
    public set browserFavourites(value : WebFavouritesList)                { this.browserFavouritesItem.setValue(value);        }
    public setBrowserFavourites(value : WebFavouritesList) : Promise<void> { return this.browserFavouritesItem.setValue(value); }

    public get browserHistory() : WebHistoryList                           { return this.browserHistoryItem.getValue();         }
    public set browserHistory(value : WebHistoryList)                      { this.browserHistoryItem.setValue(value);           }
    public setBrowserHistory(value : WebHistoryList) : Promise<void>       { return this.browserHistoryItem.setValue(value);    }

    public get searchEngineIndex() : number                                { return this.searchEngineIndexItem.getValue();      }
    public set searchEngineIndex(value : number)                           { this.searchEngineIndexItem.setValue(value);        }
    public setSearchEngineIndex(value : number) : Promise<void>            { return this.searchEngineIndexItem.setValue(value); }
    }
