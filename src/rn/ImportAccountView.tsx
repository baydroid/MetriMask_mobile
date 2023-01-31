import React, { useState } from "react";
import { GestureResponderEvent, Keyboard, View } from "react-native";
import { Insight } from "metrixjs-wallet";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

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
    param?            : string;
    errMsg?           : string;
    showWorkingAsync  : (asyncWorkFunction : (onWorkDone : (result : WorkFunctionResult) => void) => any) => void;
    onBurgerPressed   : () => any;
    };

export function ImportAccountView(props : ImportAccountViewProps) : JSX.Element
    {
    const [ param, setParam ] = useState<string>(props.param ? props.param : "");
    const [ errorMsg, setErrorMsg ] = useState<string>(props.errMsg ? props.errMsg : "");

    const walletNavigation = useNavigation<StackNavigationProp<any>>();
    const am : AccountManager = MC.getMC().storage.accountManager;
    const netName : string = nim().fromId(props.netId).name;

    function importAccount() : void
        {
        clearError();
        if (validateInput())
            {
            props.showWorkingAsync((onWorkDone : (result : WorkFunctionResult) => void) : void =>
                {
                if (props.password) am.providePassword(props.password);
                let ok : boolean;
                if (props.byWWIFNotMnemonic)
                    ok = am.importByWIF(props.name, props.netId, param);
                else
                    ok = am.importByMnemonic(props.name, props.netId, param);
                if (ok)
                    {
                    am.current.finishLoad().then((info : Insight.IGetInfo | null) : void =>
                        {
                        onWorkDone({ nextScreen: WALLET_SCREENS.ACCOUNT_HOME });
                        })
                    .catch((e : any) : void =>
                        {
                        MC.raiseError(e, `ImportAccountView importAccount()`);
                        });
                    }
                else
                    {
                    const errMsg = props.byWWIFNotMnemonic ? INVALID_WIF_ERROR : INVALID_MNEMONIC_ERROR;
                    const result : WorkFunctionResult = { nextScreen: WALLET_SCREENS.IMPORT_ACCOUNT, nextScreenParams: { param: param, errMsg: errMsg, name: props.name, netId: props.netId, byWWIFNotMnemonic: props.byWWIFNotMnemonic } };
                    setTimeout(() : void => onWorkDone(result), 0);
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

    function onCancel() : void
        {
        clearError();
        walletNavigation.navigate(WALLET_SCREENS.CREATE_ACCOUNT);
        }

    function onGeneralTouch(evt : GestureResponderEvent) : boolean
        {
        Keyboard.dismiss();
        clearError();
        return true;
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
        <View style={ commonStyles.containingView } onStartShouldSetResponder={ onGeneralTouch }>
            <TitleBar title="Import Account" onBurgerPressed={ onBurgerPressed }/>
            <View style={ commonStyles.horizontalBar }/>
            <View style={ commonStyles.squeezed }>
                <View style={{ height: 24 }}/>
                <DoubleDoublet titleL="Import to::" textL={ props.name } titleR="Network:" textR={ netName }/>
                <View style={{ height: 24 }}/>
                { renderParamInput() }
                <View style={{ height: 24 }}/>
                <SimpleButton text="Import" onPress={ importAccount }/>
                <View style={{ height: 24 }}/>
                <SimpleButton text="Cancel" onPress={ onCancel }/>
                { renderErrorMessage() }
            </View>
        </View>
        );
    }
