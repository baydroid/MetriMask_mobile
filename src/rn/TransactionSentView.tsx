import React from "react";
import { View, Text } from "react-native";
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { WALLET_SCREENS } from "./WalletView";
import { MC, MRX_DECIMALS } from "../mc";
import { commonStyles, SimpleDoublet, SimpleButton, TitleBar, COLOR_BLACK, validateAndSatoshizeFloatStr } from "./common";
import { USDPriceFinder } from "../USDPriceFinder";
import { NET_ID } from "../NetInfo";



const PRICE_FINDER = USDPriceFinder.getFinder();



export type TransactionSentViewSerializableProps =
    {
    sendingTokens        : boolean;
    decimalizedAmountStr : string;
    symbol               : string;
    destinationAddr      : string;
    destinationMnsName   : string;
    txid                 : string;
    };

export type TransactionSentViewProps = TransactionSentViewSerializableProps &
    {
    onBurgerPressed : () => any;
    };

export function TransactionSentView(props : TransactionSentViewProps) : JSX.Element
    {
    const walletNavigation = useNavigation<StackNavigationProp<any>>();
    const am = MC.getMC().storage.accountManager;
    const accountName : string = am.current.accountName;
    const whereTo : string = props.destinationMnsName.length ? `${ props.destinationMnsName } (${ props.destinationAddr })` : props.destinationAddr;

    function amountAndSymbol() : string
        {
        if (!props.sendingTokens && am.current.wm.ninfo.id == NET_ID.MAIN)
            {
            const amountToSendStr : string = validateAndSatoshizeFloatStr(props.decimalizedAmountStr, MRX_DECIMALS);
            const amountToSendUSD : string = PRICE_FINDER.satoshiToUSD(amountToSendStr);
            if (amountToSendUSD) return `${ props.decimalizedAmountStr } ${ props.symbol } ($ ${ amountToSendUSD })`;
            }
        return `${ props.decimalizedAmountStr } ${ props.symbol }`;
        }

    return (
        <View style={ commonStyles.containingView }>
            <TitleBar title="Transaction Started OK" onBurgerPressed={ props.onBurgerPressed }/>
            <View style={ commonStyles.horizontalBar }/>
            <View style={ commonStyles.squeezed }>
                <View style={{ height: 24 }} />
                <Text style={{ color: COLOR_BLACK }}>{ `A transaction has been successfully started to send ${ amountAndSymbol() } from account ${ accountName } to ${ whereTo }. When the transaction has been confirmed the funds will be available at the destination.` }</Text>
                <View style={{ height: 24 }} />
                <SimpleDoublet title="Transaction Id:" text={ props.txid }/>
                <View style={{ height: 7 }} />
                <SimpleButton text="Copy To Clipboard" icon="content-copy" onPress={ () : void => Clipboard.setString(props.txid) }/>
                <View style={{ height: 48 }} />
                <SimpleButton text="OK" onPress={ () : void => walletNavigation.navigate(WALLET_SCREENS.ACCOUNT_HOME) }/>
            </View>
        </View>
        );
    }
