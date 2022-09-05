import React, { useState } from "react";
import { View } from "react-native";
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { MC } from "../mc";
import { WALLET_SCREENS } from "./WalletView";
import { commonStyles, TitleBar, formatSatoshi, SimpleDoublet, DoubleDoublet, SimpleButtonPair, SimpleTextInputPair, SimpleTextInput, InvalidMessage, validateIntStr, AddressQuasiDoublet } from "./common";
import { MRC20Token, SerializableMRC20Token } from "../MRC20";
import { AccountManager } from "../AccountManager";



const MAX_DECIMALS              : number = 20;
const ERROR_DECIMALS_NOT_NUMBER : string = "The number of decimal places must be a whole number.";
const ERROR_TOO_MANY_DECIMALS   : string = "The number of decimal places must be between 0 and 20.";
const ERROR_EMPTY_NAME          : string = "The name cannot be empty.";
const ERROR_EMPTY_SYMBOL        : string = "The symbol cannot be empty.";



export type AcceptTokenViewSerializableProps =
    {
    token    : SerializableMRC20Token;
    mnsName? : string;
    };

export type AcceptTokenViewProps = AcceptTokenViewSerializableProps &
    {
    onBurgerPressed : () => any;
    };

export function AcceptTokenView(props : AcceptTokenViewProps) : JSX.Element
    {
    const walletNavigation = useNavigation<StackNavigationProp<any>>();
    const am : AccountManager = MC.getMC().storage.accountManager;
    const serializable : SerializableMRC20Token = props.token;

    const [ name, setName ] = useState<string>(serializable.name);
    const [ symbol, setSymbol ] = useState<string>(serializable.symbol);
    const [ decimals, setDecimals ] = useState<string>(serializable.decimals.toString());
    const [ errMsg, setErrMsg ] = useState<string>("");

    if (serializable.decimals < 0) serializable.decimals = 0;

    function onBurgerPressed() : void
        {
        clearErrMsg();
        props.onBurgerPressed();
        }

    function acceptToken() : void
        {
        if (!validateDecimals() || !validateNotEmpty(name, ERROR_EMPTY_NAME) || !validateNotEmpty(symbol, ERROR_EMPTY_SYMBOL)) return;
        clearErrMsg();
        serializable.name = name;
        serializable.symbol = symbol;
        serializable.decimals = Number.parseInt(decimals);
        am.current.tkm.addCandidateToken(MRC20Token.fromSerializable(serializable));
        walletNavigation.navigate(WALLET_SCREENS.ACCOUNT_HOME);
        }

    function cancel() : void
        {
        clearErrMsg();
        walletNavigation.navigate(WALLET_SCREENS.ACCOUNT_HOME);
        }

    function validateDecimals() : boolean
        {
        if (!decimals.length || !validateIntStr(decimals, false))
            {
            if (errMsg != ERROR_DECIMALS_NOT_NUMBER) setErrMsg(ERROR_DECIMALS_NOT_NUMBER);
            return false;
            }
        const d : number = Number.parseInt(decimals);
        if (d > MAX_DECIMALS)
            {
            if (errMsg != ERROR_TOO_MANY_DECIMALS) setErrMsg(ERROR_TOO_MANY_DECIMALS);
            return false;
            }
        if (errMsg == ERROR_DECIMALS_NOT_NUMBER || errMsg == ERROR_TOO_MANY_DECIMALS) setErrMsg("");
        return true;
        }

    function validateNotEmpty(field : string, associatedErrMsg : string) : boolean
        {
        if (!field.trim().length)
            {
            if (errMsg != associatedErrMsg) setErrMsg(associatedErrMsg);
            return false;
            }
        if (errMsg == associatedErrMsg) setErrMsg("");
        return true;
        }

    function clearErrMsg() : void
        {
        if (errMsg.length) setErrMsg("");
        }

    function onChangeName(txt : string) : void
        {
        validateNotEmpty(name, ERROR_EMPTY_NAME);
        setName(txt);
        }

    function onChangeSymbol(txt : string) : void
        {
        validateNotEmpty(symbol, ERROR_EMPTY_SYMBOL);
        setSymbol(txt);
        }

    function onChangeDecimals(txt : string) : void
        {
        validateDecimals();
        setDecimals(txt);
        }

    function renderErrMsg() : JSX.Element | null
        {
        if (errMsg.length)
            {
            return (
                <>
                    <View style={ { height: 72 } } />
                    <InvalidMessage text={ errMsg } />
                </>
                );
            }
        else
            return null;
        }

    return (
        <View style={ commonStyles.containingView }>
            <TitleBar title="Add Token to Wallet?" onBurgerPressed={ onBurgerPressed }/>
            <View style={ commonStyles.horizontalBar }/>
            <View style={ commonStyles.squeezed }>
                <View style={{ height: 24 }} />
                <DoubleDoublet titleL="Account:" textL={ am.current.accountName } titleR="Network:" textR={ am.current.wm.ninfo.name } />
                <View style={{ height: 8 }} />
                <AddressQuasiDoublet title="Token Contract Address:" mnsName={ props.mnsName } address={ serializable.address }/>
                <View style={{ height: 8 }} />
                <SimpleDoublet title="Balance:" text={ formatSatoshi(serializable.balanceSat!, serializable.decimals) }/>
                <View style={{ height: 24 }} />
                <SimpleTextInput label="Token Name" value={ name } onChangeText={ onChangeName } keyboardType="default"/>
                <View style={{ height: 24 }} />
                <SimpleTextInputPair
                    left={{ label: "Symbol", value: symbol, onChangeText: onChangeSymbol, keyboardType: "default" }}
                    right={{ label: "Decimal Places", value: decimals, onChangeText: onChangeDecimals, keyboardType: "numeric" }}/>
                <View style={{ height: 24 }} />
                <SimpleButtonPair left={{ text: "Cancel", onPress: cancel }} right={{ text: "Add Token", onPress: acceptToken }}/>
                { renderErrMsg() }
            </View>
        </View>
        );
    }
