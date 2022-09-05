import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { MC } from "../mc";
import { WALLET_SCREENS } from "./WalletView";
import { commonStyles, TitleBar, SimpleButton, COLOR_WHITE, COLOR_RED, COLOR_BLACK, SimpleTextInput } from "./common";
import { AccountManager } from "../AccountManager";



const resetAppStyles = StyleSheet.create
    ({
    warning:
        {
        marginLeft: 24,
        marginRight: 24,
        padding: 12,
        backgroundColor: COLOR_RED,
        },
    warningTitle:
        {
        fontSize: 24,
        fontWeight: "bold",
        color: COLOR_WHITE,
        paddingTop: 4,
        paddingBottom: 4,
        alignSelf: "center",
        },
    warningText:
        {
        fontWeight: "bold",
        color: COLOR_WHITE,
        },
    instructionText:
        {
        color: COLOR_BLACK,
        marginLeft: 24,
        marginRight: 24,
        paddingLeft: 12,
        paddingRight: 12,
        },
    });



const WARNING_TEXT_1   = "Resetting Metrimask erases all wallets.";
const WARNING_TEXT_2   = "After a reset MetriMask will NOT be able to access any of its Metrix accounts. Only reset this app if you're prepared to lose access to all of its accounts, or can regain access by other means (such as knowing the account's mnemonic or WIF).";
const INSTRUCTION_TEXT = "To reset Metrimask type RESET (all caps) into the text entry below, and press the Reset MetriMask button.";



export type ResetAppViewProps =
    {
    onBurgerPressed : () => any;
    };

export function ResetAppView(props : ResetAppViewProps) : JSX.Element
    {
    const [ checkStr, setCheckStr ] = useState<string>("");
    const [ disableReset, setDisableReset ] = useState<boolean>(true);

    const walletNavigation = useNavigation<StackNavigationProp<any>>();

    function resetApp() : void
        {
        MC.getMC().storage.accountManager = new AccountManager();
        walletNavigation.navigate(WALLET_SCREENS.CREATE_ACCOUNT);
        }

    function cancel() : void
        {
        walletNavigation.navigate(WALLET_SCREENS.LOGIN);
        }

    function onChangeCheckStr(txt : string) : void
        {
        setCheckStr(txt);
        if (txt == "RESET")
            {
            if (disableReset) setDisableReset(false);
            }
        else
            {
            if (!disableReset) setDisableReset(true);
            }
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
                <View style={{ height: 24 }} />
                <Text style={ resetAppStyles.instructionText }>{ INSTRUCTION_TEXT }</Text>
                <View style={{ height: 48 }} />
                <SimpleTextInput label="RESET" value={ checkStr } onChangeText={ onChangeCheckStr }/>
                <View style={{ height: 24 }} />
                <SimpleButton text="Reset MetriMask" onPress={ resetApp } disabled={ disableReset }/>
                <View style={{ height: 24 }} />
                <SimpleButton text="Cancel" onPress={ cancel }/>
            </View>
        </View>
        );
    }
