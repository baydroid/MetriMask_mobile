import React, { useRef, useState } from "react";
import { Text, View, TextInput,} from "react-native";
import { useNavigation } from '@react-navigation/native';
import DropDownPicker, { ItemType, ValueType} from 'react-native-dropdown-picker';
import { StackNavigationProp } from "@react-navigation/stack";

import { MC } from "../mc";
import { nim } from "../NetInfo";
import { WALLET_SCREENS } from "./WalletView";
import { WorkFunctionResult } from "./MainView";
import { NET_ID } from "../NetInfo";
import { commonStyles, SimpleTextInput, TitleBar, SimpleButton, InvalidMessage } from "./common";



const NAME_EMPTY_ERROR         = "The name cannot be empty";
const NAME_IN_USE_ERROR        = "The name is already used.";
const PASSWORD_TOO_SHORT_ERROR = "The password must be at least 8 characteds long."
const CONFIRM_PASSWORD_ERROR   = "The password and the conform passwaord are different.";



type CreateAccountViewProps =
    {
    showWorking     : (workFunction : () => WorkFunctionResult) => void;
    onBurgerPressed : () => any;
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
    const am = MC.getMC().storage.accountManager;

    function createNew() : void
        {
        if (validateInput())
            {
            props.showWorking(() : WorkFunctionResult =>
                {
                if (!am.isLoggedIn) am.providePassword(password);
                const mnemonic = am.createNewAccount(name, networkDDValue as number);
                return { nextScreen: WALLET_SCREENS.ACCOUNT_CREATED, nextScreenParams: { mnemonic } };
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
        return validateName() && (am.isLoggedIn ||  validatePassword());
        }

    function validateName() : boolean
        {
        if (!name.length)
            {
            setErrorMsg(NAME_EMPTY_ERROR);
            return false;
            }
        else if (am.hasAccount(name))
            {
            setErrorMsg(NAME_IN_USE_ERROR);
            return false;
            }
        return true;
        }

    function validatePassword() : boolean
        {
        if (password.length < 8)
            {
            setErrorMsg(PASSWORD_TOO_SHORT_ERROR);
            return false;
            }
        else if (useSecureInput && password != confirmPassword)
            {
            setErrorMsg(CONFIRM_PASSWORD_ERROR);
            return false;
            }
        return true;
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

    function renderPasswordInput() : JSX.Element | null
        {
        function setSecure(secureInput : boolean) : void
            {
            securePasswordRef.current?.clear();
            confirmPasswordRef.current?.clear();
            plainPasswordRef.current?.clear();
            setPassword("");
            setConfirmPassword("");
            setUseSecureInput(secureInput);
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
                        rnRef={ securePasswordRef }
                        secureTextEntry
                        icon="eye"
                        onPressIcon={ () => setSecure(false) }/>
                    <View style={{ height: 24 }}/>
                    <SimpleTextInput
                        label="Confirm Password"
                        value={ confirmPassword }
                        onChangeText={ (txt : string) : void => setConfirmPassword(txt) }
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
                        rnRef={ plainPasswordRef }
                        icon="eye-off"
                        onPressIcon={ () => setSecure(true) }/>
                </>
                );
            }
        }

    return (
        <View style = { commonStyles.containingView }>
            <TitleBar title="Add Account" onBurgerPressed={ props.onBurgerPressed }/>
            <View style={ commonStyles.horizontalBar }/>
            <View style={{ height: 24 }}/>
            <View style={ commonStyles.squeezed }>
                <Text>Account Network:</Text>
                <DropDownPicker
                    dropDownContainerStyle={{ borderColor: "#900090" }}
                    style={{ borderColor: "#900090" }}
                    items = { networkDDItems }
                    open = { networkDDOpen }
                    value = { networkDDValue }
                    setOpen = { setNetworkDDOpen }
                    setValue = { setNetworkDDValue }
                    setItems = { setNetworkDDItems }/>
                <View style={{ height: 24 }}/>
                <SimpleTextInput label = "Account Name" value = { name } onChangeText = { (txt : string) : void => { setName(txt) } }/>
                { renderPasswordInput() }
                <View style={{ height: 24 }}/>
                <SimpleButton text="Create New Account" onPress = { createNew }/>
                <View style={{ height: 24 }}/>
                <SimpleButton text="Import Mnemonic" onPress = { importByMnemonic }/>
                <View style={{ height: 24 }}/>
                <SimpleButton text="Import WIF Private Key" onPress = { importByWIF }/>
                { renderErrorMessage() }
            </View>
        </View>
        );
    }