import "../../shim.js";

import React, { useState, useEffect } from "react";
import { Alert, NativeSyntheticEvent, Text, TextInputEndEditingEventData, View } from "react-native";
import DropDownPicker, { ItemType, ValueType} from 'react-native-dropdown-picker';
import { useNavigation } from "@react-navigation/native";
import toBigInteger, { BigInteger } from "big-integer";
import { StackNavigationProp } from "@react-navigation/stack";
import { Insight } from "metrixjs-wallet";

import { MC, MRX_DECIMALS, BIG_0, ADDRESS_SYNTAX } from "../mc";
import { WALLET_SCREENS } from "./WalletView";
import { WorkFunctionResult } from "./MainView";
import { commonStyles, DoubleDoublet, formatSatoshi, validateAndSatoshizeFloatStr, SimpleDoublet, TitleBar, SimpleTextInput, InvalidMessage, SimpleButtonPair, SimpleTextInputPair, LOADING_STR, validateIntStr, AddressQuasiDoublet, noumberOfDecimals } from "./common";
import { TransactionSentViewSerializableProps } from "./TransactionSentView";
import { MRC20Token } from "../MRC20.js";
import { QR_SCANNER_TARGETS } from "./QRAddressScanView";
import { DEFAULT_GAS_LIMIT, DEFAULT_GAS_PRICE_SATOSHI } from "../mc";



type ItemTypePlus = ItemType<string> & { decimals : number; };

const feerates = [ 225000000, 300000000, 375000000, ];
const feerateDD : ItemType<number>[] =
    [
    { label: "Slow",   value: 0 },
    { label: "Normal", value: 1 },
    { label: "Fast",   value: 2 },
    ];

export type SendViewSerializableProps =
    {
    loadCount?      : number;
    errorMessage?   : string;
    tokenDDValue?   : string;
    feerateDDValue? : number;
    amountStr?      : string;
    toAddr?         : string;
    gasPriceStr?    : string;
    gasLimitStr?    : string;
    };

export type SendViewProps = SendViewSerializableProps &
    {
    onBurgerPressed  : () => any;
    qrScanAddress    : (target : QR_SCANNER_TARGETS, returnScreen : WALLET_SCREENS, onAddressScanned : (address : string) => any) => any;
    showWorkingAsync : (asyncWorkFunction : (onWorkDone : (result : WorkFunctionResult) => any) => any) => any;
    };

const AMOUNT_NOT_NUMBER_ERROR        = "The amount must be a number.";
const AMOUNT_TOO_SMALL_ERROR         = "The amount must be more than zero.";
const AMOUNT_OVERDECIMALIZED_ERROR   = "The amount has too many decimals.";
const GAS_LIMIT_NOT_NUMBER_ERROR     = "The gas limit must be a number greater than 0.";
const GAS_PRICE_NOT_NUMBER_ERROR     = "The gas price must be a number greater than 0.";
const ADDRESS_NOT_OK_ERROR           = "The To Address is not valid.";
const MNS_NAME_NOT_OK_ERROR          = "The MNS name is not valid.";
const MNS_NAME_NOT_MRX_ADDRESS_ERROR = "The MNS name resolves to something that's not an MRX address";
const SEND_TO_EVM_ERROR              = "It's not possible to send to an EVM address.";
const SEND_WIERDNESS_ERROR           = "Unable to send because of an unknown error."

let loadCount : number = 1;
let qrScannedAddress : string = "";
let lastTokenDDValue : ValueType | null = "";
let tokenDDValueRecentlyUpdated : boolean = false;
let tokenBalanceRefreshNonce : number = 1;

export function SendView(props : SendViewProps) : JSX.Element
    {
    const walletNavigation = useNavigation<StackNavigationProp<any>>();
    const am = MC.getMC().storage.accountManager;

    const [ tokenDDOpen, setTokenDDOpen ] = useState<boolean>(false);
    const [ tokenDDValue, setTokenDDValue ] = useState<string>(props.tokenDDValue ? props.tokenDDValue : "");
    const [ tokenDDItems, setTokenDDItems ] = useState<ItemTypePlus[]>(tokenDropDownItems());

    const [ feerateDDOpen, setFeerateDDOpen ] = useState<boolean>(false);
    const [ feerateDDValue, setFeerateDDValue ] = useState<number>(props.feerateDDValue ? props.feerateDDValue : 0);
    const [ feerateDDItems, setFeerateDDItems ] = useState<ItemType<number>[]>(feerateDD);

    const [ amountStr, setAmountStr ] = useState<string>(props.amountStr ? props.amountStr : "");
    const [ toAddr, setToAddr ] = useState<string>(props.toAddr ? props.toAddr : "");
    const [ balanceStr, setBalanceStr ] = useState<string>(formatAccountBalanceStr());
    const [ gasPriceStr, setGasPriceStr ] = useState<string>(props.gasPriceStr ? props.gasPriceStr : DEFAULT_GAS_PRICE_SATOSHI.toString());
    const [ gasLimitStr, setGasLimitStr ] = useState<string>(props.gasLimitStr ? props.gasLimitStr : DEFAULT_GAS_LIMIT.toString());
    const [ tacc, setTacc ] = useState<number>(am.current.tkm.tokenArrayChangeCount);
    const [ errorMessage, setErrorMessage ] = useState<string>("");

    let sendAlertOut : boolean = false;

    if (tacc != am.current.tkm.tokenArrayChangeCount)
        {
        setTacc(am.current.tkm.tokenArrayChangeCount);
        setTokenDDItems(tokenDropDownItems());
        setTokenDDValue("");
        }
    if (!props.errorMessage) props.errorMessage = "";
    if (props.loadCount == loadCount && props.errorMessage != errorMessage) setErrorMessage(props.errorMessage);
    if (qrScannedAddress.length)
        {
        setToAddr(qrScannedAddress);
        qrScannedAddress = "";
        }
    if (lastTokenDDValue != tokenDDValue) tokenDDValueRecentlyUpdated = true;
    lastTokenDDValue = tokenDDValue;
    updateBalanceStr();

    useEffect(() : (() => void) =>
        {
        let mrxNotification : number;
        if (tokenDDValue == "")
            {
            tokenDDValueRecentlyUpdated = false;
            mrxNotification = am.startBalanceNotifications(() : void =>
                {
                updateBalanceStr();
                });
            }
        else
            {
            mrxNotification = 0;
            if (tokenDDValueRecentlyUpdated)
                {
                const myNonce : number = tokenBalanceRefreshNonce;
                const tk : MRC20Token = am.current.tkm.findToken(tokenDDValue as string)!;
                am.current.refreshTokenBalance(tk).then((wasChanged : boolean) : void =>
                    {
                    if (myNonce != tokenBalanceRefreshNonce) return;
                    tokenDDValueRecentlyUpdated = false;
                    updateBalanceStr();
                    })
                .catch((e : any) : void =>
                    {
                    MC.raiseError(e, "SendView getting token balance");
                    if (myNonce != tokenBalanceRefreshNonce) return;
                    tokenDDValueRecentlyUpdated = false;
                    });
                }
            }
        return () : void =>
            {
            tokenBalanceRefreshNonce++;
            if (mrxNotification) am.stopBalanceNotifications(mrxNotification);
            };
        });

    function updateBalanceStr() : void
        {
        const newBalanceStr : string = formatAccountBalanceStr();
        if (balanceStr != newBalanceStr) setBalanceStr(newBalanceStr);
        }

    function tokenDropDownItems() : ItemTypePlus[]
        {
        const items : ItemTypePlus[] = [ { label: "MRX", value: "", decimals: MRX_DECIMALS } ];
        for (const tk of am.current.tkm.tokenArray) items.push({ label: tk.name, value: tk.address, decimals: tk.decimals });
        return items.sort((a: ItemTypePlus, b: ItemTypePlus) : number => a.label == "MRX" ? -1 : (b.label == "MRX" ? 1 : a.label!.localeCompare(b.label!)));
        }

    function onSend() : void
        {
        if (!sendAlertOut)
            {
            sendAlertOut = true;
            Alert.alert("Send?", `Confirm sending.`,
                [
                { text: "Cancel", onPress: () : void => { sendAlertOut = false;         }, style: "cancel" },
                { text: "Send",   onPress: () : void => { sendAlertOut = false; send(); }                  }
                ]);
            }
        }

    function send() : void
        {
        const syntax = MC.anaylizeAddressSyntax(toAddr);
        switch (syntax)
            {
            case ADDRESS_SYNTAX.INVALID: setErrorMessage(ADDRESS_NOT_OK_ERROR); return;
            case ADDRESS_SYNTAX.EVM:     setErrorMessage(SEND_TO_EVM_ERROR);    return;
            default: break;
            }
        const decimals : number = getDecimals();
        const amountToSendStr = validateAndSatoshizeFloatStr(amountStr, decimals);
        if (!amountToSendStr.length)
            {
            setErrorMessage(AMOUNT_NOT_NUMBER_ERROR);
            return;
            }
        if (noumberOfDecimals(amountStr) > decimals)
            {
            setErrorMessage(AMOUNT_OVERDECIMALIZED_ERROR);
            return;
            }
        const amountToSend : BigInteger = toBigInteger(amountToSendStr);
        if (amountToSend.lesserOrEquals(BIG_0))
            {
            setErrorMessage(AMOUNT_TOO_SMALL_ERROR);
            return;
            }
        clearError();
        if (tokenDDValue == "")
            resolveMnsAndSendMRX(syntax, amountToSend, amountToSendStr);
        else
            resolveMnsAndSendToken(syntax, amountToSend);
        }

    function getDecimals() : number
        {
        let decimals = MRX_DECIMALS;
        if (tokenDDValue != "")
            for (const item of tokenDDItems)
                if (item.value == tokenDDValue)
                    {
                    decimals = item.decimals;
                    break;
                    }
        return decimals;
        }

    function resolveMnsAndSendMRX(syntax : ADDRESS_SYNTAX, amountToSend : BigInteger, amountToSendStr : string) : void
        {
        props.showWorkingAsync((onWorkDone : (result : WorkFunctionResult) => any) : void =>
            {
            if (syntax == ADDRESS_SYNTAX.MNS)
                {
                am.current.wm.ninfo.mnsResolveMRX(toAddr).then((targetAddress : string) : void =>
                    {
                    if (targetAddress.length)
                        {
                        if (MC.validateMrxAddress(targetAddress))
                            sendMRX(targetAddress, amountToSend, amountToSendStr, onWorkDone);
                        else
                            finishWorkWithError(MNS_NAME_NOT_MRX_ADDRESS_ERROR, onWorkDone);
                        }
                    else
                        finishWorkWithError(MNS_NAME_NOT_OK_ERROR, onWorkDone);
                    })
                .catch((e : any) : void => MC.raiseError(e, `SendView resolveMnsAndSendMRX`));
                }
            else
                 sendMRX(toAddr, amountToSend, amountToSendStr, onWorkDone);
            });
        }

    function sendMRX(targetAddress : string, amountToSend : BigInteger, amountToSendStr : string, onWorkDone : (result : WorkFunctionResult) => any) : void
        {
        const amountAsNumber : number = Number.parseInt(amountToSendStr); // Done this way to be ready for when wallet supports BigInt or similar.
        am.current.wm.wallet.send(targetAddress, amountAsNumber, { feeRate: feerates[feerateDDValue] }).then((result : Insight.ISendRawTxResult) : void =>
            {
            if (result.txid)
                {
                const mnsName = toAddr == targetAddress ? `` : toAddr;
                const params : TransactionSentViewSerializableProps = { amountStr: formatSatoshi(amountToSend, MRX_DECIMALS), symbol: "MRX", destinationAddr: targetAddress, destinationMnsName: mnsName, txid: result.txid };
                onWorkDone({ nextScreen: WALLET_SCREENS.TX_SENT, nextScreenParams: params });
                }
            else
                {
                const errMsg : string = (result as any).message ? (result as any).message : SEND_WIERDNESS_ERROR;
                finishWorkWithError(errMsg, onWorkDone);
                }
            })
        .catch((e : any) : void => finishWorkWithError(MC.errorToString(e), onWorkDone));
        }

    function resolveMnsAndSendToken(syntax : ADDRESS_SYNTAX, amountToSend : BigInteger) : void
        {
        let gasPrice : number;
        if (gasPriceStr != "")
            {
            if (!validateIntStr(gasPriceStr, true))
                {
                setErrorMessage(GAS_PRICE_NOT_NUMBER_ERROR);
                return;
                }
            gasPrice = Number.parseInt(gasPriceStr);
            }
        else
            gasPrice = DEFAULT_GAS_PRICE_SATOSHI;
        let gasLimit : number;
        if (gasLimitStr != "")
            {
            if (!validateIntStr(gasLimitStr, true))
                {
                setErrorMessage(GAS_LIMIT_NOT_NUMBER_ERROR);
                return;
                }
            gasLimit = Number.parseInt(gasLimitStr);
            }
        else
            gasLimit = DEFAULT_GAS_LIMIT;
        props.showWorkingAsync((onWorkDone : (result : WorkFunctionResult) => any) : void =>
            {
            if (syntax == ADDRESS_SYNTAX.MNS)
                {
                am.current.wm.ninfo.mnsResolveMRX(toAddr).then((targetAddress : string) : void =>
                    {
                    if (targetAddress.length)
                        {
                        if (MC.validateMrxAddress(targetAddress))
                            sendToken(targetAddress, gasPrice, gasLimit, amountToSend, onWorkDone);
                        else
                            finishWorkWithError(MNS_NAME_NOT_MRX_ADDRESS_ERROR, onWorkDone);
                        }
                    else
                        finishWorkWithError(MNS_NAME_NOT_OK_ERROR, onWorkDone);
                    })
                .catch((e : any) : void => MC.raiseError(e, `SendView resolveMnsAndSendToken`));
                }
            else
                sendToken(toAddr, gasPrice, gasLimit, amountToSend, onWorkDone);
            });
        }

    function sendToken(targetAddress : string, gasPrice : number, gasLimit : number, amountToSend : BigInteger, onWorkDone : (result : WorkFunctionResult) => any) : void
        {
        const tk : MRC20Token = am.current.tkm.findToken(tokenDDValue! as string)!;
        am.current.wm.mrc20Send(tk.address, targetAddress, amountToSend, gasLimit, gasPrice).then((txid : string) : void =>
            {
            const mnsName = toAddr == targetAddress ? `` : toAddr;
            const params : TransactionSentViewSerializableProps = { amountStr: formatSatoshi(amountToSend, tk.decimals), symbol: tk.symbol, destinationAddr: targetAddress, destinationMnsName: mnsName, txid: txid };
            onWorkDone({ nextScreen: WALLET_SCREENS.TX_SENT, nextScreenParams: params });
            })
        .catch((e : any) : void => finishWorkWithError(MC.errorToString(e), onWorkDone));
        }

    function finishWorkWithError(errorMsg : string, onWorkDone : (result : WorkFunctionResult) => any) : void
        {
        const params : SendViewSerializableProps = { loadCount: loadCount, errorMessage: errorMsg, tokenDDValue: tokenDDValue, feerateDDValue: feerateDDValue, amountStr: amountStr, toAddr: toAddr, gasPriceStr: gasPriceStr, gasLimitStr: gasLimitStr };
        onWorkDone({ nextScreen: WALLET_SCREENS.SEND, nextScreenParams: params });
        }

    function formatAccountBalanceStr() : string
        {
        if (tokenDDValue == "")
            {
            if (am.current.wm.balanceSat.greaterOrEquals(BIG_0)) return formatSatoshi(am.current.wm.balanceSat, MRX_DECIMALS) + " MRX";
            }
        else
            {
            const tk : MRC20Token = am.current.tkm.findToken(tokenDDValue)!;
            if (tk.balanceSat.greaterOrEquals(BIG_0)) return formatSatoshi(tk.balanceSat, tk.decimals) + " " + tk.symbol;
            }
        return LOADING_STR;
        }

    function onBurgerPressed() : void
        {
        clearError();
        props.onBurgerPressed();
        }

    function onCancel() : void
        {
        clearError();
        walletNavigation.navigate(WALLET_SCREENS.ACCOUNT_HOME);
        }

    function onQRScanPressed() : void
        {
        clearError();
        props.qrScanAddress(QR_SCANNER_TARGETS.metrixAddress, WALLET_SCREENS.SEND, (address : string) : void =>
            {
            qrScannedAddress = address;
            });
        }

    function onOpenTokenDD() : void
        {
        clearError();
        if (feerateDDOpen) setFeerateDDOpen(false);
        }

    function onOpenFeerateDD() : void
        {
        clearError();
        if (tokenDDOpen) setTokenDDOpen(false);
        }

    function onChangeAmount(newAmountStr : string) : void
        {
        clearError();
        setAmountStr(newAmountStr.trim());
        }

    function onChangeGasLimit(newGasLimitStr : string) : void
        {
        clearError();
        setGasLimitStr(newGasLimitStr.trim());
        }

    function onChangeGasPrice(newGasPriceStr : string) : void
        {
        clearError();
        setGasPriceStr(newGasPriceStr.trim());
        }

    function onChangeToAddr(newToAddr : string) : void 
        {
        clearError();
        setToAddr(newToAddr.trim());
        }

    function onEndEditingToAddr(nsEvent: NativeSyntheticEvent<TextInputEndEditingEventData>) : void
        {
        const trimmedToAddr = toAddr.trim();
        if (!trimmedToAddr.length) return;
        if (trimmedToAddr.length != toAddr.length) onChangeToAddr(trimmedToAddr);
        }

    function clearError() : void
        {
        loadCount++;
        if (errorMessage.length) setErrorMessage("");
        }

    function renderErrorMessage() : JSX.Element | null
        {
        if (errorMessage.length)
            {
            return (
                <>
                    <View style={{ height: 24 }}/>
                    <InvalidMessage text={ errorMessage } />
                </>
                );
            }
        else
            return null;
        }

    function renderFeeOrGas() : JSX.Element
        {
        if (tokenDDValue != "")
            {
            return (
                <SimpleTextInputPair
                    left={{ label: "Gas Limit", value: gasLimitStr, onChangeText: onChangeGasLimit, keyboardType: "numeric" }}
                    right={{ label: "Gas Price (Sat)", value: gasPriceStr, onChangeText: onChangeGasPrice, keyboardType: "numeric" }}/>
                );
            }
        else
            {
            return (
                <>
                    <Text>Transaction speed:</Text>
                    <DropDownPicker
                        dropDownContainerStyle={{ borderColor: "#900090" }}
                        style={{ borderColor: "#900090" }}
                        items={ feerateDDItems }
                        open={ feerateDDOpen }
                        value={ feerateDDValue }
                        setOpen={ setFeerateDDOpen }
                        setValue={ setFeerateDDValue }
                        setItems={ setFeerateDDItems }
                        onOpen={ onOpenFeerateDD }
                        zIndex={ 10 }
                        zIndexInverse={ 20 }/>
                </>
                );
            }
        }

    return (
        <View style = { commonStyles.containingView }>
            <TitleBar title="Send" onBurgerPressed={ onBurgerPressed }/>
            <View style={ commonStyles.horizontalBar }/>
            <View style={ commonStyles.squeezed }>
                <View style = {{ height: 24 }} />
                <DoubleDoublet titleL="From Account:" textL={ am.current.accountName } titleR="Network:" textR={ am.current.wm.ninfo.name }/>
                <View style={{ height: 7 }} />
                <AddressQuasiDoublet title="From Account Address:" acnt={ am.current }/>
                <View style={{ height: 7 }} />
                <SimpleDoublet title="From Account Balance:" text={ balanceStr }/>
                <View style={{ height: 14 }} />
                <Text>Token:</Text>
                <DropDownPicker
                    dropDownContainerStyle={{ borderColor: "#900090" }}
                    style={{ borderColor: "#900090" }}
                    maxHeight={ 400 }
                    items={ tokenDDItems }
                    open={ tokenDDOpen }
                    value={ tokenDDValue }
                    setOpen={ setTokenDDOpen }
                    setValue={ setTokenDDValue }
                    setItems={ setTokenDDItems }
                    onOpen={ onOpenTokenDD }
                    zIndex={ 20 }
                    zIndexInverse={ 10 }/>
                <View style={{ height: 24 }} />
                <SimpleTextInput label="Amount:" keyboardType="numeric" value={ amountStr } onChangeText={ onChangeAmount }/>
                <View style={{ height: 24 }} />
                <SimpleTextInput label="To Address:" value={ toAddr } onChangeText={ onChangeToAddr } onEndEditing={ onEndEditingToAddr } icon="qrcode" onPressIcon={ onQRScanPressed }/>
                <View style={{ height: 24 }} />
                { renderFeeOrGas() }
                <View style={{ height: 24 }} />
                <SimpleButtonPair left={{ text: "Cancel", onPress: onCancel }} right={{ text: "Send", onPress: onSend }}/>
                { renderErrorMessage() }
            </View>
        </View>
        );
    }
