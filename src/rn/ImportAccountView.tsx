import React, { useState } from "react";
import { View } from "react-native";

import { MC } from "../mc";
import { WALLET_SCREENS } from "./WalletView";
import { WorkFunctionResult } from "./MainView";
import { commonStyles, InvalidMessage, TitleBar, SimpleButton, SimpleTextInput, DoubleDoublet } from "./common";
import { AccountManager } from "../AccountManager";
import { nim } from "../NetInfo";



const EMPTY_WIF_ERROR        = "The WIF field can't be empty.";
const INVALID_WIF_ERROR      = "The WIF is invalid.";
const EMPTY_MNEMONIC_ERROR   = "The Mnemonic field can't be empty.";
const INVALID_MNEMONIC_ERROR = "The mnemonic is invalid.";



export type ImportAccountViewProps =
    {
    name              : string;
    netId             : number;
    password?         : string;
    byWWIFNotMnemonic : boolean;
    showWorking       : (workFunction : () => WorkFunctionResult) => void;
    onBurgerPressed   : () => any;
    };

let pendingErrorMsg : string = "";

export function ImportAccountView(props : ImportAccountViewProps) : JSX.Element
    {
    const [ param, setParam ] = useState<string>("");
    const [ errorMsg, setErrorMsg ] = useState<string>("");

    const am : AccountManager = MC.getMC().storage.accountManager;
    const netName : string = nim().fromId(props.netId).name;

    if (pendingErrorMsg != "")
        {
        setErrorMsg(pendingErrorMsg);
        pendingErrorMsg = "";
        }

    function importAccount() : void
        {
        clearError();
        if (validateInput())
            {
            props.showWorking(() : WorkFunctionResult =>
                {
                if (props.password) am.providePassword(props.password);
                let ok : boolean;
                if (props.byWWIFNotMnemonic)
                    ok = am.importByWIF(props.name, props.netId, param);
                else
                    ok = am.importByMnemonic(props.name, props.netId, param);
                if (ok)
                    return { nextScreen: WALLET_SCREENS.ACCOUNT_HOME };
                else
                    {
                    pendingErrorMsg = props.byWWIFNotMnemonic ? INVALID_WIF_ERROR : INVALID_MNEMONIC_ERROR;
                    return { nextScreen: WALLET_SCREENS.IMPORT_ACCOUNT, nextScreenParams: { name: props.name, netId: props.netId, byWWIFNotMnemonic: props.byWWIFNotMnemonic } };
                    }
                });
            }
        }

    function validateInput() : boolean
        {
        if (!param.length)
            {
            if (props.byWWIFNotMnemonic)
                {
                setErrorMsg(EMPTY_WIF_ERROR);
                return false;
                }
            else
                {
                setErrorMsg(EMPTY_MNEMONIC_ERROR);
                return false;
                }
            }
        return true;
        }

    function onBurgerPressed() : void
        {
        clearError();
        props.onBurgerPressed();
        }

    function onChangeWIF(newWIF : string) : void
        {
        clearError();
        setParam(newWIF.trim())
        }

    function onChangeMnemonic(newMnemonic : string) : void
        {
        clearError();
        setParam(newMnemonic);
        }

    function clearError() : void
        {
        if (errorMsg.length) setErrorMsg("");
        }

    function renderErrorMessage() : JSX.Element | null
        {
        if (errorMsg.length)
            {
            return (
                <>
                    <View style={{ height: 24 }}/>
                    <InvalidMessage text={ errorMsg } />
                </>
                );
            }
        else
            return null;
        }

    function renderParamInput() : JSX.Element
        {
        if (props.byWWIFNotMnemonic)
            {
            return (
                <SimpleTextInput
                    label="WIF (Private Key)"
                    value={ param }
                    onChangeText={ onChangeWIF }/>
                );
            }
        else
            {
            return (
                <SimpleTextInput
                    label="Mnemonic"
                    value={ param }
                    onChangeText={ onChangeMnemonic }
                    multiline={ true }
                    textAlignVertical="top"/>
                );
            }
        }

    return (
        <View style={ commonStyles.containingView }>
            <TitleBar title="Import Account" onBurgerPressed={ onBurgerPressed }/>
            <View style={ commonStyles.horizontalBar }/>
            <View style={ commonStyles.squeezed }>
                <View style={{ height: 24 }}/>
                <DoubleDoublet titleL="Import to::" textL={ props.name } titleR="Network:" textR={ netName }/>
                <View style={{ height: 24 }}/>
                { renderParamInput() }
                <View style={{ height: 24 }}/>
                <SimpleButton text="Import" onPress={ importAccount }/>
                { renderErrorMessage() }
            </View>
        </View>
        );
    }
