import React, { useRef, useState } from "react";
import { Text, View, TextInput, Keyboard, GestureResponderEvent } from "react-native";
import { useNavigation } from '@react-navigation/native';
import DropDownPicker, { ItemType, ValueType} from 'react-native-dropdown-picker';
import { StackNavigationProp } from "@react-navigation/stack";

import { MC } from "../mc";
import { nim } from "../NetInfo";
import { WALLET_SCREENS } from "./WalletView";
import { WorkFunctionResult } from "./MainView";
import { NET_ID } from "../NetInfo";
import { commonStyles, SimpleTextInput, TitleBar, SimpleButton, InvalidMessage, COLOR_DARKISH_PURPLE, COLOR_MIDDLE_GREY } from "./common";
import { Insight } from "metrixjs-wallet";



const NAME_EMPTY_ERROR         = "The name cannot be empty";
const NAME_IN_USE_ERROR        = "The name is already used.";
const PASSWORD_TOO_SHORT_ERROR = "The password must be at least 8 characteds long."
const CONFIRM_PASSWORD_ERROR   = "The password and the conform passwaord are different.";



type CreateAccountViewProps =
    {
    showWorkingAsync : (asyncWorkFunction : (onWorkDone : (result : WorkFunctionResult) => void) => any) => void;
    onBurgerPressed  : () => any;
    };

export function CreateAccountView(props : CreateAccountViewProps) : JSX.Element
    {
    const [ useSecureInput, setUseSecureInput ] = useState<boolean>(true);
    const [ password, setPassword ] = useState<string>("");
    const [ confirmPassword, setConfirmPassword ] = useState<string>("");
    const [ name, setName ] = useState<string>("");
    const [ errorMsg, setErrorMsg ] = useState<string>("");
    const [ networkDDOpen, setNetworkDDOpen ] = useState<boolean>(false);
    const [ networkDDValue, setNetworkDDValue ] = useState<ValueType | null>(NET_ID.MAIN);
    const [ networkDDItems, setNetworkDDItems ] = useState<ItemType<number>[]>(nim().netInfoDropDownItems);

    const securePasswordRef = useRef<TextInput>(null);
    const confirmPasswordRef = useRef<TextInput>(null);
    const plainPasswordRef = useRef<TextInput>(null);

    const walletNavigation = useNavigation<StackNavigationProp<any>>();
    const mc = MC.getMC();
    const am = mc.storage.accountManager;

    function onBurgerPressed() : void
        {
        clearErrorCondition();
        props.onBurgerPressed();
        }

    function createNew() : void
        {
        if (validateInput())
            {
            props.showWorkingAsync((onWorkDone : (result : WorkFunctionResult) => void) : void =>
                {
                if (!am.isLoggedIn) am.providePassword(password);
                const mnemonic : string = am.createNewAccount(name, networkDDValue as number);
                if (!mnemonic.length) MC.raiseError(`Attempt to create an account with an already existing name.`, `CreateAccountView createNew() 1`);
                am.current.finishLoad().then((info : Insight.IGetInfo | null) : void =>
                    {
                    onWorkDone({ nextScreen: WALLET_SCREENS.ACCOUNT_CREATED, nextScreenParams: { mnemonic } });
                    })
                .catch((e : any) : void =>
                    {
                    MC.raiseError(e, `CreateAccountView createNew() 2`);
                    });
                });
            }
        }

    function importByWIF() : void
        {
        if (validateInput())
            {
            const importProps = am.isLoggedIn ? { name: name, netId: networkDDValue, byWWIFNotMnemonic: true } : { name: name, netId: networkDDValue, byWWIFNotMnemonic: true, password: password };
            walletNavigation.navigate(WALLET_SCREENS.IMPORT_ACCOUNT, importProps);
            }
        }

    function importByMnemonic() : void
        {
        if (validateInput())
            {
            const importProps = am.isLoggedIn ? { name: name, netId: networkDDValue, byWWIFNotMnemonic: false } : { name: name, netId: networkDDValue, byWWIFNotMnemonic: false, password: password };
            walletNavigation.navigate(WALLET_SCREENS.IMPORT_ACCOUNT, importProps);
            }
        }

    function validateInput() : boolean
        {
        setNetworkDDOpen(false);
        clearErrorCondition();
        return validateName() && (am.isLoggedIn ||  validatePassword());
        }

    function validateName() : boolean
        {
        if (!name.length)
            {
            setErrorCondition(NAME_EMPTY_ERROR);
            return false;
            }
        else if (am.hasAccount(name))
            {
            setErrorCondition(NAME_IN_USE_ERROR);
            return false;
            }
        return true;
        }

    function validatePassword() : boolean
        {
        if (password.length < 8)
            {
            setErrorCondition(PASSWORD_TOO_SHORT_ERROR);
            return false;
            }
        else if (useSecureInput && password != confirmPassword)
            {
            setErrorCondition(CONFIRM_PASSWORD_ERROR);
            return false;
            }
        return true;
        }

    function setErrorCondition(errMsg : string) : void
        {
        setNetworkDDOpen(false);
        Keyboard.dismiss();
        setErrorMsg(errMsg);
        }

    function clearErrorCondition() : void
        {
        if (networkDDOpen) setNetworkDDOpen(false);
        if (errorMsg != "") setErrorMsg("");
        }

    function onGeneralTouch(evt : GestureResponderEvent) : boolean
        {
        Keyboard.dismiss();
        clearErrorCondition();
        return true;
        }

    function renderPasswordInput() : JSX.Element | null
        {
        function setSecure(beSecure : boolean) : void
            {
            if (beSecure == useSecureInput) return;
            if (beSecure && password != "") setPassword("");
            setUseSecureInput(beSecure);
            }

        if (am.isLoggedIn)
            return null;
        else if (useSecureInput)
            {
            return (
                <>
                    <View style={{ height: 24 }}/>
                    <SimpleTextInput
                        label="Set Password"
                        value={ password }
                        onChangeText={ (txt : string) : void => setPassword(txt) }
                        onFocus={ clearErrorCondition }
                        rnRef={ securePasswordRef }
                        secureTextEntry
                        icon="eye"
                        onPressIcon={ () => setSecure(false) }/>
                    <View style={{ height: 24 }}/>
                    <SimpleTextInput
                        label="Confirm Password"
                        value={ confirmPassword }
                        onChangeText={ (txt : string) : void => setConfirmPassword(txt) }
                        onFocus={ clearErrorCondition }
                        rnRef={ confirmPasswordRef }
                        secureTextEntry
                        icon="eye"
                        onPressIcon={ () => setSecure(false) }/>
                </>
                );
            }
        else
            {
            return (
                <>
                    <View style={{ height: 24 }}/>
                    <SimpleTextInput
                        label="Set Password"
                        value={ password }
                        onChangeText={ (txt : string) : void => setPassword(txt) }
                        onFocus={ clearErrorCondition }
                        rnRef={ plainPasswordRef }
                        icon="eye-off"
                        onPressIcon={ () => setSecure(true) }/>
                </>
                );
            }
        }

    function ActionButtons() : JSX.Element
        {
        return (
            <>
                <SimpleButton text="Create New Account" onPress = { createNew }/>
                <View style={{ height: 24 }}/>
                <SimpleButton text="Import Mnemonic" onPress = { importByMnemonic }/>
                <View style={{ height: 24 }}/>
                <SimpleButton text="Import WIF Private Key" onPress = { importByWIF }/>
            </>
            );
        }

    function BottomOfScreen() : JSX.Element
        {
        if (errorMsg.length)
            {
            if (am.isLoggedIn)
                return (
                    <>
                        <ActionButtons/>
                        <View style={{ height: 24 }}/>
                        <InvalidMessage text={ errorMsg }/>
                    </>
                    );
            else
                return (<InvalidMessage text={ errorMsg }/>);
            }
        else
            return (<ActionButtons/>);
        }

    return (
        <View style={ commonStyles.containingView } onStartShouldSetResponder={ onGeneralTouch }>
            <TitleBar title="Add Account" onBurgerPressed={ onBurgerPressed }/>
            <View style={ commonStyles.horizontalBar }/>
            <View style={{ height: 24 }}/>
            <View style={ commonStyles.squeezed }>
                <Text style={{ color: COLOR_MIDDLE_GREY}}>Account Network:</Text>
                <DropDownPicker
                    dropDownContainerStyle={{ borderColor: COLOR_DARKISH_PURPLE }}
                    style={{ borderColor: COLOR_DARKISH_PURPLE }}
                    onOpen={ () : void => setErrorMsg("") }
                    onClose={ () : void => setErrorMsg("") }
                    onSelectItem={ () : void => setErrorMsg("") }
                    items = { networkDDItems }
                    open = { networkDDOpen }
                    value = { networkDDValue }
                    setOpen = { setNetworkDDOpen }
                    setValue = { setNetworkDDValue }
                    setItems = { setNetworkDDItems }/>
                <View style={{ height: 24 }}/>
                <SimpleTextInput label = "Account Name" value = { name } onFocus={ clearErrorCondition } onChangeText = { (txt : string) : void => { setName(txt) } }/>
                { renderPasswordInput() }
                <View style={{ height: 24 }}/>
                <BottomOfScreen/>
            </View>
        </View>
        );
    }
