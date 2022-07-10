import "../../shim.js";

import React, { useEffect } from "react";
import { StyleSheet, View, Text, Linking } from "react-native";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createDrawerNavigator, DrawerContentScrollView } from "@react-navigation/drawer";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ProgressBar, TouchableRipple } from "react-native-paper";
import { StackNavigationProp } from "@react-navigation/stack";
import { TimeoutHandler } from "usetimeout-react-hook";

import UserInactivity, { UserInactivityAPI } from "../modified_node_modules/react-native-user-inactivity";

import { BIG_0, MC, MRX_DECIMALS } from "../mc";
import BrowserView from "./BrowserView";
import WalletView, { WALLET_SCREENS, WalletViewAPI } from "./WalletView";
import { commonStyles, handleHardwareBackPressNoExit, handleHardwareBackPress, SimpleButton, formatSatoshi, BurgerlessTitleBar } from "./common";
import { PermissionToSignView, PermissionToSignViewProps } from "./PermissionToSignView";
import { PermissionToSendView, PermissionToSendViewProps } from "./PermissionToSendView";
import { ContractCallParams } from "../WalletManager";
import { AccountManager } from "../AccountManager";



const mainStyles = StyleSheet.create
    ({
    screenHolder:
        {
        height: "100%",
        width: "100%",
        backgroundColor: "white",
        },
    topBar:
        {
        height: 36,
        backgroundColor: "#FFFFFF",
        flexDirection: "row",
        alignItems: "center"
        },
    });



export const DEFAULT_INACTIVITY_TIMEOUT_MILLIS = 60*60*1000; // TODO put this back to 5 mins for production versions.

const TIMEOUT_HANDLER : TimeoutHandler<any> = // <any> instead of <BGTimerInfo> for compatability with UserInactivity.timeoutHandler which is a TimeoutHandler<unknown>
    {
    setTimeout: (fn : () => void, timeout : number) : any =>
        {
        return setTimeout(fn, timeout);
        },

    clearTimeout: (timeout : any | undefined) : void =>
        {
        if (timeout) clearTimeout(timeout);
        }
    }

type DrawerContentProps =
    {
    state       : any;
    navigation  : any;
    descriptors : any;
    };

export enum ROOT_SCREENS
    {
    BROWSER            = "Browser",
    WALLET             = "Wallet",
    PERMISSION_TO_SIGN = "PermissionToSign",
    PERMISSION_TO_SEND = "PermissionToSend",
    STARTING           = "Starting",
    WORKING            = "Working",
    WORKING_ASYNC      = "WorkingAsync",
    EMERGENCY_EXIT     = "EmergencyExit",
    };

export type WorkFunctionResult =
    {
    nextScreen        : WALLET_SCREENS;
    nextScreenParams? : object;
    }

export type MainViewAPI =
    {
    goToBrowser                    : () => void;
    logout                         : () => void;
    emergencyExit                  : (msg : string) => void;
    askPermissionToSign            : (requestingURL : string, askingEntitySelfDescription : string, messageToSign : string, onSigningPermittedDecision : (permittedToSign : boolean) => any) => void;
    askPermissionToSend            : (requestingURL : string, params : ContractCallParams, onSendingPermittedDecision : (permittedToSend : boolean, amountSat : string, gasLimit : number, gasPrice : number) => any) => void;
    showWalletWorking              : (workFunction : () => WorkFunctionResult) => void;
    showWalletWorkingAsync         : (asyncWorkFunction : (onWorkDone : (result : WorkFunctionResult) => any) => any) => void;
    restartUserInactivityTimer     : () => void;
    setUserInactivityTimeoutMillis : (timeoutMillis : number) => void;
    getUserInactivityTimeoutMillis : () => number;
    };

const RootDrawerNavigator = createDrawerNavigator();
let isInitializing : boolean = true;
let emeergencyExitMsg : string = "No information available.";
let nextPermissionToSignViewProps : PermissionToSignViewProps;
let nextPermissionToSendViewProps : PermissionToSendViewProps;
let nextOnSigningPermittedDecision : (permittedToSign : boolean) => any;
let nextOnSendingPermittedDecision : (permittedToSend : boolean, amountSat : string, gasLimit : number, gasPrice : number) => any;
let workFunctionCopy : (() => WorkFunctionResult) | null = null;
let asyncWorkFunctionCopy : ((onWorkDone : (result : WorkFunctionResult) => any) => any) | null = null;

export default function MainView() : JSX.Element
    {
    useEffect(handleHardwareBackPress);

    let rootNavigation : any = null;
    let walletAPI : WalletViewAPI | null = null;
    let inWallet : boolean = false;
    let userActive : boolean = true;
    let inactivityAPI : UserInactivityAPI | null = null;
    let inactivityTimeoutMillis : number = DEFAULT_INACTIVITY_TIMEOUT_MILLIS;

    function getWalletApi(api : WalletViewAPI) : void
        {
        walletAPI = api;
        }

    function walletNavigate(screen : WALLET_SCREENS, props? : object) : void
        {
        //if (walletAPI) walletAPI.navigate(screen, props);
        if (props)
            rootNavigation.navigate(ROOT_SCREENS.WALLET, { screen: screen, params: props });
        else
            rootNavigation.navigate(ROOT_SCREENS.WALLET, { screen: screen });
        }

    function getInactivityAPI(api : UserInactivityAPI) : void
        {
        inactivityAPI = api;
        }

    function restartUserInactivityTimer() : void
        {
        if (inactivityAPI) inactivityAPI.resetTimerDueToActivity();
        }

    function setUserInactivityTimeoutMillis(timeoutMillis : number) : void
        {
        inactivityTimeoutMillis = timeoutMillis;
        if (inactivityAPI) inactivityAPI.changeTimeForInactivity(timeoutMillis);
        }

    function onBurgerPressed() : void
        {
        if (rootNavigation) rootNavigation.openDrawer();
        }

    function onInactivityAction(active: boolean) : void
        {
        userActive = active;
        if (!active) MC.getMC().logout();
        }

    function showWalletWorkingAsync(asyncWorkFunction : (onWorkDone : (result : WorkFunctionResult) => any) => any) : void
        {
        if (asyncWorkFunctionCopy !== null) MC.raiseError("2nd work async functoion added before 1st one done.", "MainView showWorkingAsync()");
        asyncWorkFunctionCopy = asyncWorkFunction;
        rootNavigation.navigate(ROOT_SCREENS.WORKING_ASYNC, { nonce: MC.getUniqueInt() });
        }

    function showWalletWorking(workFunction : () => WorkFunctionResult) : void
        {
        if (workFunctionCopy !== null) MC.raiseError("2nd work functoion added before 1st one done.", "MainView showWorking()");
        workFunctionCopy = workFunction;
        rootNavigation.navigate(ROOT_SCREENS.WORKING, { nonce: MC.getUniqueInt() });
        }

    function goToBrowser() : void
        {
        rootNavigation.navigate(ROOT_SCREENS.BROWSER);
        }

    function logout() : void
        {
        MC.getMC().storage.accountManager.accountLogout();
        walletNavigate(WALLET_SCREENS.LOGIN);
        }

    function emergencyExit(msg : string) : void
        {
        emeergencyExitMsg = msg;
        rootNavigation.navigate(ROOT_SCREENS.EMERGENCY_EXIT);
        }

    function BrowserScreen() : JSX.Element
        {
        rootNavigation = useNavigation<StackNavigationProp<any>>();
        inWallet = false;
        return (
            <SafeAreaView>
                <View style={ mainStyles.screenHolder }>
                    <BrowserView onBurgerPressed = { onBurgerPressed }/>
                </View>
            </SafeAreaView>
            );
        }

    function askPermissionToSign(requestingURL : string, askingEntitySelfDescription : string, messageToSign : string, onSigningPermittedDecision : (permittedToSign : boolean) => any) : void
        {
        nextOnSigningPermittedDecision = onSigningPermittedDecision;
        nextPermissionToSignViewProps = { requestingURL, askingEntitySelfDescription, messageToSign, onSigningPermittedDecision: onSigningDecision };
        rootNavigation.navigate(ROOT_SCREENS.PERMISSION_TO_SIGN, { extraData: MC.getUniqueInt() });
        }

    function onSigningDecision(permittedToSign : boolean) : void
        {
        nextOnSigningPermittedDecision(permittedToSign);
        rootNavigation.navigate(ROOT_SCREENS.BROWSER);
        }

    function PermissionToSignScreen() : JSX.Element
        {
        rootNavigation = useNavigation<StackNavigationProp<any>>();
        inWallet = false;
        return (
            <SafeAreaView>
                <View style={ mainStyles.screenHolder }>
                    <PermissionToSignView { ...nextPermissionToSignViewProps } />
                </View>
            </SafeAreaView>
            );
        }

    function askPermissionToSend(requestingURL : string, params : ContractCallParams, onSendingPermittedDecision : (permittedToSend : boolean, amountSat : string, gasLimit : number, gasPriceSat : number) => any) : void
        {
        nextOnSendingPermittedDecision = onSendingPermittedDecision;
        const nonce = MC.getUniqueInt();
        nextPermissionToSendViewProps = { nonce, requestingURL, params, onSendingPermittedDecision: onSendingDecision };
        rootNavigation.navigate(ROOT_SCREENS.PERMISSION_TO_SEND, { extraData: MC.getUniqueInt() });
        }

    function onSendingDecision(permittedToSign : boolean, amountSat : string, gasLimit : number, gasPriceSat : number) : void
        {
        nextOnSendingPermittedDecision(permittedToSign, amountSat, gasLimit, gasPriceSat);
        rootNavigation.navigate(ROOT_SCREENS.BROWSER);
        }

    function PermissionToSendScreen() : JSX.Element
        {
        rootNavigation = useNavigation<StackNavigationProp<any>>();
        inWallet = false;
        return (
            <SafeAreaView>
                <View style={ mainStyles.screenHolder }>
                    <PermissionToSendView { ...nextPermissionToSendViewProps } />
                </View>
            </SafeAreaView>
            );
        }

    function WalletScreen() : JSX.Element
        {
        rootNavigation = useNavigation<StackNavigationProp<any>>();
        inWallet = true;
        const am = MC.getMC().storage.accountManager;
        const initialWalletScreen = am.canLogin ? (am.isLoggedIn ? WALLET_SCREENS.ACCOUNT_HOME : WALLET_SCREENS.LOGIN) : WALLET_SCREENS.CREATE_ACCOUNT;
        return (
            <SafeAreaView>
                <View style={ mainStyles.screenHolder }>
                    <WalletView onBurgerPressed={ onBurgerPressed } getApi={ getWalletApi } initialScreen={ initialWalletScreen } />
                </View>
            </SafeAreaView>
            );
        }

    function WalletWorkingAsyncScreen() : JSX.Element
        {
        rootNavigation = useNavigation<StackNavigationProp<any>>();
        inWallet = false;
        useEffect(handleHardwareBackPress);
        const asyncWorkFunction = asyncWorkFunctionCopy;
        asyncWorkFunctionCopy = null;
        useEffect(() : void =>
            {
            if (asyncWorkFunction !== null)
                {
                asyncWorkFunction((result : WorkFunctionResult) : void =>
                    {
                    walletNavigate(result.nextScreen, result.nextScreenParams);
                    });
                }
            });
        return renderLoadingScreen();
        }

    function WalletWorkingScreen() : JSX.Element
        {
        rootNavigation = useNavigation<StackNavigationProp<any>>();
        inWallet = false;
        useEffect(handleHardwareBackPress);
        const workFunction = workFunctionCopy;
        workFunctionCopy = null;
        useEffect(() : void =>
            {
            if (workFunction !== null)
                {
                setTimeout(
                    () : void =>
                        {
                        const result = workFunction();
                        walletNavigate(result.nextScreen, result.nextScreenParams);
                        },
                    100);
                }
            });
        return renderLoadingScreen();
        }

    function renderLoadingScreen() : JSX.Element
        {
        return (
            <SafeAreaView>
                <View style={ mainStyles.screenHolder }>
                    <BurgerlessTitleBar title="MetriMask"/>
                    <View style={ commonStyles.horizontalBar }/>
                    <View style={{ height: 48 }}/>
                    <BurgerlessTitleBar title="Loading ..."/>
                    <View style={{ height: 48 }}/>
                    <View style={ commonStyles.squeezed }>
                        <ProgressBar style={{ height: 12 }} indeterminate color = "#600060" />
                    </View>
                </View>
            </SafeAreaView>
            );
        }

    function ShowEmergencyExit() : JSX.Element
        {
        rootNavigation = useNavigation<StackNavigationProp<any>>();
        useEffect(handleHardwareBackPressNoExit);
        return (
            <SafeAreaView>
                <View style={ mainStyles.screenHolder }>
                    <BurgerlessTitleBar title="Error Report"/>
                    <View style={ commonStyles.horizontalBar }/>
                    <View style={ commonStyles.squeezed }>
                        <View style={{ height: 24 }}/>
                        <Text style={{ color: "#000000" }}>Something has gone wrong, and the app is no longer able to continue. (Sometimes the problem is no internet connection).</Text>
                        <View style={{ height: 6 }}/>
                        <Text style={{ color: "#000000" }}>We apologize for the inconvenience. The following information is available about what went wrong:</Text>
                        <View style={{ height: 24 }}/>
                        <View style={{ backgroundColor: "#E0FFE0", padding: 6 }}>
                            <Text style={{ color: "#000000" }}>{ emeergencyExitMsg }</Text>
                        </View>
                        <View style={{ height: 24 }}/>
                        <SimpleButton text="Exit App" onPress={ () : void => MC.exitApp() }/>
                    </View>
                </View>
            </SafeAreaView>
            );
        }

    function ShowStarting() : JSX.Element
        {
        rootNavigation = useNavigation<StackNavigationProp<any>>();
        useEffect(handleHardwareBackPressNoExit);
        inWallet = false;

        function startupSequence() : void
            {
            function finishStartup() : void
                {
                isInitializing = false;
                Linking.addEventListener("url", (event : { url : string }) : void =>
                    {
                    MC.getMC().openUrlInNewTab(event.url);
                    });
                }

            MC.doAllInitialization().then(() =>
                {
                MC.getMC().setMainViewAPI(
                    {
                    goToBrowser: goToBrowser,
                    logout: logout,
                    emergencyExit: emergencyExit,
                    askPermissionToSign: askPermissionToSign,
                    askPermissionToSend: askPermissionToSend,
                    showWalletWorking: showWalletWorking,
                    showWalletWorkingAsync: showWalletWorkingAsync,
                    restartUserInactivityTimer: restartUserInactivityTimer,
                    setUserInactivityTimeoutMillis: setUserInactivityTimeoutMillis,
                    getUserInactivityTimeoutMillis: () : number => inactivityTimeoutMillis
                    });
                setUserInactivityTimeoutMillis(MC.getMC().storage.inactivityTimeout);
                Linking.getInitialURL().then((url : string | null) : void =>
                    {
                    finishStartup();
                    if (url)
                        MC.getMC().openUrlInNewTab(url);
                    else
                        rootNavigation.navigate(ROOT_SCREENS.WALLET);
                    })
                .catch((e : any) : void =>
                    {
                    finishStartup()
                    rootNavigation.navigate(ROOT_SCREENS.WALLET);
                    });
                })
            .catch((e : any) : void =>
                {
                MC.raiseError(`Error during intialization ${ e }`, "MainView startupSequence()");
                });
            }

        useEffect(() : void =>
            {
            setTimeout(startupSequence, 100);
            });

        return renderLoadingScreen();
        }

    function DrawerContent(props : DrawerContentProps) : JSX.Element
        {
        const mc : MC = MC.getMC();
        const isLoggedIn = mc && mc.storage.accountManager.isLoggedIn;

        function navigate(screen : string) : void
            {
            if (!isInitializing) props.navigation.navigate(screen);
            }

        type DrawerItemProps =
            {
            label   : string;
            onPress : () => any;
            }

        function renderBalance(am : AccountManager) : JSX.Element | null
            {
            const bal = am.current.wm.balanceSat;
            if (bal.lesser(BIG_0))
                return null;
            else
                return(
                    <>
                        <View style={{ height: 6 }}/>
                        <View style={ commonStyles.rowContainerV2 }>
                            <View style={{ flex: 1 }}/>
                            <Text style={{ color: "#000000" }}>{ formatSatoshi(bal, MRX_DECIMALS) + " MRX" }</Text>
                            <View style={{ flex: 1 }}/>
                        </View>
                    </>
                    )
            }

        function DrawerItem(props : DrawerItemProps) : JSX.Element
            {
            return (
                <TouchableRipple onPress={ props.onPress } rippleColor="#D080D0">
                    <Text style={{ color: "#000000", paddingTop: 6, paddingBottom: 6, paddingLeft: 24, paddingRight: 0 }}>{ props.label }</Text>
                </TouchableRipple>
                );
            }

        if (isLoggedIn)
            {
            const am = mc.storage.accountManager;
            return (
                <DrawerContentScrollView { ...props }>
                    <BurgerlessTitleBar title="MetriMask"/>
                    <View style={ commonStyles.horizontalBar }/>
                    <View style={{ height: 12 }}/>
                    <View style={ commonStyles.rowContainerV2 }>
                        <View style={{ flex: 1 }}/>
                        <Text style={{ color: "#000000" }}>{ am.current.accountName + " on " + am.current.wm.ninfo.name }</Text>
                        <View style={{ flex: 1 }}/>
                    </View>
                    { renderBalance(am) }
                    <View style={{ height: 12 }}/>
                    <View style={ commonStyles.horizontalBar }/>
                    <View style={{ height: 18 }}/>
                    <DrawerItem label="Browser"         onPress={ () : void => navigate(ROOT_SCREENS.BROWSER)                }/>
                    <DrawerItem label="Account Home"    onPress={ () : void => walletNavigate(WALLET_SCREENS.ACCOUNT_HOME)   }/>
                    <DrawerItem label="Send"            onPress={ () : void => walletNavigate(WALLET_SCREENS.SEND)           }/>
                    <DrawerItem label="Receive"         onPress={ () : void => walletNavigate(WALLET_SCREENS.RECEIVE)        }/>
                    <DrawerItem label="Add MRC20 Token" onPress={ () : void => walletNavigate(WALLET_SCREENS.ADD_TOKEN)      }/>
                    <DrawerItem label="Add Account"     onPress={ () : void => walletNavigate(WALLET_SCREENS.CREATE_ACCOUNT) }/>
                    <DrawerItem label="Export Account"  onPress={ () : void => walletNavigate(WALLET_SCREENS.EXPORT_ACCOUNT) }/>
                    <DrawerItem label="Settings"        onPress={ () : void => walletNavigate(WALLET_SCREENS.SETTINGS)       }/>
                    <DrawerItem label="Logout"          onPress={ () : void => MC.getMC().logout()                           }/>
                    <DrawerItem label="Exit"            onPress={ () : void => MC.exitApp()                                  }/>
                </DrawerContentScrollView>
                );
            }
        else
            return (
                <DrawerContentScrollView { ...props }>
                    <BurgerlessTitleBar title="MetriMask"/>
                    <View style={ commonStyles.horizontalBar }/>
                    <View style={{ height: 18 }}/>
                    <DrawerItem label="Browser" onPress={ () : void => navigate(ROOT_SCREENS.BROWSER) }/>
                    <DrawerItem label="Login"   onPress={ () : void => navigate(ROOT_SCREENS.WALLET)  }/>
                    <DrawerItem label="Exit"    onPress={ () : void => MC.exitApp()                   }/>
                </DrawerContentScrollView>
                );
        }
    
    function ShowMainView() : JSX.Element
        {
        return (
            <NavigationContainer>
                <RootDrawerNavigator.Navigator initialRouteName={ ROOT_SCREENS.STARTING } drawerContent={ DrawerContent } backBehavior="none" screenOptions={{ headerShown: false }}>
                    <RootDrawerNavigator.Screen name={ ROOT_SCREENS.BROWSER            } component={ BrowserScreen            }                                  />
                    <RootDrawerNavigator.Screen name={ ROOT_SCREENS.WALLET             } component={ WalletScreen             }                                  />
                    <RootDrawerNavigator.Screen name={ ROOT_SCREENS.PERMISSION_TO_SIGN } component={ PermissionToSignScreen   } options={{ swipeEnabled: false }}/>
                    <RootDrawerNavigator.Screen name={ ROOT_SCREENS.PERMISSION_TO_SEND } component={ PermissionToSendScreen   } options={{ swipeEnabled: false }}/>
                    <RootDrawerNavigator.Screen name={ ROOT_SCREENS.STARTING           } component={ ShowStarting             } options={{ swipeEnabled: false }}/>
                    <RootDrawerNavigator.Screen name={ ROOT_SCREENS.WORKING            } component={ WalletWorkingScreen      } options={{ swipeEnabled: false }}/>
                    <RootDrawerNavigator.Screen name={ ROOT_SCREENS.WORKING_ASYNC      } component={ WalletWorkingAsyncScreen } options={{ swipeEnabled: false }}/>
                    <RootDrawerNavigator.Screen name={ ROOT_SCREENS.EMERGENCY_EXIT     } component={ ShowEmergencyExit        } options={{ swipeEnabled: false }}/>
                </RootDrawerNavigator.Navigator>
            </NavigationContainer>
            );
        }

    return (
        <SafeAreaProvider>
            <UserInactivity isActive={ userActive } timeForInactivity={ inactivityTimeoutMillis } timeoutHandler={ TIMEOUT_HANDLER } getAPI={ getInactivityAPI } onAction={ onInactivityAction }>
                <ShowMainView />
            </UserInactivity>
        </SafeAreaProvider>
        );
    }
