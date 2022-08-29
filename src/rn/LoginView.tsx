import React, { useRef, useState } from "react";
import { View, TextInput, NativeSyntheticEvent, TextInputEndEditingEventData, Image } from "react-native";
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { MC } from "../mc";
import { WALLET_SCREENS } from "./WalletView";
import { WorkFunctionResult } from "./MainView";
import { commonStyles, InvalidMessage, SimpleButton, SimpleTextInput, TitleBar } from "./common";
import { Insight } from "metrixjs-wallet";



type LoginViewProps =
    {
    loginFailure?    : number;
    onBurgerPressed  : () => any;
    showWorkingAsync : (asyncWorkFunction : (onWorkDone : (result : WorkFunctionResult) => void) => any) => void;
    };

let invalidPasswordNonce : number = 1;
let loginUnderway : boolean = false;

export function LoginView(props : LoginViewProps) : JSX.Element
    {
    const [ useSecureInput, setUseSecureInput ] = useState<boolean>(true);
    const [ password, setPassword ] = useState<string>("");
    const [ invalidPassword, setInvalidPassword ] = useState<boolean>(false);

    const securePasswordRef = useRef<TextInput>(null);
    const plainPasswordRef = useRef<TextInput>(null);

    const walletNavigation = useNavigation<StackNavigationProp<any>>();

    if (props.loginFailure == invalidPasswordNonce && !invalidPassword) setInvalidPassword(true);
    
    function login() : void
        {
        if (loginUnderway) return;
        if (!password.length)
            setInvalidPassword(true);
        else
            {
            loginUnderway = true;
            clearInvalidPassword();
            props.showWorkingAsync((onWorkDone : (result : WorkFunctionResult) => void) : void =>
                {
                const am = MC.getMC().storage.accountManager;
                am.providePassword(password);
                const loggedInOK : boolean = am.login();
                if (loggedInOK)
                    {
                    am.current.finishLoad().then((info : Insight.IGetInfo | null) : void =>
                        {
                        loginUnderway = false;
                        onWorkDone({ nextScreen: WALLET_SCREENS.ACCOUNT_HOME });
                        })
                    .catch((e : any) : void =>
                        {
                        MC.raiseError(e, `LoginView login()`);
                        });
                    }
                else
                    {
                    const result : WorkFunctionResult = { nextScreen: WALLET_SCREENS.LOGIN, nextScreenParams: { loginFailure: invalidPasswordNonce } };
                    setTimeout(() : void => { loginUnderway = false; onWorkDone(result); }, 0);
                    }
                });
            }
        }

    function resetApp() : void 
        {
        walletNavigation.navigate(WALLET_SCREENS.RESET_APP);
        }

    function onEndEditintgPassword(wvEvent : NativeSyntheticEvent<TextInputEndEditingEventData>) : void
        {
        login();
        }

    function onBurgerPressed() : void
        {
        clearInvalidPassword();
        props.onBurgerPressed();
        }

    function clearInvalidPassword() : void
        {
        invalidPasswordNonce++;
        if (invalidPassword) setInvalidPassword(false);
        }

    function renderPasswordInput() : JSX.Element
        {
        function setSecure(secureInput : boolean) : void
            {
            securePasswordRef.current?.clear();
            plainPasswordRef.current?.clear();
            setPassword("");
            setUseSecureInput(secureInput);
            clearInvalidPassword();
            }

        function setPasswordAndClearInvalid(txt : string) : void
            {
            setPassword(txt);
            clearInvalidPassword();
            }

        if (useSecureInput)
            {
            return (
                <SimpleTextInput
                    label="Password"
                    value={ password }
                    onFocus={ clearInvalidPassword }
                    onChangeText={ setPasswordAndClearInvalid }
                    onEndEditing={ onEndEditintgPassword }
                    rnRef={ securePasswordRef }
                    secureTextEntry
                    icon="eye"
                    onPressIcon={ (): void => setSecure(false) }/>
                );
            }
        else
            {
            return (
                <SimpleTextInput
                    label="Password"
                    value={ password }
                    onFocus={ clearInvalidPassword }
                    onChangeText={ setPasswordAndClearInvalid }
                    onEndEditing={ onEndEditintgPassword }
                    rnRef={ plainPasswordRef }
                    icon="eye-off"
                    onPressIcon={ (): void => setSecure(true) }/>
                );
            }
        }

    function GraphicOrInvalidPassword() : JSX.Element | null
        {
        if (invalidPassword)
            {
            return (
                <>
                    <View style = { { height: 24 } } />
                    <InvalidMessage text="Invalid Password" />
                    <View style={{ height: 73 }}/>
                </>
                );
            }
        else
            return (
                    <View style={{ flexDirection: "row", width: "100%" }}>
                        <View style={{ flex: 1 }}/>
                        <Image source={ require("../img/metrimask.png") } resizeMode="center" style={{ margin: 0, padding: 0 }} />
                        <View style={{ flex: 1 }}/>
                    </View>
                );
        }

    return (
        <View style = { commonStyles.containingView }>
            <TitleBar title="Unlock Wallet" onBurgerPressed={ onBurgerPressed }/>
            <View style={ commonStyles.horizontalBar }/>
            <View style={ commonStyles.squeezed }>
                <View style={{ height: 24 }}/>
                { renderPasswordInput() }
                <View style={{ height: 24 }}/>
                <SimpleButton text="Unlock Wallet" onPress = { () => { login(); } }/>
                <GraphicOrInvalidPassword/>
                <SimpleButton text="Reset Metrimask" onPress = { () => { resetApp(); } }/>
            </View>
        </View>
        );
    }
