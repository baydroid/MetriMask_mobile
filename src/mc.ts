import '../shimWrapper.js';

import React from "react";
import { BackHandler } from "react-native";
import createKeccakHash from "keccak";
import { setJSExceptionHandler } from 'react-native-exception-handler';
import { randomBytes } from 'react-native-randombytes';
import { validate } from "mrx-address-validation";

import { BrowserAllTabsViewAPI, browserSetInitialUrl, BrowserTabContextBase } from "./rn/BrowserAllTabsView";
import { BrowserTabContext } from "./BrowserTabContext";
import { MRXStorage, SALT_BYTE_LEN } from "./MRXStorage";
import { MainViewAPI, DEFAULT_INACTIVITY_TIMEOUT_MILLIS, WorkFunctionResult } from './rn/MainView';
import { ContractCallParams } from './WalletManager';
import { isMnsName } from './nameUtils';



export const DEFAULT_INITIAL_URL       = "https://www.metrixcoin.com/";
export const MRX_DECIMALS              = 8;
export const SATOSHIS_PER_MRX          = 1e8;
export const DEFAULT_GAS_LIMIT         = 250000;
export const DEFAULT_GAS_PRICE_MRX     = 0.00005000;
export const DEFAULT_GAS_PRICE_SATOSHI = DEFAULT_GAS_PRICE_MRX*SATOSHIS_PER_MRX;
export const BIG_0                     = BigInt(0);



const DEBUG_MODE             = false;
const STORAGE_VERSION_NUMBER = 1;
const CH_0                   = "0".charCodeAt(0);
const CH_9                   = "9".charCodeAt(0);
const CH_a                   = "a".charCodeAt(0);
const CH_f                   = "f".charCodeAt(0);
const CH_A                   = "A".charCodeAt(0);
const CH_F                   = "F".charCodeAt(0);



export enum ADDRESS_SYNTAX
    {
    MRX     = 0,
    EVM     = 1,
    MNS     = 2,
    INVALID = 3
    };



export class MC // MC: Master of Ceremonies -- the place where the different parts of the app can find each other.
    {
    private static theSingleInstance : MC | null = null;
    private static initStarted : boolean = false;
    private static nextUniqueInt : number = 1;

    private store = new MRXStorage();
    private allTabsAPI : BrowserAllTabsViewAPI | null = null;
    private mainViewAPI : MainViewAPI | null = null;

    public static async doAllInitialization() : Promise<MC> // This is the top level call for performing all initialization, it's called in MainView.tsx.
        {
        if (MC.initStarted)
            MC.raiseError(`MC.doAllInitialization() can only be called once.`, 'MC.doAllInitialization()');
        else
            MC.initStarted = true;
        const mc = new MC();
        await mc.init();
        MC.theSingleInstance = mc;
        return MC.theSingleInstance;
        }

    public static getMC() : MC
        {
        return MC.theSingleInstance!;
        }

    public get storage() : MRXStorage
        {
        return this.store;
        }

    private async init() : Promise<void>
        {
        function jsExceptionHandler(e : any, isFatal : boolean) : void
            {
            MC.raiseError(e, "MC.init() jsExceptionHandler()");
            }

        setJSExceptionHandler(jsExceptionHandler, true);
        await this.initStore();
        }

    private async initStore() : Promise<void>
        {
        await this.store.init();
        if (!this.store.salt.length)
            {
            await this.store.setVersion(STORAGE_VERSION_NUMBER);
            const newSalt = await this.makeSalt(SALT_BYTE_LEN);
            await this.store.setSalt(newSalt);
            }
        else if (this.store.version != STORAGE_VERSION_NUMBER)
            MC.raiseError("This version of MetriMask is out of date.", "MC.initStore()");
        }

    private makeSalt(byteLen : number) : Promise<Uint8Array>
        {
        return new Promise<Uint8Array>((resolve : (salt : Uint8Array) => any, reject : (e : any) => any) : void =>
            {
            randomBytes(byteLen, (e : any, b : Buffer) : void =>
                {
                if (e)
                    reject(e);
                else
                    resolve(new Uint8Array(b.buffer))
                });
            });
        }

    public openUrlInNewTab(url : string) : void
        {
        if (this.allTabsAPI)
            this.allTabsAPI.activateTab(new BrowserTabContext(MC.getUniqueInt(), url));
        else
            browserSetInitialUrl(url);
        if (this.mainViewAPI) this.mainViewAPI.goToBrowser();
        }

    public notifyAccountStatus(loggedIn : boolean, name : string, network : string, address : string, balance : number, balanceSat : string, statusChangeReason : string, error : string | null) : void
        {
        this.forEachTab((tab : BrowserTabContext) : void => tab.notifyAccountStatus(loggedIn, name, network, address, balance, balanceSat, statusChangeReason, error));
        }

    public forEachTab(func : (tab : BrowserTabContext) => any) : void
        {
        if (this.allTabsAPI) this.allTabsAPI.forEachTab(func as (tab : BrowserTabContextBase) => any);
        }

    public logout() : void // This is the top level logout method.
        {
        if (this.storage.accountManager.isLoggedIn)
            {
            if (this.mainViewAPI)
                this.mainViewAPI.logout();
            else
                this.storage.accountManager.accountLogout();
            }
        }

    public resetApp() : void
        {
        this.mainViewAPI!.resetApp();
        }

    public askPermissionToSign(requestingURL : string, askingEntitySelfDescription : string, messageToSign : string, onSigningPermittedDecision : (permittedToSign : boolean) => any) : void
        {
        if (this.mainViewAPI)
            this.mainViewAPI.askPermissionToSign(requestingURL, askingEntitySelfDescription, messageToSign, onSigningPermittedDecision);
        else
            setTimeout(() : void => onSigningPermittedDecision(false), 0);
        }

    public askPermissionToSend(requestingURL : string, params : ContractCallParams, onSendingPermittedDecision : (permittedToSend : boolean, amountSat : string, gasLimit : number, gasPriceSat : number) => any) : void
        {
        if (this.mainViewAPI)
            this.mainViewAPI.askPermissionToSend(requestingURL, params, onSendingPermittedDecision);
        else
            setTimeout(() : void => onSendingPermittedDecision(false, "0", 0, 0), 0);
        }

    public showWalletWorking(workFunction : () => WorkFunctionResult, whatWorksGoingOn? : string) : void
        {
        if (this.mainViewAPI) this.mainViewAPI.showWalletWorking(workFunction, whatWorksGoingOn);
        }

    public showWalletWorkingAsync(asyncWorkFunction : (onWorkDone : (result : WorkFunctionResult) => any) => any, whatWorksGoingOn? : string) : void
        {
        if (this.mainViewAPI) this.mainViewAPI.showWalletWorkingAsync(asyncWorkFunction, whatWorksGoingOn);
        }
    
    public restartUserInactivityTimer() : void
        {
        if (this.mainViewAPI) this.mainViewAPI.restartUserInactivityTimer();
        }

    public setUserInactivityTimeoutMillis(timeoutMillis : number) : void
        {
        this.storage.inactivityTimeout = timeoutMillis;
        if (this.mainViewAPI) this.mainViewAPI.setUserInactivityTimeoutMillis(timeoutMillis);
        }

    public getUserInactivityTimeoutMillis(): number
        {
        return this.mainViewAPI ? this.mainViewAPI.getUserInactivityTimeoutMillis() : DEFAULT_INACTIVITY_TIMEOUT_MILLIS;
        }

    public setAllTabsAPI(allTabsAPI : BrowserAllTabsViewAPI) : void
        {
        this.allTabsAPI = allTabsAPI;
        }

    public setMainViewAPI(mainViewAPI : MainViewAPI) : void
        {
        this.mainViewAPI = mainViewAPI;
        }

    public static exitApp() : void
        {
        BackHandler.exitApp();
        }

    public static canonicalizeEvmAddress(address? : string) : string | null
        {
        if (!address) return null;
        return ((address.startsWith(`0x`) || address.startsWith(`0X`)) ? address.substring(2) : address).toLowerCase();
        }

    public static anaylizeAddressSyntax(address : string) : ADDRESS_SYNTAX
        {
        if (MC.validateEvmAddress(address)) return ADDRESS_SYNTAX.EVM;
        if (MC.validateMrxAddress(address)) return ADDRESS_SYNTAX.MRX;
        if (MC.validateMnsName(address)) return ADDRESS_SYNTAX.MNS;
        return ADDRESS_SYNTAX.INVALID;
        }

    public static validateMrxAddress(addr : string) : boolean
        {
        return validate(addr);
        }

    public static validateMnsName(mnsName : string) : boolean
        {
        return isMnsName(mnsName);
        }

    public static validateEvmAddress(addr : string) : boolean
        {
        function checksumIsOK(addr : string) : boolean
            {
            const hash : string = createKeccakHash("keccak256").update(addr.toLowerCase()).digest("hex");
            for (let i = 0; i < addr.length; i++)
                {
                const cc : number = addr.charCodeAt(i);
                if (parseInt(hash[i], 16) >= 8)
                    {
                    if (CH_a <= cc && cc <= CH_f) return false;
                    }
                else
                    {
                    if (CH_A <= cc && cc <= CH_F) return false;
                    }
                }
            return true;
            }

        if (addr.startsWith("0x")) addr = addr.substring(2);
        if (addr.length != 40) return false;
        let upperCaseSeen : boolean = false;
        let lowerCaseSeen : boolean = false;
        for (let i = 0; i < addr.length; i++)
            {
            const cc : number = addr.charCodeAt(i);
            if (CH_A <= cc && cc <= CH_F)
                upperCaseSeen = true;
            else if (CH_a <= cc && cc <= CH_f)
                lowerCaseSeen = true;
            else if (!(CH_0 <= cc && cc <= CH_9))
                return false;
            }
        return upperCaseSeen && lowerCaseSeen ? checksumIsOK(addr) : true;
        }

    public static getUniqueInt() : number
        {
        return MC.nextUniqueInt++;
        }

    public static raiseError(e : any, extraInfo : string) : void
        {
        if (DEBUG_MODE)
            {
            console.log(`*****   START   MC.raiseError() >> ${ extraInfo }`);
            console.log(e);
            console.log(`*****   END   MC.raiseError()`);
            throw e;
            }
        else
            {
            if (MC.theSingleInstance && MC.theSingleInstance.mainViewAPI)
                MC.theSingleInstance.mainViewAPI.emergencyExit(MC.errorToString(e));
            else
                throw e;
            }
        }

    public static errorToString(e : any) : string
        {
        switch (typeof(e))
            {
            case "bigint":    return "Error code " + e.toString();
            case "boolean":   return e ? "true" : "false";
            case "function":  return "Undeterminable error (function)";
            case "number":    return "Error code " + e.toString();
            case "object":    return e.toString ? e.toString() : (e.message ? MC.errorToString(e.message) : "Undeterminable error (object)");
            case "string":    return e;
            case "undefined": return "Undefined error";
            default:          return "Undeterminable error (unknown)";
            }
        }
    }
