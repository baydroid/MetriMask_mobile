import React from "react";
import { View } from "react-native";
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { MC } from "../mc";
import { WALLET_SCREENS } from "./WalletView";
import { commonStyles, TitleBar, formatSatoshi, SimpleDoublet, DoubleDoublet, SimpleButtonPair } from "./common";
import { MRC20Token, SerializableMRC20Token } from "../MRC20";
import { AccountManager } from "../AccountManager";



export type AcceptTokenViewProps =
    {
    token           : SerializableMRC20Token;
    onBurgerPressed : () => any;
    };

export function AcceptTokenView(props : AcceptTokenViewProps) : JSX.Element
    {
    const walletNavigation = useNavigation<StackNavigationProp<any>>();
    const am : AccountManager = MC.getMC().storage.accountManager;
    const tk : MRC20Token = MRC20Token.fromSerializable(props.token);

    function acceptToken() : void
        {
        am.current.tkm.addCandidateToken(tk);
        walletNavigation.navigate(WALLET_SCREENS.ACCOUNT_HOME);
        }

    function cancel() : void
        {
        walletNavigation.navigate(WALLET_SCREENS.ACCOUNT_HOME);
        }

    return (
        <View style={ commonStyles.containingView }>
            <TitleBar title="Add MRC20 Token" onBurgerPressed={ props.onBurgerPressed }/>
            <View style={ commonStyles.horizontalBar }/>
            <View style={ commonStyles.squeezed }>
                <View style={{ height: 24 }} />
                <DoubleDoublet titleL="Account:" textL={ am.current.accountName } titleR="Network:" textR={ am.current.wm.ninfo.name } />
                <View style={{ height: 8 }} />
                <DoubleDoublet titleL="Token Name:" textL={ tk.name } titleR="Token Symbol:" textR={ tk.symbol }/>
                <View style={{ height: 8 }} />
                <SimpleDoublet title="MRC20 Contract Address:" text={ tk.address }/>
                <View style={{ height: 8 }} />
                <SimpleDoublet title="Balance:" text={ formatSatoshi(tk.balanceSat, tk.decimals) }/>
                <View style={{ height: 24 }} />
                <SimpleButtonPair left={{ text: "Cancel", onPress: cancel }} right={{ text: "Add Token", onPress: acceptToken }}/>
            </View>
        </View>
        );
    }
