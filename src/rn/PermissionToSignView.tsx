import React from "react";
import { View, Text, ScrollView } from "react-native";

import { MC } from "../mc";
import { commonStyles, SimpleDoublet, DoubleDoublet, SimpleButtonPair, BurgerlessTitleBar, AddressQuasiDoublet, COLOR_BLACK, COLOR_MIDDLE_GREY } from "./common";



export type PermissionToSignViewProps =
    {
    requestingURL               : string;
    askingEntitySelfDescription : string;
    messageToSign               : string;
    onSigningPermittedDecision  : (permittedToSign : boolean) => any;
    };

export function PermissionToSignView(props : PermissionToSignViewProps) : JSX.Element
    {
    const am = MC.getMC().storage.accountManager;

    return (
        <View style={ commonStyles.containingView }>
            <BurgerlessTitleBar title="Permission to Sign?"/>
            <View style={ commonStyles.horizontalBar }/>
            <View style={{ ...commonStyles.squeezed, flexDirection: "column", flex: 1 }}>
                <View style={{ height: 24 }} />
                <Text style={{ color: COLOR_BLACK }}>A web page is asking your permission to sign a message.</Text>
                <View style={{ height: 24 }} />
                <DoubleDoublet titleL="Siging Account:" textL={ am.current.accountName } titleR="Network:" textR={ am.current.wm.ninfo.name } />
                <View style={{ height: 7 }} />
                <AddressQuasiDoublet title="Signing Account Address:" acnt={ am.current }/>
                <View style={{ height: 7 }} />
                <SimpleDoublet title="Signature Requesting Webpage:" text={ props.requestingURL }/>
                <View style={{ height: 7 }} />
                <SimpleDoublet title="Signature Requester:" text={ props.askingEntitySelfDescription }/>
                <View style={{ height: 24 }} />
                <Text style={{ color: COLOR_MIDDLE_GREY}}>Message to be Signed:</Text>
                <View style={{ height: 1 }} />
                <ScrollView style={ commonStyles.borderedScroller }>
                    <Text style={{ color: COLOR_BLACK }}>{ props.messageToSign }</Text>
                </ScrollView>
                <View style={{ height: 24 }} />
                <SimpleButtonPair
                    left={{ text: "Cancel", onPress: () : void => props.onSigningPermittedDecision(false) }}
                    right={{ text: "Sign", onPress: () : void => props.onSigningPermittedDecision(true) }}/>
                <View style={{ height: 24 }} />
            </View>
        </View>
        );
    }
