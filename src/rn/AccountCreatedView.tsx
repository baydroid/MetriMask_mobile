import React from "react";
import { StyleSheet, Text, View, Platform } from "react-native";
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Clipboard from '@react-native-clipboard/clipboard';

import { COLOR_GREEN_WASH, commonStyles, SimpleButton, TitleBar } from "./common";
import { WALLET_SCREENS } from "./WalletView";



const accountCreatedStyles = StyleSheet.create
    ({
    mnemonic:
        {
        marginLeft: 24,
        marginRight: 24,
        padding: 12,
        backgroundColor: COLOR_GREEN_WASH,
        },
    mnemonicTextAndroid:
        {
        fontFamily: "monospace",
        fontSize: 20,
        fontWeight: "bold",
        },
    mnemonicTextIos:
        {
        fontFamily: "Courier",
        fontSize: 20,
        fontWeight: "bold",
        },
    });



export type AccountCreatedViewProps =
    {
    onBurgerPressed : () => any;
    mnemonic        : string;
    };

export function AccountCreatedView(props : AccountCreatedViewProps) : JSX.Element
    {
    const walletNavigation = useNavigation<StackNavigationProp<any>>();
    const mnemonic = props.mnemonic;
    const fontStyle = Platform.OS === "ios" ? accountCreatedStyles.mnemonicTextIos : accountCreatedStyles.mnemonicTextAndroid;

    function onBurgerPressed() : void
        {
        if (props.onBurgerPressed) props.onBurgerPressed();
        }

    return (
        <View style={ commonStyles.containingView }>
            <TitleBar title="Account Mnemonic" onBurgerPressed={ props.onBurgerPressed }/>
            <View style={ commonStyles.horizontalBar }/>
            <View style={ { height: 24 } } />
            <View style={ accountCreatedStyles.mnemonic }>
                <Text style={ fontStyle }>{ mnemonic }</Text>
            </View>
            <View style={ { height: 24 } } />
            <View style={ commonStyles.squeezed }>
                <SimpleButton text="Copy to Clipboard" icon="content-copy" onPress={ () : void => Clipboard.setString(mnemonic) }/>
                <View style={ { height: 24 } }/>
                <Text>Keep the mnemonic (shown above on a green background) secret. It can be used to open the account in this and other wallets.</Text>
                <View style={ { height: 6 } }/>
                <Text>After tapping OK this app will not be able to show the mnemonic again. Please record it now.</Text>
                <View style={ { height: 24 } }/>
                <SimpleButton text="OK (I've saved the mnemonic)" onPress={ () : void => walletNavigation.navigate(WALLET_SCREENS.ACCOUNT_HOME) }/>
            </View>
        </View>
        );
    }
