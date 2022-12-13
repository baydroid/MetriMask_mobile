import "../../shimWrapper.js";

import React from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import toBigInteger from "big-integer";

import { MC, MRX_DECIMALS } from "../mc";
import { AddressQuasiDoublet, commonStyles, DoubleDoublet, formatSatoshi, SimpleButtonPair, SimpleDoublet, TitleBar } from "./common";
import { WorkFunctionResult } from "./MainView";
import { MRC20Token } from "../MRC20";
import { WALLET_SCREENS } from "./WalletView";
import { Insight } from "metrixjs-wallet";
import { TransactionSentViewSerializableProps } from "./TransactionSentView";
import { getSendViewLoadCount, SendViewSerializableProps } from "./SendView";



const SEND_WIERDNESS_ERROR : string = "Unable to send because of an unknown error."



export type ConfirmSendViewSerializableProps =
    {
    tokenAddress          : string;
    amountStr             : string;
    toAddr                : string;
    mnsName?              : string;
    feerateDDValue?       : number;
    feerateName?          : string;
    feerate?              : number;
    gasPriceStr?          : string;
    gasLimitStr?          : string;
    };

export type ConfirmSendViewProps = ConfirmSendViewSerializableProps &
    {
    onBurgerPressed  : () => any;
    showWorkingAsync : (asyncWorkFunction : (onWorkDone : (result : WorkFunctionResult) => any) => any) => any;
    };

export function ConfirmSendView(props : ConfirmSendViewProps) : JSX.Element
    {
    const walletNavigation = useNavigation<StackNavigationProp<any>>();
    const am = MC.getMC().storage.accountManager;
    const tk : MRC20Token | null = props.tokenAddress ? am.current.tkm.findToken(props.tokenAddress) : null;
    const currency : string = tk ? tk.symbol : "MRX";
    const decimalizedAmountStr : string = formatSatoshi(props.amountStr, tk ? tk.decimals : MRX_DECIMALS);
    const mnsName : string = props.mnsName ? props.mnsName : "";

    function onSend() : void
        {
        props.showWorkingAsync((onWorkDone : (result : WorkFunctionResult) => any) : void =>
            {
            if (tk)
                sendToken(onWorkDone);
            else
                sendMRX(onWorkDone);
            });
        }

    function sendToken(onWorkDone : (result : WorkFunctionResult) => any) : void
        {
        const gasPrice : number = Number.parseInt(props.gasPriceStr!);
        const gasLimit : number = Number.parseInt(props.gasLimitStr!);
        am.current.wm.mrc20Send(tk!.address, props.toAddr, toBigInteger(props.amountStr), gasLimit, gasPrice).then((txid : string) : void =>
            {
            const params : TransactionSentViewSerializableProps = { decimalizedAmountStr: decimalizedAmountStr, symbol: tk!.symbol, destinationAddr: props.toAddr, destinationMnsName: mnsName, txid: txid };
            onWorkDone({ nextScreen: WALLET_SCREENS.TX_SENT, nextScreenParams: params });
            })
        .catch((e : any) : void => finishWorkWithError(MC.errorToString(e), onWorkDone));
        }

    function sendMRX(onWorkDone : (result : WorkFunctionResult) => any) : void
        {
        const amountAsNumber : number = Number.parseInt(props.amountStr);
        am.current.wm.wallet.send(props.toAddr, amountAsNumber, { feeRate: props.feerate }).then((result : Insight.ISendRawTxResult) : void =>
            {
            if (result.txid)
                {
                const params : TransactionSentViewSerializableProps = { decimalizedAmountStr: decimalizedAmountStr, symbol: "MRX", destinationAddr: props.toAddr, destinationMnsName: mnsName, txid: result.txid };
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

    function finishWorkWithError(errorMsg : string, onWorkDone : (result : WorkFunctionResult) => any) : void
        {
        const params : SendViewSerializableProps =
            {
            loadCount:      getSendViewLoadCount(),
            errorMessage:   errorMsg,
            tokenDDValue:   props.tokenAddress,
            feerateDDValue: props.feerateDDValue,
            amountStr:      decimalizedAmountStr,
            toAddr:         mnsName ? mnsName : props.toAddr,
            gasPriceStr:    props.gasPriceStr,
            gasLimitStr:    props.gasLimitStr
            };
        onWorkDone({ nextScreen: WALLET_SCREENS.SEND, nextScreenParams: params });
        }

    function onCancel() : void
        {
        const params : SendViewSerializableProps =
            {
            tokenDDValue:   props.tokenAddress,
            feerateDDValue: props.feerateDDValue,
            amountStr:      decimalizedAmountStr,
            toAddr:         mnsName ? mnsName : props.toAddr,
            gasPriceStr:    props.gasPriceStr,
            gasLimitStr:    props.gasLimitStr
            };
        walletNavigation.navigate(WALLET_SCREENS.SEND, params);
        }

    function GasOrFee() : JSX.Element
        {
        if (tk)
            return (<DoubleDoublet titleL="Gas Limit:" textL={ props.gasLimitStr! } titleR="Gas Price (Sat):" textR={ props.gasPriceStr! }/>);
        else
            return (<SimpleDoublet title="Transaction speed:" text={ props.feerateName! }/>);
        }

    return (
        <View style={ commonStyles.containingView }>
            <TitleBar title="Confirm Sending?" onBurgerPressed={ props.onBurgerPressed }/>
            <View style={ commonStyles.horizontalBar }/>
            <View style={ commonStyles.squeezed }>
                <View style={{ height: 24 }} />
                <DoubleDoublet titleL="From Account:" textL={ am.current.accountName } titleR="Network:" textR={ am.current.wm.ninfo.name }/>
                <View style={{ height: 7 }} />
                <AddressQuasiDoublet title="From Account Address:" acnt={ am.current }/>
                <View style={{ height: 7 }} />
                <SimpleDoublet title="Ammount to Send:" text={ `${ decimalizedAmountStr } ${ currency }` }/>
                <View style={{ height: 7 }} />
                <AddressQuasiDoublet title="Send to Address:" address={ props.toAddr } mnsName={ props.mnsName }/>
                <View style={{ height: 7 }} />
                <GasOrFee/>
                <View style={{ height: 24 }} />
                <SimpleButtonPair left={{ text: "Cancel", onPress: onCancel }} right={{ text: "Send", onPress: onSend }}/>
            </View>
        </View>
        );
    }
