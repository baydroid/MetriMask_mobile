import React, { useState } from "react";
import { View, Text, ScrollView, GestureResponderEvent, Keyboard } from "react-native";

import { DEFAULT_GAS_LIMIT, DEFAULT_GAS_PRICE_SATOSHI, MC, MRX_DECIMALS } from "../mc";
import { commonStyles, SimpleDoublet, DoubleDoublet, formatSatoshi, BurgerlessTitleBar, SimpleButtonPair, SimpleTextInputPair, SimpleTextInput, validateAndSatoshizeFloatStr, validateIntStr, InvalidMessage, AddressQuasiDoublet, COLOR_BLACK, COLOR_MIDDLE_GREY } from "./common";
import { ContractCallParams } from "../WalletManager"



const AMOUNT_NOT_NUMBER_ERROR    = "The amount must be a number.";
const GAS_LIMIT_NOT_NUMBER_ERROR = "The gas limit must be a number greater than 0.";
const GAS_PRICE_NOT_NUMBER_ERROR = "The gas price must be a number greater than 0.";



export type PermissionToSendViewProps =
    {
    nonce                      : number;
    requestingURL              : string;
    params                     : ContractCallParams;
    onSendingPermittedDecision : (permittedToSend : boolean, amountSat : string, gasLimit : number, gasPriceSat : number) => any;
    };

let lastNonce = 0;

export function PermissionToSendView(props : PermissionToSendViewProps) : JSX.Element
    {
    const am = MC.getMC().storage.accountManager;
    const contractAddr : string = props.params.args[0];

    const [ amountStr, setAmountStr ] = useState<string>((props.params.args[2] || 0).toString());
    const [ gasPriceStr, setGasPriceStr ] = useState<string>((props.params.args[4] || DEFAULT_GAS_PRICE_SATOSHI).toString());
    const [ gasLimitStr, setGasLimitStr ] = useState<string>((props.params.args[3] || DEFAULT_GAS_LIMIT).toString());
    const [ errorMessage, setErrorMessage ] = useState<string>("");

    if (props.nonce != lastNonce)
        {
        lastNonce = props.nonce;
        const newAmountStr = (props.params.args[2] || 0).toString();
        if (amountStr != newAmountStr) setAmountStr(newAmountStr);
        const newGasPriceStr = (props.params.args[4] || DEFAULT_GAS_PRICE_SATOSHI).toString();
        if (newGasPriceStr != gasPriceStr) setGasPriceStr(newGasPriceStr);
        const newGasLimitStr = (props.params.args[3] || DEFAULT_GAS_LIMIT).toString();
        if (newGasLimitStr != gasLimitStr) setGasLimitStr(newGasLimitStr);
        }
    const maxTxFee : number = Math.round(1000*parseInt(gasLimitStr)*parseInt(gasPriceStr)/1e11);

    function onSend() : void
        {
        const amountToSendStr = validateAndSatoshizeFloatStr(amountStr, MRX_DECIMALS);
        if (!amountToSendStr.length)
            {
            setErrorMessage(AMOUNT_NOT_NUMBER_ERROR);
            return;
            }
        let gasLimit : number;
        if (gasLimitStr != "")
            {
            if (!validateIntStr(gasLimitStr, true))
                {
                setErrorMessage(GAS_LIMIT_NOT_NUMBER_ERROR);
                return;
                }
            gasLimit = Number.parseInt(gasLimitStr);
            }
        else
            gasLimit = DEFAULT_GAS_LIMIT;
        let gasPrice : number;
        if (gasPriceStr != "")
            {
            if (!validateIntStr(gasPriceStr, true))
                {
                setErrorMessage(GAS_PRICE_NOT_NUMBER_ERROR);
                return;
                }
            gasPrice = Number.parseInt(gasPriceStr);
            }
        else
            gasPrice = DEFAULT_GAS_PRICE_SATOSHI;
        clearError();
        props.onSendingPermittedDecision(true, amountToSendStr, gasLimit, gasPrice);
        }

    function onChangeAmount(newAmountStr : string) : void
        {
        clearError();
        setAmountStr(newAmountStr.trim());
        }

    function onChangeGasLimit(newGasLimitStr : string) : void
        {
        clearError();
        setGasLimitStr(newGasLimitStr.trim());
        }

    function onChangeGasPrice(newGasPriceStr : string) : void
        {
        clearError();
        setGasPriceStr(newGasPriceStr.trim());
        }

    function onGeneralTouch(evt : GestureResponderEvent) : boolean
        {
        Keyboard.dismiss();
        clearError();
        return true;
        }

    function clearError() : void
        {
        if (errorMessage.length) setErrorMessage("");
        }

    function renderErrorMessage() : JSX.Element | null
        {
        if (errorMessage.length)
            {
            return (
                <>
                    <View style={{ height: 24 }}/>
                    <InvalidMessage text={ errorMessage } />
                </>
                );
            }
        else
            return null;
        }

    return (
        <View style={ commonStyles.containingView } onStartShouldSetResponder={ onGeneralTouch }>
            <BurgerlessTitleBar title="Permission to Transact?"/>
            <View style={ commonStyles.horizontalBar }/>
            <View style={{ ...commonStyles.squeezed, flexDirection: "column", flex: 1 }}>
                <View style={{ height: 24 }} />
                <Text style={{ color: COLOR_BLACK }}>A web page is asking your permission to send a transaction to a contract.</Text>
                <View style={{ height: 24 }} />
                <DoubleDoublet titleL="Sending Account:" textL={ am.current.accountName } titleR="Network:" textR={ am.current.wm.ninfo.name } />
                <View style={{ height: 7 }} />
                <AddressQuasiDoublet title="Sending Account Address:" acnt={ am.current }/>
                <View style={{ height: 7 }} />
                <SimpleDoublet title="Sending Account Balance:" text={ formatSatoshi(am.current.wm.balanceSat, MRX_DECIMALS) + " MRX" }/>
                <View style={{ height: 7 }} />
                <SimpleDoublet title="Webpage Requesting to Send:" text={ props.requestingURL }/>
                <View style={{ height: 7 }} />
                <SimpleDoublet title="Contract Address:" text={ contractAddr }/>
                <View style={{ height: 7 }} />
                <SimpleTextInput label="Amount to Send (MRX):" keyboardType="numeric" value={ amountStr } onChangeText={ onChangeAmount }/>
                <View style={{ height: 7 }} />
                <SimpleTextInputPair
                    left={{ label: "Gas Limit", value: gasLimitStr, onChangeText: onChangeGasLimit, keyboardType: "numeric" }}
                    right={{ label: "Gas Price (Sat)", value: gasPriceStr, onChangeText: onChangeGasPrice, keyboardType: "numeric" }}/>
                <View style={{ height: 7 }} />
                <SimpleDoublet title="Max Transaction Fee:" text={ maxTxFee.toString() + " MRX" }/>
                <View style={{ height: 7 }} />
                <Text style={{ color: COLOR_MIDDLE_GREY}}>Raw Contract Call:</Text>
                <View style={{ height: 1 }} />
                <ScrollView style={ commonStyles.borderedScroller }>
                    <Text style={{ color: COLOR_BLACK }}>{ props.params.args[1] }</Text>
                </ScrollView>
                <View style={{ height: 24 }} />
                <SimpleButtonPair
                    left={{ text: "Cancel", onPress: () : void => props.onSendingPermittedDecision(false, "0", 0, 0) }}
                    right={{ text: "Send", onPress: onSend }}/>
                { renderErrorMessage() }
                <View style={{ height: 24 }} />
            </View>
        </View>
        );
    }
