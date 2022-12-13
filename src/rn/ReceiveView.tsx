import "../../shimWrapper.js";

import React from "react";
import { useWindowDimensions, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import QRCode from "react-native-qrcode-svg";
import Clipboard from '@react-native-clipboard/clipboard';

import { MC, MRX_DECIMALS } from "../mc";
import { WALLET_SCREENS } from "./WalletView";
import { commonStyles, DoubleDoublet, formatSatoshi, SimpleDoublet, TitleBar, SimpleButton, AddressQuasiDoublet } from "./common";



export type ReceiveViewProps =
    {
    onBurgerPressed : () => any;
    };

export function ReceiveView(props : ReceiveViewProps) : JSX.Element
    {
    const walletNavigation = useNavigation<StackNavigationProp<any>>();
    const am = MC.getMC().storage.accountManager;
    const layout = useWindowDimensions();

    function qrSize() : number
        {
        let qrSize = layout.width/2;
        if (qrSize > layout.width - 192) qrSize = layout.width - 192;
        if (qrSize > 336) qrSize = 336;
        return qrSize;
        }

    return (
        <View style = { commonStyles.containingView }>
            <TitleBar title="Receive" onBurgerPressed={ props.onBurgerPressed }/>
            <View style={ commonStyles.horizontalBar }/>
            <View style={ commonStyles.squeezed }>
                <View style = {{ height: 24 }} />
                <DoubleDoublet titleL="Account:" textL={ am.current.accountName } titleR="Network:" textR={ am.current.wm.ninfo.name } />
                <View style={{ height: 7 }} />
                <SimpleDoublet title="Account Balance:" text={ formatSatoshi(am.current.wm.balanceSat, MRX_DECIMALS) + " MRX" }/>
                <View style={{ height: 7 }} />
                <AddressQuasiDoublet title="Account Address:" acnt={ am.current }/>
                <View style = {{ height: 24 }} />
                <SimpleButton onPress={ () : void => Clipboard.setString(am.current.wm.address) } text="Copy to Clipboard" icon="content-copy"/>
                <View style={{ height: 24 }} />
                <View style={ commonStyles.rowContainerV2 }>
                    <View style={{ flex: 1 }}/>
                    <QRCode value={ am.current.wm.address } size={ qrSize() }/>
                    <View style={{ flex: 1 }}/>
                </View>
                <View style={{ height: 24 }} />
                <SimpleButton onPress={ () : void => walletNavigation.navigate(WALLET_SCREENS.ACCOUNT_HOME) } text="Account Home"/>
            </View>
        </View>
        );
    }
