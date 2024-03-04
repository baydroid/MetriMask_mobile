import React, { useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import QRCodeScanner from 'react-native-qrcode-scanner';
import { RNCamera, BarCodeReadEvent } from 'react-native-camera';
import { Button as PaperButton, IconButton } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { MC } from "../mc";
import { COLOR_DULL_GREEN, COLOR_GREEN, COLOR_WHITE, commonStyles, InvalidMessage, SimpleButtonPair, TitleBar } from "./common";
import { WALLET_SCREENS } from "./WalletView";



const TARGET_ERRORS : string[] =
    [
    "That QR code is not a valid address.",
    "That QR code is not a valid address."
    ];

const TARGET_TITLES : string[] =
    [
    "Scan Address QR Code",
    "Scan Address QR Code"
    ];

export enum QR_SCANNER_TARGETS
    {
    metrixAddress   = 0,
    ethereumAddress = 1
    };

export type QRAddressScanViewSerializableProps =
    {
    target       : QR_SCANNER_TARGETS;
    returnScreen : WALLET_SCREENS;
    };

export type QRAddressScanViewProps = QRAddressScanViewSerializableProps &
    {
    onBurgerPressed  : () => any;
    onAddressScanned : (addr : string) => any;
    };

export function QRAddressScanView(props : QRAddressScanViewProps) : JSX.Element
    {
    const walletNavigation = useNavigation<StackNavigationProp<any>>();
    const [ flashMode, setFlashMode ] = useState<any>(RNCamera.Constants.FlashMode.auto);
    const [ errorMessage, setErrorMessage ] = useState<string>("");

    function onRead(evt : BarCodeReadEvent) : void
        {
        const addr : string = massageAddress(evt.data);
        if (addr.length)
            {
            props.onAddressScanned(addr);
            walletNavigation.navigate(props.returnScreen);
            }
        else
            setErrorMessage(TARGET_ERRORS[props.target]);
        }

    function massageAddress(addr : string) : string
        {
        if (addr.toLowerCase().startsWith("metrix:")) addr = addr.substring(7);
        switch (props.target)
            {
            case QR_SCANNER_TARGETS.ethereumAddress:
                if (addr.startsWith("0x")) addr = addr.substring(2);
                return MC.validateEvmAddress(addr) ? addr : "";
            case QR_SCANNER_TARGETS.metrixAddress:
                return MC.validateMrxAddress(addr) ? addr : "";
            default:
                return "";
            }
        }

    function onRescan() : void
        {
        setErrorMessage("");
        }

    function onCancel() : void
        {
        walletNavigation.navigate(props.returnScreen);
        }

    function renderErrorMessage() : JSX.Element
        {
        return (
            <>
                <TitleBar title={ TARGET_TITLES[props.target] } onBurgerPressed={ props.onBurgerPressed }/>
                <View style={ commonStyles.horizontalBar }/>
                <View style={ commonStyles.squeezed }>
                    <View style={{ height: 48 }}/>
                    <InvalidMessage text={ errorMessage }/>
                    <View style={{ height: 48 }}/>
                    <SimpleButtonPair left={{ text: "Cancel", onPress: onCancel }} right={{ text: "Scan More", onPress: onRescan }}/>
                </View>
            </>
            );
        }

    function renderScannerFooter() : JSX.Element
        {
        function renderFlashButton(buttonFlashMode : any, iconName : string) : JSX.Element
            {
            const onPress = () : void => { if (flashMode != buttonFlashMode) setFlashMode(buttonFlashMode); };
            const color : string = flashMode == buttonFlashMode ? COLOR_GREEN : COLOR_DULL_GREEN;
            return (<IconButton style={ commonStyles.icon } iconColor={ color } size={ 24 } icon={ iconName } onPress={ onPress }/>);
            }

        const footerStyle : object = Platform.OS == "ios"
            ? { ...commonStyles.rowContainer, paddingBottom: 24, paddingTop: 24, backgroundColor: "#000000" }
            : { ...commonStyles.rowContainer, marginBottom: 24 };
        return (
            <View style={ footerStyle }>
                <View style={{ width: 24 }}/>
                <PaperButton onPress={ onCancel } style={{ borderColor: COLOR_GREEN, borderWidth: 1 }} mode="outlined" uppercase={ false } color={ COLOR_GREEN }>
                    <Text style={{ color: COLOR_GREEN }}>Cancel</Text>
                </PaperButton>
                <View style={{ flex: 1 }}/>
                { renderFlashButton(RNCamera.Constants.FlashMode.auto, "flash-auto") }
                <View style={{ width: 12 }}/>
                { renderFlashButton(RNCamera.Constants.FlashMode.off, "flash-off") }
                <View style={{ width: 12 }}/>
                { renderFlashButton(RNCamera.Constants.FlashMode.on, "flash") }
                <View style={{ width: 12 }}/>
                { renderFlashButton(RNCamera.Constants.FlashMode.torch, "flashlight") }
                <View style={{ width: 24 }}/>
            </View>
            );
        }

    function renderQRSanner() : JSX.Element
        {
        return (
            <>
                <TitleBar title={ TARGET_TITLES[props.target] } onBurgerPressed={ props.onBurgerPressed }/>
                <View style={ commonStyles.horizontalBar }/>
                <View style={{ height: 24 }}/>
                <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: COLOR_WHITE, margin: 0, padding: 0 }}>
                    <QRCodeScanner showMarker={ true } flashMode={ flashMode } onRead={ onRead } bottomContent={ renderScannerFooter() }/>
                </ScrollView>
            </>
            );
        }

    return errorMessage.length ? renderErrorMessage() : renderQRSanner();
    }



// It seemed like it might be worth keeping these notes.
//   mYbETUoAf4ZZZJoNKfL9K8T8mcUo52mDNB
//   6D59624554556F4166345A5A5A4A6F4E4B664C394B3854386D63556F35326D444E42
//4226d59624554556f4166345a5a5a4a6f4e4b664c394b3854386d63556f35326d444e420ec11ec11ec11ec11ec11ec11ec11ec11ec11ec
//const x = {"bounds":{"width":1472,"height":1104,"origin":[{"y":"215.5","x":"889.5"},{"y":"213.5","x":"836.5"},{"y":"162.5","x":"838.5"},{"y":"171.0","x":"884.0"}]},"type":"QR_CODE","rawData":"4226d59624554556f4166345a5a5a4a6f4e4b664c394b3854386d63556f35326d444e420ec11ec11ec11ec11ec11ec11ec11ec11ec11ec","data":"mYbETUoAf4ZZZJoNKfL9K8T8mcUo52mDNB","target":2277};
