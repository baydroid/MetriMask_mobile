import React from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { MC } from "../mc";
import { WALLET_SCREENS } from "./WalletView";
import { commonStyles, TitleBar, SimpleButton } from "./common";
import { AccountManager } from "../AccountManager";



const resetAppStyles = StyleSheet.create
    ({
    warning:
        {
        marginLeft: 24,
        marginRight: 24,
        padding: 12,
        backgroundColor: "#FF0000",
        },
    warningTitle:
        {
        fontSize: 24,
        fontWeight: "bold",
        color: "#FFFFFF",
        paddingTop: 4,
        paddingBottom: 4,
        alignSelf: "center",
        },
    warningText:
        {
        fontWeight: "bold",
        color: "#FFFFFF",
        },
    });



const WARNING_TEXT_1 = "Resetting metrimask erases all wallets.";
const WARNING_TEXT_2 = "After a reset MetriMask will NOT be able to access any of its Metrix accounts. Only reset this app if you're prepared to lose access to all of its accounts, or can regain access by other means (such as knowing the account's mnemonic or WIF).";



export type ResetAppViewProps =
    {
    onBurgerPressed : () => any;
    };

export function ResetAppView(props : ResetAppViewProps) : JSX.Element
    {
    const walletNavigation = useNavigation<StackNavigationProp<any>>();

    function askThenReset() : void
        {
        Alert.alert("Reset MetriMask", "Are you sure you want to reset MetriMask?",
            [
            { text: "Cancel", style: "cancel", onPress: cancel   },
            { text: "Reset Metrimask",         onPress: resetApp }
            ]);
        }

    function resetApp() : void
        {
        MC.getMC().storage.accountManager = new AccountManager();
        walletNavigation.navigate(WALLET_SCREENS.CREATE_ACCOUNT);
        }

    function cancel() : void
        {
        walletNavigation.navigate(WALLET_SCREENS.LOGIN);
        }

    return (
        <View style={ commonStyles.containingView }>
            <TitleBar title="Reset MetriMask?" onBurgerPressed={ props.onBurgerPressed }/>
            <View style={ commonStyles.horizontalBar }/>
            <View style={ commonStyles.squeezed }>
                <View style={{ height: 48 }} />
                <View style={ resetAppStyles.warning }>
                    <Text style={ resetAppStyles.warningTitle }>WARNING</Text>
                    <View style={{ height: 8 }} />
                    <Text style={ resetAppStyles.warningText }>{ WARNING_TEXT_1 }</Text>
                    <View style={{ height: 8 }} />
                    <Text style={ resetAppStyles.warningText }>{ WARNING_TEXT_2 }</Text>
                </View>
                <View style={{ height: 48 }} />
                <SimpleButton text="Reset MetriMask" onPress={ askThenReset }/>
                <View style={{ height: 24 }} />
                <SimpleButton text="Cancel" onPress={ cancel }/>
            </View>
        </View>
        );
    }
