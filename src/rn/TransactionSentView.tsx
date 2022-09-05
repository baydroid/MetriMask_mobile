import React from "react";
import { View, Text } from "react-native";
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { WALLET_SCREENS } from "./WalletView";
import { MC } from "../mc";
import { commonStyles, SimpleDoublet, SimpleButton, TitleBar, COLOR_BLACK } from "./common";



export type TransactionSentViewSerializableProps =
    {
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
    const accountName : string = MC.getMC().storage.accountManager.current.accountName;
    const whereTo : string = props.destinationMnsName.length ? `${ props.destinationMnsName } (${ props.destinationAddr })` : props.destinationAddr;
    return (
        <View style={ commonStyles.containingView }>
            <TitleBar title="Transaction Started OK" onBurgerPressed={ props.onBurgerPressed }/>
            <View style={ commonStyles.horizontalBar }/>
            <View style={ commonStyles.squeezed }>
                <View style={{ height: 24 }} />
                <Text style={{ color: COLOR_BLACK }}>{ `A transaction has been successfully started to send ${ props.decimalizedAmountStr } ${ props.symbol } from account ${ accountName } to ${ whereTo }. When the transaction has been confirmed the funds will be available at the destination.` }</Text>
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
