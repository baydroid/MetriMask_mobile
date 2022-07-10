import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Clipboard from "@react-native-clipboard/clipboard";

import { MC } from "../mc";
import { WALLET_SCREENS } from "./WalletView";
import { commonStyles, DoubleDoublet, SimpleButton, SimpleDoublet, TitleBar } from "./common";



const accountExportedStyles = StyleSheet.create
    ({
    wif:
        {
        marginLeft: 0,
        marginRight: 0,
        padding: 12,
        backgroundColor: "#E0FFE0",
        },
    wifTextAndroid:
        {
        fontFamily: "monospace",
        fontSize: 20,
        fontWeight: "bold",
        },
    wifTextIos:
        {
        fontFamily: "Courier",
        fontSize: 20,
        fontWeight: "bold",
        },
    });



type AccountExportedViewProps =
    {
    onBurgerPressed : () => any;
    };

export function AccountExportedView(props : AccountExportedViewProps) : JSX.Element
    {
    const walletNavigation = useNavigation<StackNavigationProp<any>>();
    const am = MC.getMC().storage.accountManager;
    const wif = am.current.wm.wallet.toWIF();
    const fontStyle = Platform.OS === "ios" ? accountExportedStyles.wifTextIos : accountExportedStyles.wifTextAndroid;

    return (
        <View style={ commonStyles.containingView }>
            <TitleBar title="Account WIF" onBurgerPressed={ props.onBurgerPressed }/>
            <View style={ commonStyles.horizontalBar }/>
            <View style={ commonStyles.squeezed }>
                <View style={{ height: 24 }} />
                <DoubleDoublet titleL="Account:" textL={ am.current.accountName } titleR="Network:" textR={ am.current.wm.ninfo.name } />
                <View style={{ height: 7 }} />
                <SimpleDoublet title="Address:" text={ am.current.wm.address }/>
                <View style={{ height: 16 }}/>
                <Text>WIF:</Text>
                <View style={ accountExportedStyles.wif }>
                    <Text style={ fontStyle }>{ wif }</Text>
                </View>
                <View style={{ height: 24 }} />
                <SimpleButton text="Copy To Clipboard" icon = "content-copy" onPress = { () : void => Clipboard.setString(wif) } />
                <View style={{ height: 24 }}/>
                <SimpleButton onPress={ () : void => walletNavigation.navigate(WALLET_SCREENS.ACCOUNT_HOME) } text="Account Home"/>
            </View>
        </View>
        );
    }