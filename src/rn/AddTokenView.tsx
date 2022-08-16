import React, { useEffect, useState, useRef } from "react";
import { View } from "react-native";
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { MC } from "../mc";
import { WALLET_SCREENS } from "./WalletView";
import { commonStyles, InvalidMessage, SimpleButton, SimpleTextInput, TitleBar } from "./common";
import { MRC20Token } from "../MRC20";
import { QR_SCANNER_TARGETS } from "./QRAddressScanView";



const INVALID_ADDRESS_ERROR = "Address not valid.";
const TOKEN_NOT_FOUND_ERROR = "Address is not a Token."

export type AddTokenViewProps =
    {
    onBurgerPressed : () => any;
    qrScanAddress   : (target : QR_SCANNER_TARGETS, returnScreen : WALLET_SCREENS, onAddressScanned : (address : string) => any) => any;
    };

let isCreating : boolean = false;
let qrScannedAddress : string = "";

export function AddTokenView(props : AddTokenViewProps) : JSX.Element
    {
    const [ address, setAddress ] = useState<string>("");
    const [ errMsg, setErrMsg ] = useState<string>("");
    const isShowing = useRef<boolean>(false);
    const walletNavigation = useNavigation<StackNavigationProp<any>>();

    useEffect(() : (() => void) =>
        {
        isShowing.current = true;
        return () => isShowing.current = false;
        });
    if (qrScannedAddress.length)
        {
        setAddress(qrScannedAddress);
        qrScannedAddress = "";
        }

    function addToken() : void
        {
        if (isCreating) return;
        if (!MC.validateEthereumAddress(address))
            {
            setError(INVALID_ADDRESS_ERROR);
            return;
            }
        isCreating = true;
        clearError();
        const plainAddr = address.startsWith("0x") ? address.substring(2) : address;
        MC.getMC().storage.accountManager.current.createCandidateToken(plainAddr).then((tk : MRC20Token) : void =>
            {
            isCreating = false;
            walletNavigation.navigate(WALLET_SCREENS.ACCEPT_TOKEN, { token: tk.toSerializableObject(true) });
            })
        .catch((e : any) : void =>
            {
            isCreating = false;
            if (isShowing.current) setError(TOKEN_NOT_FOUND_ERROR);
            });
        }

    function onQRScanPressed() : void
        {
        clearError();
        props.qrScanAddress(QR_SCANNER_TARGETS.ethereumAddress, WALLET_SCREENS.ADD_TOKEN, (qrAddr : string) : void =>
            {
            qrScannedAddress = qrAddr;
            });
        }

    function clearError() : void
        {
        if (errMsg.length) setErrMsg("");
        }

    function setError(newErrMsg : string) : void
        {
        if (errMsg != newErrMsg) setErrMsg(newErrMsg);
        }

    function renderInvalidAddress() : JSX.Element | null
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
            <TitleBar title="Find MRC20 Token" onBurgerPressed={ props.onBurgerPressed }/>
            <View style={ commonStyles.horizontalBar }/>
            <View style={ commonStyles.squeezed }>
                <View style={{ height: 24 }} />
                <SimpleTextInput label="MRC20 Token Address:" value={ address } onChangeText={ (txt : string) : void => setAddress(txt) } icon="qrcode" onPressIcon={ onQRScanPressed }/>
                <View style={{ height: 24 }} />
                <SimpleButton text="Find Token" onPress={ addToken }/>
                { renderInvalidAddress() }
            </View>
        </View>
        );
    }
