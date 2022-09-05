import { Insight } from "metrixjs-wallet";

import { BrowserTabContextBase } from "./rn/BrowserAllTabsView";
import { ContractCallParams, RPC_METHOD } from "./WalletManager";
import { ADDRESS_SYNTAX, DEFAULT_GAS_LIMIT, DEFAULT_GAS_PRICE_SATOSHI, MC, SATOSHIS_PER_MRX } from "./mc";
import { AccountManager } from "./AccountManager";



const NOT_LOGGED_IN_ERROR      = "Not logged in. Please log in to MetriMask first.";
const USER_SAID_NO_ERROR       = "The user refused permission.";
const MNS_UNRESOLVABLE_ERROR   = "Unresolvable MNS name.";

const METRIMASK_CONNECT        = "CONNECT";
const METRIMASK_RAW_CALL       = "RAW_CALL";
const METRIMASK_SIGN_MESSAGE   = "SIGN_MESSAGE";
const METRIMASK_VERIFY_MESSAGE = "VERIFY_MESSAGE";

export enum NOTIFICATION_REASONS
    {
    LOGIN           = "Account Logged In",
    LOGOUT          = "Account Logged Out",
    BALANCE_CHANGE  = "MRX Account Balance Changed",
    DAPP_CONNECTION = "Account Connected to Dapp"
    };



const INITIAL_JS =
`window.addEventListener("message", (event) =>
    {
    if (event.data && event.data.message && event.data.message.type && event.data.message.type == "CONNECT_METRIMASK")
        window.ReactNativeWebView.postMessage(JSON.stringify({ msgHandlerName: "${ METRIMASK_CONNECT }", msgOrigin: event.origin }));
    },
    false);
true;`;

const CREATE_API_JS =
`(idPrefix, loggedIn, name, network, address, balance, balanceSat) =>
    {
    let nextPendingId = 1;
    const pendingReturns = [ ];

    function pendReturn(resolve, reject)
        {
        const id = idPrefix + "." + (nextPendingId++).toString();
        pendingReturns[id] = { resolve, reject };
        return id;
        }

    let rpcProvider = { };
    rpcProvider.rawCall       = (method, args)  => { return new Promise((resolve, reject) => { window.ReactNativeWebView.postMessage(JSON.stringify({ returnId: pendReturn(resolve, reject), msgHandlerName: "${ METRIMASK_RAW_CALL       }", method: method, args: args })); }); };
    rpcProvider.signMessage   = (args)          => { return new Promise((resolve, reject) => { window.ReactNativeWebView.postMessage(JSON.stringify({ returnId: pendReturn(resolve, reject), msgHandlerName: "${ METRIMASK_SIGN_MESSAGE   }", args: args                 })); }); };
    rpcProvider.verifyMessage = (args)          => { return new Promise((resolve, reject) => { window.ReactNativeWebView.postMessage(JSON.stringify({ returnId: pendReturn(resolve, reject), msgHandlerName: "${ METRIMASK_VERIFY_MESSAGE }", args: args                 })); }); };
    rpcProvider.processReturn = (returnInfoStr) =>
        {
        let returnInfo;
        try { returnInfo = JSON.parse(returnInfoStr); } catch (e) { return; };
        if (typeof returnInfo !== "object" || typeof returnInfo.returnId !== "string") return;
        const completionMethods = pendingReturns[returnInfo.returnId];
        if (!completionMethods) return;
        delete pendingReturns[returnInfo.returnId];
        if (returnInfo.result)
            {
            const payload = { type: "EXTERNAL_RPC_CALL_RETURN", id: returnInfo.returnId, result: returnInfo.result };
            const message = { type: "RPC_RESPONSE", payload: payload };
            window.postMessage({ target:"metrimask-inpage", message: message }, "*");
            completionMethods.resolve(returnInfo.result);
            }
        else
            {
            if (!returnInfo.error) returnInfo.error = "Unknown Error.";
            const payload = { id: returnInfo.returnId, error: returnInfo.error.toString() };
            const message = { type: "RPC_RESPONSE", payload: payload };
            window.postMessage({ target:"metrimask-inpage", message: message }, "*");
            completionMethods.reject(returnInfo.error);
            }
        }
    window.metrimask = { rpcProvider: rpcProvider, account: { loggedIn, name, network, address, balance, balanceSat } };
    }`;

const PROCESS_RETURN_JS =
`(returnInfoStr) =>
    {
    if (window.metrimask) window.metrimask.rpcProvider.processReturn(returnInfoStr);
    }`;

const NOTIFY_JS =
`(loggedIn, name, network, address, balance, balanceSat, error, statusChangeReason) =>
    {
    const account = { loggedIn, name, network, address, balance, balanceSat };
    if (window.metrimask) window.metrimask.account = account;
    const payload = { account, error, statusChangeReason };
    const message = { type: "METRIMASK_ACCOUNT_CHANGED", payload: payload };
    window.postMessage({ target:"metrimask-inpage", message: message }, "*");
    }`;



type HTMLMessage =
    {
    returnId       : string;
    msgHandlerName : string;
    method?        : string;
    args           : any[];
    }

export class BrowserTabContext extends BrowserTabContextBase
    {
    private mc : MC = MC.getMC();
    private am : AccountManager = MC.getMC().storage.accountManager;
    private htmlMessageHandlersByName : Map<string, (message : HTMLMessage) => any> = new Map<string, (message : HTMLMessage) => any>();
    private metrixLoaded : boolean = false;
    private accountNotificationRef : number= 0; // 0 here marks notifications turned off
    private balanceNotificationRef : number= 0;
    private lastNotifyLoggedIn : boolean = false;
    private lastNotifyName : string = "";
    private lastNotifyNetwork : string = "";
    private lastNotifyAddress : string = "";
    private lastNotifyBalance : number = -1;
    private lastNotifyBalanceSat : string = "-100000000";
    private lastNotifyStatusChangeReason : string = "";
    private lastNotifyError : string | null = null;

    public constructor(id : number, initialUrl : string = "")
        {
        super(id, initialUrl, null, INITIAL_JS);
        this.htmlMessageHandlersByName.set(METRIMASK_CONNECT,        (message : HTMLMessage) : void => this.onHtml_CONNECT(message)        );
        this.htmlMessageHandlersByName.set(METRIMASK_RAW_CALL,       (message : HTMLMessage) : void => this.onHtml_RAW_CALL(message)       );
        this.htmlMessageHandlersByName.set(METRIMASK_SIGN_MESSAGE,   (message : HTMLMessage) : void => this.onHtml_SIGN_MESSAGE(message)   );
        this.htmlMessageHandlersByName.set(METRIMASK_VERIFY_MESSAGE, (message : HTMLMessage) : void => this.onHtml_VERIFY_MESSAGE(message) );
        }

    public onMessageFromHtml(message : string) : void
        {
        let msgObject : HTMLMessage;
        try
            {
            msgObject = JSON.parse(message);
            }
        catch (e)
            {
            MC.raiseError(`Invalid JSON in message from HTML: ${ message }`, `BrowserTabContext.onMessageFromHtml()`);
            return;
            }
        if (typeof msgObject !== "object" || typeof msgObject.msgHandlerName !== "string")
            {
            MC.raiseError(`Bad syntax in message from HTML: ${ message }`, `BrowserTabContext.onMessageFromHtml()`);
            return;
            }
        const handler = this.htmlMessageHandlersByName.get(msgObject.msgHandlerName);
        if (handler)
            handler(msgObject);
        else
            MC.raiseError(`Unknown msgHandlerName in message from HTML: ${ msgObject.msgHandlerName }`, `BrowserTabContext.onMessageFromHtml()`);
        }

    private onHtml_CONNECT(message : HTMLMessage) : void
        {
        const am = this.am;
        if (am.isLoggedIn)
            {
            am.current.wm.wallet.getInfo().then((info : Insight.IGetInfo | null) : void =>
                {
                let params : string;
                let notify : () => void = () : void => { };
                if (am.isLoggedIn)
                    {
                    if (info)
                        {
                        let balanceSatStr = info.balanceSat.toString();
                        let balance = Number.parseFloat(balanceSatStr)/SATOSHIS_PER_MRX;
                        if (balance < 0)
                            {
                            balance = 0;
                            balanceSatStr = "";
                            }
                        params = `"${ this.tabKey }", true, ${ JSON.stringify(am.current.accountName) }, "${ am.current.wm.ninfo.name }", "${ info.addrStr }", ${ balance }, "${ balanceSatStr }"`;
                        notify = () : void => { this.notifyAccountStatus(true, am.current.accountName, am.current.wm.ninfo.name, info.addrStr, balance, balanceSatStr, NOTIFICATION_REASONS.DAPP_CONNECTION, null); };
                        }
                    else
                        {
                        params = `"${ this.tabKey }", true, ${ JSON.stringify(am.current.accountName) }, "${ am.current.wm.ninfo.name }", "", 0, "0"`;
                        notify = () : void => { this.notifyAccountStatus(true, am.current.accountName, am.current.wm.ninfo.name, "", 0, "0", NOTIFICATION_REASONS.DAPP_CONNECTION, "Wallet not available."); };
                        }
                    }
                else
                    {
                    params = `"${ this.tabKey }", false, "", "", "", 0, "0"`;
                    notify = () : void => { this.notifyAccountStatus(false, "", "", "", 0, "0", NOTIFICATION_REASONS.DAPP_CONNECTION, null); };
                    }
                const js = `(${ CREATE_API_JS })(${ params }); true;`;
                this.executeJavaScript(js);
                this.setMetrixLoadState(true);
                notify();
                })
            .catch((e : any) : void =>
                {
                let params : string;
                let notify : () => void = () : void => { };
                if (am.isLoggedIn)
                    {
                    params = `"${ this.tabKey }", true, ${ JSON.stringify(am.current.accountName) }, "${ am.current.wm.ninfo.name }", "", 0, "0"`;
                    notify = () : void => { this.notifyAccountStatus(true, am.current.accountName, am.current.wm.ninfo.name, "", 0, "0", NOTIFICATION_REASONS.DAPP_CONNECTION, "Unable to contact network."); };
                    }
                else
                    {
                    params = `"${ this.tabKey }", false, "", "", "", 0, "0"`;
                    notify = () : void => { this.notifyAccountStatus(false, "", "", "", 0, "0", NOTIFICATION_REASONS.DAPP_CONNECTION, "Unable to contact network."); };
                    }
                const js = `(${ CREATE_API_JS })(${ params }); true;`;
                this.executeJavaScript(js);
                this.setMetrixLoadState(true);
                notify();
                });
            }
        else
            {
            const params = `"${ this.tabKey }", false, "", "", "", 0, "0"`;
            const js = `(${ CREATE_API_JS })(${ params }); true;`;
            this.executeJavaScript(js);
            this.setMetrixLoadState(true);
            this.notifyAccountStatus(false, "", "", "", 0, "0", NOTIFICATION_REASONS.DAPP_CONNECTION, null);
            }
        }

    private setMetrixLoadState(metrixLoaded : boolean) : void
        {
        if (metrixLoaded != this.metrixLoaded)
            {
            if (metrixLoaded)
                {
                this.metrixLoaded = true;
                this.startNotifications();
                }
            else
                {
                this.stopNotifications();
                this.metrixLoaded = false;
                this.lastNotifyLoggedIn = false;
                this.lastNotifyName = "";
                this.lastNotifyNetwork = "";
                this.lastNotifyAddress = "";
                this.lastNotifyBalance = -1;
                this.lastNotifyBalanceSat = "";
                this.lastNotifyStatusChangeReason = "";
                this.lastNotifyError = null;
                }
            }
        }

    private startNotifications() : void
        {
        if (!this.accountNotificationRef)
            {
            const am : AccountManager = this.am;
            this.accountNotificationRef = am.startAccountNotifications(() : void => this.onAccountChanged());
            this.balanceNotificationRef = am.startBalanceNotifications(() : void => this.onBalanceChanged());
            }
        }

    private stopNotifications() : void
        {
        if (this.accountNotificationRef)
            {
            const am : AccountManager = this.am;
            am.stopAccountNotifications(this.accountNotificationRef);
            am.stopBalanceNotifications(this.balanceNotificationRef);
            this.accountNotificationRef = 0;
            }
        }

    private onAccountChanged() : void
        {
        this.notify(this.am.isLoggedIn ? NOTIFICATION_REASONS.LOGIN : NOTIFICATION_REASONS.LOGOUT);
        }

    private onBalanceChanged() : void
        {
        this.notify(NOTIFICATION_REASONS.BALANCE_CHANGE);
        }

    private notify(reason : NOTIFICATION_REASONS) : void
        {
        const am = this.am;
        if (am.isLoggedIn)
            {
            const balanceSatStr : string = am.current.wm.balanceSat.toString();
            this.notifyAccountStatus(true, am.current.accountName, am.current.wm.ninfo.name, am.current.wm.address, Number.parseFloat(balanceSatStr)/SATOSHIS_PER_MRX, balanceSatStr, reason, null);
            }
        else
            this.notifyAccountStatus(false, "", "", "", 0, "0", reason, null);
        }

    private onHtml_RAW_CALL(message : HTMLMessage) : void
        {
        if (!this.loginCheck(message.returnId)) return;
        if (message.method == RPC_METHOD.SEND_TO_CONTRACT)
            this.sendToContract(message);
        else if (message.method == RPC_METHOD.CALL_CONTRACT)
            this.resolveAndCallContract(message);
        else
            this.processReturn(message.returnId, null, "Unknown method parameter.");
        }

    private sendToContract(message : HTMLMessage) : void
        {
        const newArgs : any[] = Array(6);
        newArgs[0] = message.args[0];
        newArgs[1] = message.args[1];
        newArgs[2] = message.args[2] || 0;
        newArgs[3] = message.args[3] || DEFAULT_GAS_LIMIT;
        newArgs[4] = message.args[4] || DEFAULT_GAS_PRICE_SATOSHI;
        newArgs[5] = this.am.current.wm.address;
        message.args = newArgs;
        this.mc.askPermissionToSend(this.currentUrl, message as ContractCallParams, (permittedToSend : boolean, amountSat : string, gasLimit : number, gasPrice : number) : void =>
            {
            if (permittedToSend)
                {
                message.args[2] = parseInt(amountSat)/SATOSHIS_PER_MRX;
                message.args[3] = gasLimit;
                message.args[4] = gasPrice/SATOSHIS_PER_MRX;
                this.resolveAndCallContract(message);
                }
            else
                this.processReturn(message.returnId, null, USER_SAID_NO_ERROR);
            });
        }

    private resolveAndCallContract(message : HTMLMessage) : void
        {
        const syntax : ADDRESS_SYNTAX = MC.anaylizeAddressSyntax(message.args[0]);
        if (syntax == ADDRESS_SYNTAX.MNS)
            {
            this.am.current.wm.ninfo.mnsResolveEvm(message.args[0]).then((evmAddress : string) : void =>
                {
                if (evmAddress)
                    {
                    message.args[0] = evmAddress;
                    this.callContract(message);
                    }
                else
                    this.processReturn(message.returnId, null, MNS_UNRESOLVABLE_ERROR);
                })
            .catch((e : any) : any =>
                {
                this.processReturn(message.returnId, null, MC.errorToString(e));
                });
            }
        else
            this.callContract(message);
        }

    private callContract(message : HTMLMessage) : void
        {
        this.am.current.wm.weblibRawCall(message as ContractCallParams).then((result : Insight.IContractCall | Insight.ISendRawTxResult) : any =>
            {
            this.processReturn(message.returnId, result, null);
            })
        .catch((e : any) : any =>
            {
            this.processReturn(message.returnId, null, MC.errorToString(e));
            });
        }

    private onHtml_SIGN_MESSAGE(message : HTMLMessage) : void
        {
        if (!this.loginCheck(message.returnId)) return;
        this.mc.askPermissionToSign(this.currentUrl, message.args[0], message.args[1], (permittedToSign : boolean) : void =>
            {
            if (!permittedToSign)
                this.processReturn(message.returnId, null, USER_SAID_NO_ERROR);
            else
                {
                const result = this.am.current.wm.weblibSign(message.args);
                if (result.signedMsgBase64)
                    this.processReturn(message.returnId, result.signedMsgBase64, null);
                else if (result.error)
                    this.processReturn(message.returnId, null, result.error);
                else
                    this.processReturn(message.returnId, null, "Unknown error.");
                }
            });
        }

    private onHtml_VERIFY_MESSAGE(message : HTMLMessage) : void
        {
        if (!this.loginCheck(message.returnId)) return;
        const result = this.am.current.wm.weblibVerify(message.args);
        if (result.verifiedOK)
            this.processReturn(message.returnId, true, null);
        else if (result.verifiedOK === false)
            this.processReturn(message.returnId, false, null);
        else if (result.error)
            this.processReturn(message.returnId, null, result.error);
        else
            this.processReturn(message.returnId, null, "Unknown error.");
        }

    private loginCheck(returnId : string) : boolean
        {
        if (this.am.isLoggedIn)
            return true;
        else
            {
            this.processReturn(returnId, null, NOT_LOGGED_IN_ERROR);
            return false;
            }
        }

    private processReturn(returnId : string, result : any, error : string | null) : void
        {
        let returnInfo : any = { returnId };
        if (result)
            returnInfo.result = result;
        else
            returnInfo.error = error ? error : "Unknown error.";
        const js = `(${ PROCESS_RETURN_JS })(${ JSON.stringify(JSON.stringify(returnInfo)) }); true;`;
        this.executeJavaScript(js);
        }

    public notifyAccountStatus(loggedIn : boolean, name : string, network : string, address : string, balance : number, balanceSat : string, statusChangeReason : string, error : string | null) : void
        {
        if (!this.metrixLoaded) return;
        if (balance < 0)
            balance = Number.parseFloat(balanceSat)/SATOSHIS_PER_MRX;
        if (balance < 0)
            {
            balance = 0;
            balanceSat = "";
            }
        if (statusChangeReason != NOTIFICATION_REASONS.DAPP_CONNECTION)
            {
            if (!loggedIn)
                statusChangeReason = NOTIFICATION_REASONS.LOGOUT;
            else if (!this.lastNotifyLoggedIn || this.lastNotifyName != name)
                statusChangeReason = NOTIFICATION_REASONS.LOGIN;
            else
                statusChangeReason = NOTIFICATION_REASONS.BALANCE_CHANGE;
            const itsTheSame : boolean =
                this.lastNotifyLoggedIn == loggedIn &&
                this.lastNotifyName == name &&
                this.lastNotifyNetwork == network &&
                this.lastNotifyAddress == address &&
                this.lastNotifyBalance == balance &&
                this.lastNotifyBalanceSat == balanceSat &&
                (this.lastNotifyStatusChangeReason == statusChangeReason || (this.lastNotifyStatusChangeReason == NOTIFICATION_REASONS.DAPP_CONNECTION && statusChangeReason == NOTIFICATION_REASONS.BALANCE_CHANGE)) &&
                this.lastNotifyError == error;
            if (itsTheSame) return;
            }
        this.lastNotifyLoggedIn = loggedIn;
        this.lastNotifyName = name;
        this.lastNotifyNetwork = network;
        this.lastNotifyAddress = address;
        this.lastNotifyBalance = balance;
        this.lastNotifyBalanceSat = balanceSat;
        this.lastNotifyStatusChangeReason = statusChangeReason;
        this.lastNotifyError = error;
        const params = `${ loggedIn ? "true" : "false" }, ${ JSON.stringify(name) }, "${ network }", "${ address }", ${ balance }, "${ balanceSat }", ${ JSON.stringify(error) }, ${ JSON.stringify(statusChangeReason) }`;
        const js = `(${ NOTIFY_JS })(${ params }); true;`;
        this.executeJavaScript(js);
        }

    public onLoadStart() : void
        {
        this.setMetrixLoadState(false);
        }

    public onLoadEnd() : void
        {
        ; // This space intentionally left blank.
        }

    public onTabClosed() : void
        {
        this.setMetrixLoadState(false);
        }
    }
