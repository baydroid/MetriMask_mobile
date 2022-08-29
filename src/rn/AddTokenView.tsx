import React, { useEffect, useState, useRef } from "react";
import { View } from "react-native";
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { ADDRESS_SYNTAX, MC } from "../mc";
import { WALLET_SCREENS } from "./WalletView";
import { commonStyles, InvalidMessage, SimpleButton, SimpleTextInput, TitleBar } from "./common";
import { MRC20Token } from "../MRC20";
import { QR_SCANNER_TARGETS } from "./QRAddressScanView";
import { WorkFunctionResult } from "./MainView";
import { Account } from "../Account";



const INVALID_ADDRESS_ERROR = "Address not valid.";
const TOKEN_NOT_FOUND_ERROR = "Address is not a Token."
const MNS_NAME_NOT_OK_ERROR = "The MNS name is not valid.";



export type AddTokenViewSerializableProps =
    {
    address? : string;
    errMsg?  : string;
    };

export type AddTokenViewProps = AddTokenViewSerializableProps &
    {
    onBurgerPressed  : () => any;
    qrScanAddress    : (target : QR_SCANNER_TARGETS, returnScreen : WALLET_SCREENS, onAddressScanned : (address : string) => any) => any;
    showWorkingAsync : (asyncWorkFunction : (onWorkDone : (result : WorkFunctionResult) => void) => any) => void;
    };

let qrScannedAddress : string = "";

export function AddTokenView(props : AddTokenViewProps) : JSX.Element
    {
    const [ address, setAddress ] = useState<string>(props.address ? props.address : "");
    const [ errMsg, setErrMsg ] = useState<string>(props.errMsg ? props.errMsg : "");
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
        const syntax : ADDRESS_SYNTAX = MC.anaylizeAddressSyntax(address);
        switch (syntax)
            {
            case ADDRESS_SYNTAX.EVM:                                  break;
            case ADDRESS_SYNTAX.MNS:                                  break;
            default:                 setError(INVALID_ADDRESS_ERROR); return;
            }
        clearError();
        props.showWorkingAsync((onWorkDone : (result : WorkFunctionResult) => void) : void =>
            {
            const acnt : Account = MC.getMC().storage.accountManager.current;

            function part2(evmAddress : string) : void
                {
                if (evmAddress.startsWith("0x")) evmAddress = evmAddress.substring(2);
                acnt.createCandidateToken(evmAddress).then((tk : MRC20Token) : void =>
                    {
                    walletNavigation.navigate(WALLET_SCREENS.ACCEPT_TOKEN, { token: tk.toSerializableObject(true) });
                    })
                .catch((e : any) : void =>
                    {
                    finsihWithError(TOKEN_NOT_FOUND_ERROR);
                    });
                }

            function finsihWithError(errMsg : string) : void
                {
                walletNavigation.navigate(WALLET_SCREENS.ADD_TOKEN, { address, errMsg });
                }

            if (syntax == ADDRESS_SYNTAX.MNS)
                {
                acnt.wm.ninfo.mnsResolveEvm(address).then((evmAddress : string) : void =>
                    {
                    if (evmAddress)
                        part2(evmAddress);
                    else
                        finsihWithError(MNS_NAME_NOT_OK_ERROR);
                    })
                .catch((e : any) : void => MC.raiseError(e, "AddTokenView addToken"));
                }
            else
                part2(address);
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
