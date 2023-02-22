import React, { useEffect } from "react";
import { View, StyleSheet, Platform, Alert } from "react-native";
import { useNavigation } from '@react-navigation/native';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import {check, request, Permission, PERMISSIONS, RESULTS } from 'react-native-permissions';

import { CreateAccountView } from "./CreateAccountView";
import { ImportAccountView } from "./ImportAccountView";
import { LoginView } from "./LoginView";
import { AccountHomeView } from "./AccountHomeView";
import { AccountCreatedView } from "./AccountCreatedView";
import { AddTokenView, AddTokenViewSerializableProps } from "./AddTokenView";
import { AcceptTokenView } from "./AcceptTokenView";
import { SendView } from "./SendView";
import { TransactionSentView } from "./TransactionSentView";
import { QRAddressScanView, QR_SCANNER_TARGETS } from "./QRAddressScanView";
import { COLOR_WHITE, handleHardwareBackPress, normalizeProps } from "./common";
import { ReceiveView } from "./ReceiveView";
import { ExportAccountView } from "./ExportAccountView";
import { AccountExportedView } from "./AccountExportedView";
import { SettingsView } from "./SettingsView";
import { MC } from "../mc";
import { WorkFunctionResult } from "./MainView";
import { ResetAppView } from "./ResetAppView";
import { ConfirmSendView } from "./ConfirmSendView";



const walletStyles = StyleSheet.create
    ({
    screenHolder:
        {
        height: "100%",
        width: "100%",
        backgroundColor: COLOR_WHITE,
        },
    });



const ERROR_NO_QRSCANNER   = "QR code scanning is not available on this device.";
const ERROR_CAMERA_REFUSED = "Permission to use the camera has been denied.";

type PermissionStatus = "unavailable" | "denied" | "limited" | "granted" | "blocked";

export enum WALLET_SCREENS
    {
    CREATE_ACCOUNT   = "Wallet CreateAccount",
    ACCOUNT_CREATED  = "Wallet AccountCreated",
    IMPORT_ACCOUNT   = "Wallet ImportAccount",
    LOGIN            = "Wallet Login",
    ACCOUNT_HOME     = "Wallet AccountHome",
    ADD_TOKEN        = "Wallet AddToken",
    ACCEPT_TOKEN     = "Wallet AcceptToken",
    EXPORT_ACCOUNT   = "Wallet ExportAccount",
    ACCOUNT_EXPORTED = "Wallet AccountExported",
    SEND             = "Wallet Send",
    CONFIRM_SEND     = "Wallet ConfirmSend",
    QR_SCANNER       = "Wallet QRScanner",
    TX_SENT          = "Wallet TransactionSent",
    RECEIVE          = "Wallet Receive",
    SETTINGS         = "Wallet Settings",
    NO_SUCH_SCREEN   = "Wallet NoSuchScreen",
    RESET_APP        = "Wallet ResetApp",
    };

export type WalletViewAPI =
    {
    navigate : (screen : WALLET_SCREENS, props? : object) => void;
    };

export type WalletViewProps =
    {
    initialScreen?  : WALLET_SCREENS;
    onBurgerPressed : () => any;
    getApi?         : (api : WalletViewAPI) => any;
    };

function initCameraPermissionStatus() : PermissionStatus
    {
    const cameraPermission : Permission | null = getCameraPermission();
    if (cameraPermission)
        {
        check(cameraPermission)
            .then((ps : PermissionStatus) : void => { cameraPermissionStatus = ps; })
            .catch((e : Error) : void => { MC.raiseError(e, "WalletView initCameraPermissionStatus() Error checking for camera permission."); });
        return RESULTS.DENIED;
        }
    else
        return RESULTS.UNAVAILABLE;
    }

function getCameraPermission() : Permission | null
    {
    switch (Platform.OS)
        {
        case "android": return PERMISSIONS.ANDROID.CAMERA;
        case "ios":     return PERMISSIONS.IOS.CAMERA;
        default:        MC.raiseError(`Unknown platform ${ Platform.OS }`, "WalletView getCameraPermission()"); return PERMISSIONS.ANDROID.CAMERA;
        }
    }

const WalletNavigator = createStackNavigator();
let cameraPermissionStatus : PermissionStatus = initCameraPermissionStatus();
let onAddressScannedCopy : ((address : string) => any) | null = null;
let returnScreenCopy : WALLET_SCREENS = WALLET_SCREENS.SEND;

export default function WalletView(props : WalletViewProps) : JSX.Element
    {
    const initialScreen : WALLET_SCREENS = props.initialScreen ? props.initialScreen : WALLET_SCREENS.CREATE_ACCOUNT;
    let walletNavigation : any = null;
    if (props.getApi) props.getApi(
        {
        navigate: (screen : WALLET_SCREENS, props? : object) : void => { walletNavigation.navigate(screen, props); }
        });

    function onBurgerPressed() : void
        {
        props.onBurgerPressed();
        }

    function showWorkingAsync(asyncWorkFunction : (onWorkDone : (result : WorkFunctionResult) => any) => any, whatWorksGoingOn? : string) : void
        {
        MC.getMC().showWalletWorkingAsync(asyncWorkFunction, whatWorksGoingOn);
        }

    function showWorking(workFunction : () => WorkFunctionResult, whatWorksGoingOn? : string) : void
        {
        MC.getMC().showWalletWorking(workFunction, whatWorksGoingOn);
        }

    function qrShouldShowButton() : boolean
        {
        return cameraPermissionStatus != RESULTS.BLOCKED && cameraPermissionStatus != RESULTS.UNAVAILABLE;
        }

    function qrScanAddress(target : QR_SCANNER_TARGETS, returnScreen : WALLET_SCREENS, onAddressScanned : (address : string) => any) : void
        {
        const cameraPermission : Permission | null = getCameraPermission();
        if (cameraPermission)
            {
            check(cameraPermission)
                .then((ps : PermissionStatus) : void => { qrProcessPermissionCheck(ps, target, returnScreen, onAddressScanned); })
                .catch((e : Error) : void => { MC.raiseError(e, "WalletView.qrScanAddress() Error checking for camera permission."); });
            }
        else
            Alert.alert(ERROR_NO_QRSCANNER);
        }

    function qrProcessPermissionCheck(ps : PermissionStatus, target : QR_SCANNER_TARGETS, returnScreen : WALLET_SCREENS, onAddressScanned : (address : string) => any) : void
        {
        cameraPermissionStatus = ps;
        switch (ps)
            {
            case RESULTS.UNAVAILABLE:
                Alert.alert(ERROR_NO_QRSCANNER);
                break;
            case RESULTS.DENIED:
                const cameraPermission : Permission | null = getCameraPermission();
                if (cameraPermission)
                    {
                    request(cameraPermission)
                        .then((ps : PermissionStatus) : void => { qrProcessPermissionRequest(ps, target, returnScreen, onAddressScanned); })
                        .catch((e : Error) : void => { MC.raiseError(e, "Error requesting camera permission."); });
                    }
                else
                    Alert.alert(ERROR_NO_QRSCANNER);
                break;
            case RESULTS.LIMITED: case RESULTS.GRANTED:
                qrProcessPermissionRequest(ps, target, returnScreen, onAddressScanned);
                break;
            case RESULTS.BLOCKED:
                Alert.alert(ERROR_CAMERA_REFUSED);
                break;
            }
        }

    function qrProcessPermissionRequest(ps : PermissionStatus, target : QR_SCANNER_TARGETS, returnScreen : WALLET_SCREENS, onAddressScanned : (address : string) => any) : void
        {
        cameraPermissionStatus = ps;
        switch (ps)
            {
            case RESULTS.UNAVAILABLE:
                Alert.alert(ERROR_NO_QRSCANNER);
                break;
            case RESULTS.LIMITED: case RESULTS.GRANTED:
                if (onAddressScannedCopy !== null) MC.raiseError("2nd QR scan requested before 1st one done.", "WalletView processPermissionRequest()");
                onAddressScannedCopy = onAddressScanned;
                returnScreenCopy = returnScreen;
                walletNavigation.navigate(WALLET_SCREENS.QR_SCANNER, { target });
                break;
            case RESULTS.DENIED: case RESULTS.BLOCKED:
                Alert.alert(ERROR_CAMERA_REFUSED);
                break;
            }
        }

    function CreateAccountScreen() : JSX.Element
        {
        walletNavigation = useNavigation<StackNavigationProp<any>>();
        useEffect(handleHardwareBackPress);
        return (
            <SafeAreaView>
                <View style={ walletStyles.screenHolder }>
                    <CreateAccountView showWorkingAsync={ showWorkingAsync } onBurgerPressed={ onBurgerPressed }/>
                </View>
            </SafeAreaView>
            );
        }

    function ImportAccountScreen(props : any) : JSX.Element
        {
        walletNavigation = useNavigation<StackNavigationProp<any>>();
        useEffect(handleHardwareBackPress);
        return (
            <SafeAreaView>
                <View style={ walletStyles.screenHolder }>
                    <ImportAccountView { ...normalizeProps(props) } showWorkingAsync={ showWorkingAsync } onBurgerPressed={ onBurgerPressed }/>
                </View>
            </SafeAreaView>
            );
        }

    function LoginScreen(props : any) : JSX.Element
        {
        walletNavigation = useNavigation<StackNavigationProp<any>>();
        useEffect(handleHardwareBackPress);
        return (
            <SafeAreaView>
                <View style={ walletStyles.screenHolder }>
                    <LoginView { ...normalizeProps(props) } showWorkingAsync={ showWorkingAsync } onBurgerPressed={ onBurgerPressed }/>
                </View>
            </SafeAreaView>
            );
        }

    function AccountHomeScreen() : JSX.Element
        {
        walletNavigation = useNavigation<StackNavigationProp<any>>();
        useEffect(handleHardwareBackPress);
        return (
            <SafeAreaView>
                <View style={ walletStyles.screenHolder }>
                    <AccountHomeView showWorkingAsync={ showWorkingAsync } onBurgerPressed={ onBurgerPressed }/>
                </View>
            </SafeAreaView>
            );
        }

    function AccountCreatedScreen(props : any) : JSX.Element
        {
        walletNavigation = useNavigation<StackNavigationProp<any>>();
        useEffect(handleHardwareBackPress);
        return (
            <SafeAreaView>
                <View style={ walletStyles.screenHolder }>
                    <AccountCreatedView { ...normalizeProps(props) } onBurgerPressed={ onBurgerPressed }/>
                </View>
            </SafeAreaView>
            );
        }

    function AddTokenScreen(props : AddTokenViewSerializableProps) : JSX.Element
        {
        walletNavigation = useNavigation<StackNavigationProp<any>>();
        useEffect(handleHardwareBackPress);
        return (
            <SafeAreaView>
                <View style={ walletStyles.screenHolder }>
                    <AddTokenView { ...normalizeProps(props) } qrScanAddress={ qrScanAddress } qrShouldShowButton={ qrShouldShowButton } showWorkingAsync={ showWorkingAsync } onBurgerPressed={ onBurgerPressed }/>
                </View>
            </SafeAreaView>
            );
        }

    function AcceptTokenScreen(props : any) : JSX.Element
        {
        walletNavigation = useNavigation<StackNavigationProp<any>>();
        useEffect(handleHardwareBackPress);
        return (
            <SafeAreaView>
                <View style={ walletStyles.screenHolder }>
                    <AcceptTokenView { ...normalizeProps(props) } showWorking={ showWorking } onBurgerPressed={ onBurgerPressed }/>
                </View>
            </SafeAreaView>
            );
        }

    function ExportAccountScreen(props : any) : JSX.Element
        {
        walletNavigation = useNavigation<StackNavigationProp<any>>();
        useEffect(handleHardwareBackPress);
        return (
            <SafeAreaView>
                <View style={ walletStyles.screenHolder }>
                    <ExportAccountView { ...normalizeProps(props) } showWorking={ showWorking } onBurgerPressed={ onBurgerPressed }/>
                </View>
            </SafeAreaView>
            );
        }

    function AccountExportedScreen(props : any) : JSX.Element
        {
        walletNavigation = useNavigation<StackNavigationProp<any>>();
        useEffect(handleHardwareBackPress);
        return (
            <SafeAreaView>
                <View style={ walletStyles.screenHolder }>
                    <AccountExportedView { ...normalizeProps(props) } onBurgerPressed={ onBurgerPressed }/>
                </View>
            </SafeAreaView>
            );
        }

    function SendScreen(props : any) : JSX.Element
        {
        walletNavigation = useNavigation<StackNavigationProp<any>>();
        useEffect(handleHardwareBackPress);
        return (
            <SafeAreaView>
                <View style={ walletStyles.screenHolder }>
                    <SendView { ...normalizeProps(props) } qrScanAddress={ qrScanAddress } qrShouldShowButton={ qrShouldShowButton } showWorkingAsync={ showWorkingAsync } onBurgerPressed={ onBurgerPressed }/>
                </View>
            </SafeAreaView>
            );
        }

    function ConfirmSendScreen(props : any) : JSX.Element
        {
        walletNavigation = useNavigation<StackNavigationProp<any>>();
        useEffect(handleHardwareBackPress);
        return (
            <SafeAreaView>
                <View style={ walletStyles.screenHolder }>
                    <ConfirmSendView { ...normalizeProps(props) } showWorkingAsync={ showWorkingAsync } onBurgerPressed={ onBurgerPressed }/>
                </View>
            </SafeAreaView>
            );
        }

    function QRAddressScanScreen(props : any) : JSX.Element
        {
        walletNavigation = useNavigation<StackNavigationProp<any>>();
        useEffect(handleHardwareBackPress);
        const onAddressScanned = onAddressScannedCopy;
        onAddressScannedCopy = null;
        return (
            <SafeAreaView>
                <QRAddressScanView { ...normalizeProps(props) } returnScreen={ returnScreenCopy } onAddressScanned={ onAddressScanned } onBurgerPressed={ onBurgerPressed }/>
            </SafeAreaView>
            );
        }

    function TransactionSentScreen(props : any) : JSX.Element
        {
        walletNavigation = useNavigation<StackNavigationProp<any>>();
        useEffect(handleHardwareBackPress);
        return (
            <SafeAreaView>
                <View style={ walletStyles.screenHolder }>
                    <TransactionSentView { ...normalizeProps(props) } onBurgerPressed={ onBurgerPressed }/>
                </View>
            </SafeAreaView>
            );
        }

    function ReceiveScreen(props : any) : JSX.Element
        {
        walletNavigation = useNavigation<StackNavigationProp<any>>();
        useEffect(handleHardwareBackPress);
        return (
            <SafeAreaView>
                <View style={ walletStyles.screenHolder }>
                    <ReceiveView { ...normalizeProps(props) } onBurgerPressed={ onBurgerPressed }/>
                </View>
            </SafeAreaView>
            );
        }

    function SettingsScreen(props : any) : JSX.Element
        {
        walletNavigation = useNavigation<StackNavigationProp<any>>();
        useEffect(handleHardwareBackPress);
        return (
            <SafeAreaView>
                <View style={ walletStyles.screenHolder }>
                    <SettingsView { ...normalizeProps(props) } onBurgerPressed={ onBurgerPressed }/>
                </View>
            </SafeAreaView>
            );
        }

    function ResetAppScreen(props : any) : JSX.Element
        {
        walletNavigation = useNavigation<StackNavigationProp<any>>();
        useEffect(handleHardwareBackPress);
        return (
            <SafeAreaView>
                <View style={ walletStyles.screenHolder }>
                    <ResetAppView { ...normalizeProps(props) } onBurgerPressed={ onBurgerPressed }/>
                </View>
            </SafeAreaView>
            );
        }

    return (
        <WalletNavigator.Navigator initialRouteName={ initialScreen } screenOptions={{ animationEnabled: false, gestureEnabled: false, headerShown: false }}>
            <WalletNavigator.Screen name={ WALLET_SCREENS.IMPORT_ACCOUNT   } component={ ImportAccountScreen   }/>
            <WalletNavigator.Screen name={ WALLET_SCREENS.CREATE_ACCOUNT   } component={ CreateAccountScreen   }/>
            <WalletNavigator.Screen name={ WALLET_SCREENS.ACCOUNT_CREATED  } component={ AccountCreatedScreen  }/>
            <WalletNavigator.Screen name={ WALLET_SCREENS.LOGIN            } component={ LoginScreen           }/>
            <WalletNavigator.Screen name={ WALLET_SCREENS.ACCOUNT_HOME     } component={ AccountHomeScreen     }/>
            <WalletNavigator.Screen name={ WALLET_SCREENS.ADD_TOKEN        } component={ AddTokenScreen        }/>
            <WalletNavigator.Screen name={ WALLET_SCREENS.ACCEPT_TOKEN     } component={ AcceptTokenScreen     }/>
            <WalletNavigator.Screen name={ WALLET_SCREENS.SEND             } component={ SendScreen            }/>
            <WalletNavigator.Screen name={ WALLET_SCREENS.CONFIRM_SEND     } component={ ConfirmSendScreen     }/>
            <WalletNavigator.Screen name={ WALLET_SCREENS.EXPORT_ACCOUNT   } component={ ExportAccountScreen   }/>
            <WalletNavigator.Screen name={ WALLET_SCREENS.ACCOUNT_EXPORTED } component={ AccountExportedScreen }/>
            <WalletNavigator.Screen name={ WALLET_SCREENS.QR_SCANNER       } component={ QRAddressScanScreen   }/>
            <WalletNavigator.Screen name={ WALLET_SCREENS.TX_SENT          } component={ TransactionSentScreen }/>
            <WalletNavigator.Screen name={ WALLET_SCREENS.RECEIVE          } component={ ReceiveScreen         }/>
            <WalletNavigator.Screen name={ WALLET_SCREENS.SETTINGS         } component={ SettingsScreen        }/>
            <WalletNavigator.Screen name={ WALLET_SCREENS.RESET_APP        } component={ ResetAppScreen        }/>
        </WalletNavigator.Navigator>
        );
    }
