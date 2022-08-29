import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useNavigation } from '@react-navigation/native';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';

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
import { handleHardwareBackPress, normalizeProps } from "./common";
import { ReceiveView } from "./ReceiveView";
import { ExportAccountView } from "./ExportAccountView";
import { AccountExportedView } from "./AccountExportedView";
import { SettingsView } from "./SettingsView";
import { MC } from "../mc";
import { WorkFunctionResult } from "./MainView";
import { ResetAppView } from "./ResetAppView";



const walletStyles = StyleSheet.create
    ({
    screenHolder:
        {
        height: "100%",
        width: "100%",
        backgroundColor: "white",
        },
    });



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
    QR_SCANNER       = "Wallet QRScanner",
    TX_SENT          = "Wallet TransactionSent",
    RECEIVE          = "Wallet Receive",
    SETTINGS         = "Wallet Settings",
    NO_SUCH_SCREEN   = "Wallet NoSuchScreen",
    RESET_APP        = "Wallet Reset App",
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

const WalletNavigator = createStackNavigator();
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

    function showWorkingAsync(asyncWorkFunction : (onWorkDone : (result : WorkFunctionResult) => any) => any) : void
        {
        MC.getMC().showWalletWorkingAsync(asyncWorkFunction);
        }

    function showWorking(workFunction : () => WorkFunctionResult) : void
        {
        MC.getMC().showWalletWorking(workFunction);
        }

    function qrScanAddress(target : QR_SCANNER_TARGETS, returnScreen : WALLET_SCREENS, onAddressScanned : (address : string) => any) : void
        {
        if (onAddressScannedCopy !== null) MC.raiseError("2nd QR scan requested before 1st one done.", "WalletView qrScanAddress()");
        onAddressScannedCopy = onAddressScanned;
        returnScreenCopy = returnScreen;
        walletNavigation.navigate(WALLET_SCREENS.QR_SCANNER, { target });
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
                    <AddTokenView { ...normalizeProps(props) } qrScanAddress={ qrScanAddress } showWorkingAsync={ showWorkingAsync } onBurgerPressed={ onBurgerPressed }/>
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
                    <SendView { ...normalizeProps(props) } qrScanAddress={ qrScanAddress } showWorkingAsync={ showWorkingAsync } onBurgerPressed={ onBurgerPressed }/>
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
