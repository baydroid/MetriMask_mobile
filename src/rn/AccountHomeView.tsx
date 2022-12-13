import "../../shimWrapper.js";

import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, useWindowDimensions, FlatList, ListRenderItemInfo } from "react-native";
import { IconButton, TouchableRipple, ProgressBar } from "react-native-paper";
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from "@react-navigation/stack";
import DropDownPicker, { ItemType, ValueType} from 'react-native-dropdown-picker';
import { TabView, TabBar, SceneMap, SceneRendererProps, NavigationState } from 'react-native-tab-view';
import { Scene } from "react-native-tab-view/lib/typescript/types";

import { commonStyles, formatSatoshi, TitleBar, SimpleDoublet, LOADING_STR, NO_INFO_STR, DoubleDoublet, SimpleButton, SimpleButtonPair, AddressQuasiDoublet, COLOR_BLACK, COLOR_DARKISH_PURPLE, COLOR_DARK_PURPLE, COLOR_LIGHT_GREY, COLOR_WHITE, COLOR_PURPLE_RIPPLE, COLOR_LIGHTISH_PURPLE, COLOR_MIDDLE_GREY } from "./common";
import { BIG_0, MC, MRX_DECIMALS } from "../mc";
import { WALLET_SCREENS } from "./WalletView";
import { WorkFunctionResult } from "./MainView";
import { TransactionInfo } from "../TransactionLog";
import { MRC20Token } from "../MRC20";
import { Insight } from "metrixjs-wallet";



const accountHomeStyles = StyleSheet.create
    ({
    containingView:
        {
        flexDirection: "column",
        backgroundColor: COLOR_WHITE,
        margin: 0,
        padding: 0,
        border: 0,
        },
    icon:
        {
        margin: 0,
        padding: 0,
        border: 0,
        alignSelf: "center"    
        }
    });



export type AccountHomeViewProps =
    {
    onBurgerPressed  : () => any;
    showWorkingAsync : (asyncWorkFunction : (onWorkDone : (result : WorkFunctionResult) => void) => any) => void;
    };



enum TAB_INDEX
    {
    TRANSACTIONS = 0,
    TOKENS       = 1
    };

enum TAB_KEY
    {
    TRANSACTIONS = "txLog",
    TOKENS       = "tokens"
    };

type TabRoute =
    {
    key   : string;
    title : string;
    };

const tabRoutes : TabRoute[] =
    [
    { key: TAB_KEY.TRANSACTIONS, title: 'Transactions' },
    { key: TAB_KEY.TOKENS,       title: 'MRC20 Tokens' },
    ];



let onDisplay : boolean = false;
let tokenRefreshPending : boolean = false;
let tokenRefreshInProgress : boolean = false;
let nonce : number = 1;

export function AccountHomeView(props : AccountHomeViewProps) : JSX.Element
    {
    const walletNavigation = useNavigation<StackNavigationProp<any>>();
    const mc = MC.getMC();
    const am = mc.storage.accountManager;
    let sceneMapObj : any = { };
    sceneMapObj[TAB_KEY.TRANSACTIONS] = ShowTxLog;
    sceneMapObj[TAB_KEY.TOKENS] = ShowTokens;
    const tabSceneMap = SceneMap(sceneMapObj);

    const [ accountDDOpen, setAccountDDOpen ] = useState<boolean>(false);
    const [ accountDDValue, setAccountDDValue ] = useState<ValueType | null>(am.current.accountName);
    const [ accountDDItems, setAccountDDItems ] = useState<ItemType<string>[]>(am.accountDropDownItems);

    const [ balance, setBalance ] = useState<string>(formatBalance());
    const [ unconfirmedBalance, setUnconfirmedBalance ] = useState<string>(formatUnconfirmedBalance());
    const [ tabIndex, _setTabIndex ] = useState<TAB_INDEX>(TAB_INDEX.TRANSACTIONS);
    const [ disableMoreTxs, setDisableMoreTxs ] = useState<boolean>(false);
    const [ txLogTickler, setTxLogTickler ] = useState<boolean>(false);
    const [ tokenTickler, setTokenTickler ] = useState<boolean>(false);
    const [ txLoadInProgress, setTxLoadInProgress ] = useState<boolean>(false);

    const layout = useWindowDimensions();
    if (disableMoreTxs != txLoadInProgress) setDisableMoreTxs(txLoadInProgress);

    useEffect(() : (() => void) =>
        {
        onDisplay = true;
        if (tokenRefreshPending)
            {
            tokenRefreshPending = false;
            refreshTokenBalances();
            }
        updateBalances();
        const balanceNRef : number = am.startBalanceNotifications(updateBalances);
        const txLogNRef : number = tabIndex == TAB_INDEX.TRANSACTIONS ? am.startTxLogNotifications(updateTxs) : 0;
        const tokensNRef : number = tabIndex == TAB_INDEX.TOKENS ? am.startAllTokensNotifications(updateTokens) : 0;
        return () : void =>
            {
            onDisplay = false;
            am.stopBalanceNotifications(balanceNRef);
            if (txLogNRef) am.stopTxLogNotifications(txLogNRef);
            if (tokensNRef) am.stopAllTokensNotifications(tokensNRef);
            }
        });

    function formatBalance() : string
        {
        return am.current.wm.balanceSat.greaterOrEquals(BIG_0) ? formatSatoshi(am.current.wm.balanceSat, MRX_DECIMALS) : LOADING_STR;
        }

    function formatUnconfirmedBalance() : string
        {
        return am.current.wm.unconfirmedBalanceSat.greaterOrEquals(BIG_0) ? formatSatoshi(am.current.wm.unconfirmedBalanceSat, MRX_DECIMALS) : LOADING_STR;
        }

    function setTabIndex(index : TAB_INDEX) : void
        {
        if (tabIndex != TAB_INDEX.TOKENS && index == TAB_INDEX.TOKENS) tokenRefreshPending = true;
        _setTabIndex(index);
        }

    function updateBalances() : void
        {
        const newBalanceStr = formatBalance();
        if (balance != newBalanceStr) setBalance(newBalanceStr);
        const newUnconfirmedStr = formatUnconfirmedBalance();
        if (unconfirmedBalance != newUnconfirmedStr) setUnconfirmedBalance(newUnconfirmedStr);
        }

    function updateTxs() : void
        {
        setTxLogTickler(!txLogTickler);
        }

    function updateTokens() : void
        {
        setTokenTickler(!tokenTickler);
        }

    function refreshTokenBalances() : void
        {
        if (!tokenRefreshInProgress && !txLoadInProgress)
            {
            tokenRefreshInProgress = true;
            const myNonce = nonce;
            am.current.refreshAllTokenBalances().then((changed : boolean) : void =>
                {
                tokenRefreshInProgress = false;
                if (myNonce == nonce && onDisplay && tabIndex == TAB_INDEX.TOKENS) updateTokens();
                })
            .catch((e : any) : void =>
                {
                tokenRefreshInProgress = false;
                MC.raiseError(e, "AccountHomeView refreshTokenBalances()");
                });
            }
        }

    function onSelectAccount(item : ItemType<string>) : void
        {
        if (item.value != am.current.accountName)
            {
            nonce++;
            if (am.setCurrentAccountNeedsWork(item.value as string))
                {
                props.showWorkingAsync((onWorkDone : (result : WorkFunctionResult) => void) : void =>
                    {
                    am.setCurrentAccount(item.value as string);
                    am.current.finishLoad().then((info : Insight.IGetInfo | null) : void =>
                        {
                        if (tabIndex == TAB_INDEX.TOKENS) tokenRefreshPending = true;
                        onWorkDone({ nextScreen: WALLET_SCREENS.ACCOUNT_HOME });
                        })
                    .catch((e : any) : void =>
                        {
                        MC.raiseError(e, `AccountHomeView onSelectAccount()`);
                        });
                    });
                }
            else
                {
                am.setCurrentAccount(item.value as string);
                if (tabIndex == TAB_INDEX.TOKENS) tokenRefreshPending = true;
                }
            }
        }

    function onRemoveToken(tk : MRC20Token) : void
        {
        am.current.tkm.removeToken(tk.address);
        am.saveSelf();
        setTokenTickler(!tokenTickler);
        }

    function onShowTx(ti : TransactionInfo) : void
        {
        mc.openUrlInNewTab(am.current.wm.ninfo.txUrlHeader + ti.id);
        }

    function onShowToken(tk : MRC20Token) : void
        {
        mc.openUrlInNewTab(am.current.wm.ninfo.tokenUrlHeader + tk.address);
        }

    function onLoadMoreTxs() : void
        {
        if (!tokenRefreshInProgress && !txLoadInProgress)
            {
            setTxLoadInProgress(true);
            const myNonce = nonce;
            am.current.extendTxLog().then((canLoadMoreTxs : boolean) : void =>
                {
                setTxLoadInProgress(false);
                if (myNonce == nonce && onDisplay && tabIndex == TAB_INDEX.TRANSACTIONS) updateTxs();
                })
            .catch((e : any) : void =>
                {
                setTxLoadInProgress(false);
                MC.raiseError(e, "AccountHomeView.onLoadMoreTxs()");
                });
            }
        }

    function onSend() : void
        {
        nonce++;
        walletNavigation.navigate(WALLET_SCREENS.SEND);
        }

    function onReceive() : void
        {
        nonce++;
        walletNavigation.navigate(WALLET_SCREENS.RECEIVE);
        }

    function onBurgerPressed() : void
        {
        props.onBurgerPressed();
        }

    function ShowTxLog() : JSX.Element
        {
        function renderItem(param : ListRenderItemInfo<TransactionInfo>) : JSX.Element
            {
            function renderTxLogEntry(ti : TransactionInfo) : JSX.Element
                {
                return (
                    <TouchableRipple rippleColor={ COLOR_PURPLE_RIPPLE } onPress={ () : void => onShowTx(ti) }>
                        <View style={{ width: "100%", paddingLeft: 24, paddingRight: 24, paddingTop: 9, paddingBottom: 9 }}>
                            <View style={ commonStyles.rowContainerV2 }>
                                <Text style={{ color: COLOR_BLACK }}>{ formatSatoshi(ti.valueSat, MRX_DECIMALS) }</Text>
                                <View style={{ flex: 1 }}/>
                                <Text style={{ color: COLOR_BLACK }}>{ ti.dateTimeStr }</Text>
                            </View>
                            <Text style={{ color: COLOR_MIDDLE_GREY }} numberOfLines={ 1 } ellipsizeMode="middle">{ ti.id }</Text>
                        </View>
                    </TouchableRipple>
                    );
                }

            const ti : TransactionInfo = param.item;
            if (param.index + 1 == am.current.txLog.log.length && am.current.txLog.canLoadMoreTxs)
                return (
                    <>
                        { renderTxLogEntry(ti) }
                        <View style={{ height: 3, backgroundColor: COLOR_LIGHT_GREY }}/>
                        <View style={{ height: 24 }}/>
                        <View style={ commonStyles.squeezed }>
                            <SimpleButton text="Load More Transactions" disabled={ disableMoreTxs } onPress = { onLoadMoreTxs }/>
                        </View>
                        <View style={{ height: 24 }}/>
                    </>
                    );
            else
                return (
                    <>
                        { renderTxLogEntry(ti) }
                        <View style={{ height: 3, backgroundColor: COLOR_LIGHT_GREY }}/>
                    </>
                    );
            }

        return (
            <FlatList<TransactionInfo> data={ am.current.txLog.log } renderItem={ renderItem } keyExtractor={ (item : TransactionInfo) : string => item.id } extraData={ txLogTickler }/>
            );
        }

    function ShowTokens() : JSX.Element
        {
        function renderItem(param : ListRenderItemInfo<MRC20Token>) : JSX.Element
            {
            const mrc20 : MRC20Token = param.item;
            const name = mrc20.name.length ? mrc20.name : mrc20.address;
            const balance = mrc20.infoIsValid ? formatSatoshi(mrc20.balanceSat, mrc20.decimals) + " " + mrc20.symbol : NO_INFO_STR;
            return (
                <TouchableRipple style={{ flex: 1 }} rippleColor={ COLOR_PURPLE_RIPPLE } onPress={ () : void => onShowToken(mrc20) }>
                    <View>
                        <View style={ commonStyles.rowContainerV2 }>
                            <View style={{ paddingLeft: 24, paddingRight: 0, paddingTop: 9, paddingBottom: 9 }}>
                                <Text style={{ color: COLOR_BLACK }}>{ name }</Text>
                                <Text style={{ color: COLOR_MIDDLE_GREY }}>{ balance }</Text>
                            </View>
                            <View style={{ flex: 1 }}/>
                            <View style={ accountHomeStyles.containingView }>
                                <IconButton rippleColor={ COLOR_PURPLE_RIPPLE } style={ commonStyles.icon } size={ 24 } icon="close" onPress={ () : void => onRemoveToken(mrc20) }/>
                                <View style={{ flex: 1 }}/>
                            </View>
                        </View>
                        <View style={{ height: 3, backgroundColor: COLOR_LIGHT_GREY }}/>
                    </View>
                </TouchableRipple>
                );
            }

        return (
            <FlatList<MRC20Token> data={ am.current.tkm.tokenArray } renderItem={ renderItem } keyExtractor={ (item : MRC20Token) : string => item.address } extraData={ tokenTickler }/>
            );
        }

    function renderTabBar(props : SceneRendererProps & { navigationState : NavigationState<TabRoute>; }) : JSX.Element
        {
        function renderLabel(scene : Scene<TabRoute> & { focused : boolean; color : string; }) : JSX.Element
            {
            if (scene.focused)
                return (
                    <Text style={{ color: COLOR_BLACK, margin: 0 }}>{ scene.route.title }</Text>
                    );
            else
                return (
                    <Text style={{ color: COLOR_MIDDLE_GREY, margin: 0 }}>{ scene.route.title }</Text>
                    );
            }

        return (
            <TabBar
                { ...props }
                renderLabel={ renderLabel }
                indicatorStyle={{ backgroundColor: COLOR_DARK_PURPLE }}
                style={{ backgroundColor: COLOR_LIGHTISH_PURPLE }}
                />
            );
        }

    function DividerBar() : JSX.Element
        {
        if (disableMoreTxs)
            return (<ProgressBar style={{ height: 3 }} indeterminate color={ COLOR_DARK_PURPLE } />);
        else
            return (<ProgressBar style={{ height: 3 }} progress={ 1 } color={ COLOR_DARK_PURPLE } />);
        }

    return (
         <View style={ commonStyles.containingView }>
            <TitleBar title="Account Home" onBurgerPressed={ onBurgerPressed }/>
            <View style={ commonStyles.horizontalBar }/>
            <View style={{ height: 20 }} />
            <View style={ commonStyles.squeezed }>
                <Text style={{ color: COLOR_MIDDLE_GREY}}>Account:</Text>
                <DropDownPicker
                    dropDownContainerStyle={{ borderColor: COLOR_DARKISH_PURPLE }}
                    style={{ borderColor: COLOR_DARKISH_PURPLE }}
                    maxHeight={ 400 }
                    items={ accountDDItems }
                    open={ accountDDOpen }
                    value={ accountDDValue as string }
                    setOpen={ setAccountDDOpen }
                    setValue={ setAccountDDValue }
                    setItems={ setAccountDDItems }
                    onSelectItem={ onSelectAccount }
                    />
                <View style={{ height: 24 }} />
                <DoubleDoublet titleL="Network:" textL={ am.current.wm.ninfo.name } titleR="Unconfirmed MRX:" textR={ unconfirmedBalance }/>
                <View style={{ height: 7 }} />
                <AddressQuasiDoublet title="Address:" acnt={ am.current }/>
                <View style={{ height: 7 }} />
                <SimpleDoublet title="MRX Balance:" text={ balance } />
                <View style={{ height: 24 }} />
                <SimpleButtonPair left={{ text: "Send", icon: "debug-step-out", onPress: onSend }} right={{ text: "Receive", icon: "debug-step-into", onPress: onReceive }}/>
                <View style={{ height: 24 }} />
            </View>
            <DividerBar/>
            <TabView navigationState={{ index: tabIndex, routes: tabRoutes }} renderScene={ tabSceneMap } onIndexChange={ setTabIndex } initialLayout={{ width: layout.width }} renderTabBar={ renderTabBar }/>
        </View>
        );
    }
