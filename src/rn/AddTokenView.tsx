import React, { useEffect, useState, useRef } from "react";
import { View } from "react-native";

import { ADDRESS_SYNTAX, MC } from "../mc";
import { WALLET_SCREENS } from "./WalletView";
import { commonStyles, InvalidMessage, SimpleButton, SimpleTextInput, TitleBar } from "./common";
import { MRC20Token } from "../MRC20";
import { QR_SCANNER_TARGETS } from "./QRAddressScanView";
import { WorkFunctionResult } from "./MainView";
import { Account } from "../Account";
import { AcceptTokenViewSerializableProps } from "./AcceptTokenView";



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
    onBurgerPressed    : () => any;
    qrScanAddress      : (target : QR_SCANNER_TARGETS, returnScreen : WALLET_SCREENS, onAddressScanned : (address : string) => any) => any;
    qrShouldShowButton : () => boolean;
    showWorkingAsync   : (asyncWorkFunction : (onWorkDone : (result : WorkFunctionResult) => void) => any) => void;
    };

let qrScannedAddress : string = "";

export function AddTokenView(props : AddTokenViewProps) : JSX.Element
    {
    const [ address, setAddress ] = useState<string>(props.address ? props.address : "");
    const [ errMsg, setErrMsg ] = useState<string>(props.errMsg ? props.errMsg : "");
    const [ showQRButton, setShowQRButton ] = useState<boolean>(props.qrShouldShowButton());
    const isShowing = useRef<boolean>(false);

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
    configureShowQRButton();

    function configureShowQRButton() : void
        {
        const shouldShowIt : boolean = props.qrShouldShowButton();
        if (shouldShowIt != showQRButton) setShowQRButton(shouldShowIt);
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

            function addByEvmAddress(evmAddress : string) : void
                {
                if (evmAddress.startsWith("0x")) evmAddress = evmAddress.substring(2);
                acnt.createCandidateToken(evmAddress).then((tk : MRC20Token) : void =>
                    {
                    const nextProps : AcceptTokenViewSerializableProps = syntax == ADDRESS_SYNTAX.MNS ? { mnsName: address, token: tk.toSerializableObject(true) } : { token: tk.toSerializableObject(true) };
                    onWorkDone({ nextScreen: WALLET_SCREENS.ACCEPT_TOKEN, nextScreenParams: nextProps});
                    })
                .catch((e : any) : void =>
                    {
                    finsihWithError(TOKEN_NOT_FOUND_ERROR);
                    });
                }

            function finsihWithError(errMsg : string) : void
                {
                onWorkDone({ nextScreen: WALLET_SCREENS.ADD_TOKEN, nextScreenParams: { address, errMsg }});
                }

            if (syntax == ADDRESS_SYNTAX.MNS)
                {
                acnt.wm.ninfo.mnsResolveEvm(address).then((evmAddress : string) : void =>
                    {
                    if (evmAddress)
                        addByEvmAddress(evmAddress);
                    else
                        finsihWithError(MNS_NAME_NOT_OK_ERROR);
                    })
                .catch((e : any) : void => MC.raiseError(e, "AddTokenView addToken mnsResolveEvm"));
                }
            else
                addByEvmAddress(address);
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

    function TokenAddressTextInput() : JSX.Element
        {
        if (showQRButton)
            return (<SimpleTextInput label="Token Address or MNS name:" value={ address } onChangeText={ (txt : string) : void => setAddress(txt) } icon="qrcode" onPressIcon={ onQRScanPressed }/>);
        else
            return (<SimpleTextInput label="Token Address or MNS name:" value={ address } onChangeText={ (txt : string) : void => setAddress(txt) }/>);
        }

    return (
        <View style={ commonStyles.containingView }>
            <TitleBar title="Find MRC20 Token" onBurgerPressed={ props.onBurgerPressed }/>
            <View style={ commonStyles.horizontalBar }/>
            <View style={ commonStyles.squeezed }>
                <View style={{ height: 24 }} />
                <TokenAddressTextInput/>
                <View style={{ height: 24 }} />
                <SimpleButton text="Find Token" onPress={ addToken }/>
                { renderInvalidAddress() }
            </View>
        </View>
        );
    }
