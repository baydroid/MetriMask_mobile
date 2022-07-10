import React from "react";
import { View, Text } from "react-native";
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { WALLET_SCREENS } from "./WalletView";
import { MC } from "../mc";
import { commonStyles, SimpleDoublet, SimpleButton, TitleBar } from "./common";



export type TransactionSentViewSerializableProps =
    {
    amountStr       : string;
    symbol          : string;
    destinationAddr : string;
    txid            : string;
    };

export type TransactionSentViewProps = TransactionSentViewSerializableProps &
    {
    onBurgerPressed : () => any;
    };

export function TransactionSentView(props : TransactionSentViewProps) : JSX.Element
    {
    const walletNavigation = useNavigation<StackNavigationProp<any>>();
    const accountName : string = MC.getMC().storage.accountManager.current.accountName;
 
    return (
        <View style={ commonStyles.containingView }>
            <TitleBar title="Transaction Started OK" onBurgerPressed={ props.onBurgerPressed }/>
            <View style={ commonStyles.horizontalBar }/>
            <View style={ commonStyles.squeezed }>
                <View style={{ height: 24 }} />
                <Text style={{ color: "#000000" }}>{ `A transaction has been successfully started to send ${ props.amountStr } ${ props.symbol } from account ${ accountName } to address ${ props.destinationAddr }. When the transaction has been confirmed the funds will be available at the destination.` }</Text>
                <View style={{ height: 24 }} />
                <SimpleDoublet title="Transaction Id:" text={ props.txid }/>
                <View style={{ height: 7 }} />
                <SimpleButton text="Copy To Clipboard" icon = "content-copy" onPress = { () : void => Clipboard.setString(props.txid) } />
                <View style={{ height: 24 }} />
                <SimpleButton text="OK" onPress = { () : void => walletNavigation.navigate(WALLET_SCREENS.ACCOUNT_HOME) } />
            </View>
        </View>
        );
    }