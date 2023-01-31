import React, { useRef, useState } from "react";
import { View, TextInput, NativeSyntheticEvent, TextInputEndEditingEventData, Image, useWindowDimensions, GestureResponderEvent, Keyboard } from "react-native";
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { MC } from "../mc";
import { WALLET_SCREENS } from "./WalletView";
import { WorkFunctionResult } from "./MainView";
import { commonStyles, InvalidMessage, SimpleButton, SimpleTextInput, TitleBar } from "./common";
import { Insight } from "metrixjs-wallet";



const IMG_SOURCE : string = "../img/metrimask_big.png";
const IMG_HEIGHT : number = 494;
const IMG_WIDTH  : number = 576;

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

    const layout = useWindowDimensions();

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

    function onGeneralTouch(evt : GestureResponderEvent) : boolean
        {
        Keyboard.dismiss();
        clearInvalidPassword();
        return true;
        }

    function clearInvalidPassword() : void
        {
        invalidPasswordNonce++;
        if (invalidPassword) setInvalidPassword(false);
        }

    function renderPasswordInput() : JSX.Element
        {
        function setPasswordAndClearInvalid(txt : string) : void
            {
            setPassword(txt);
            clearInvalidPassword();
            }

        function setSecure(beSecure : boolean) : void
            {
            if (beSecure == useSecureInput) return;
            if (beSecure && password != "") setPassword("");
            setUseSecureInput(beSecure);
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

    function renderInvalidPassword() : JSX.Element | null
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
            return null;
        }

    function ImageSection() : JSX.Element
        {
        const WIDTH = layout.width/2;
        const HEIGHT = (IMG_HEIGHT*WIDTH)/IMG_WIDTH;

        return (
            <View style={{ flexDirection: "row", width: "100%" }}>
                <View style={{ flex: 100 }}/>
                <Image source={ require(IMG_SOURCE) } resizeMode="stretch" style={{ width: WIDTH, height: HEIGHT, margin: 0, padding: 0 }} />
                <View style={{ flex: 100 }}/>
            </View>
            );
        }

    return (
        <View style={ commonStyles.containingView } onStartShouldSetResponder={ onGeneralTouch }>
            <TitleBar title="Unlock Wallet" onBurgerPressed={ onBurgerPressed }/>
            <View style={ commonStyles.horizontalBar }/>
            <View style={{ flex: 100 }}/>
            <ImageSection/>
            <View style={{ flex: 100 }}/>
            <View style={ commonStyles.squeezed }>
                { renderPasswordInput() }
                <View style={{ height: 24 }}/>
                <SimpleButton text="Unlock Wallet" onPress = { () => { login(); } }/>
                { renderInvalidPassword() }
            </View>
            <View style={{ flex: 400 }}/>
            <View style={ commonStyles.squeezed }>
                <SimpleButton text="Reset Metrimask" onPress = { () => { resetApp(); } }/>
            </View>
            <View style={{ height: 24 }}/>
        </View>
        );
    }
