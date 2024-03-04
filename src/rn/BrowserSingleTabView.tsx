import React, { useState, useRef, useCallback } from "react";
import { TextInput, View, StyleSheet, NativeSyntheticEvent, TextInputEndEditingEventData, Keyboard, Platform, Linking } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { WebViewNavigation, WebViewNavigationEvent, WebViewErrorEvent } from "react-native-webview/lib/WebViewTypes";
import { IconButton, ProgressBar } from 'react-native-paper';

import { COLOR_BLACK, COLOR_DARK_PURPLE, COLOR_PURPLE_RIPPLE, commonStyles } from "./common";
import { MC } from "../mc";
import { parseBrowserUrl } from "../parseBrowserUrl";



const browserTabStyles = StyleSheet.create
    ({
    hiddenContainingView:
        {
        flex: 0,
        flexDirection: "column",
        opacity: 0,
        display: "none",
        width: 0,
        height: 0,
        },
    webView:
        {
        flex: 1,
        zIndex: 1
        },
    urlTextInput:
        {
        flex: 1,
        height: 40,
        color: COLOR_BLACK,
        borderWidth: 0,
        paddingLeft: 8,
        paddingRight: 8,
        },
    });



export type BrowserSingleTabViewAPI =
    {
    reload             : () => void;
    canGoForward       : () => boolean;
    canGoBackward      : () => boolean;
    goForward          : () => void;
    goBackward         : () => void;
    currentUrl         : () => string;
    currentTitle       : () => string;
    goToUrl            : (url : string) => void;
    executeJavaScript  : (javaScriptSource : string) => void;
    openInOtherBrowser : () => void;
    activateMenu       : (renderMenu : () => JSX.Element) => void;
    dismissMenu        : () => void;
    };

export type BrowserSingleTabViewProps =
    {
    key                                    : string;
    ownTabId                               : number;
    activeTabId                            : number;
    initialUrl?                            : string | null;
    injectedJavaScript?                    : string;
    injectedJavaScriptBeforeContentLoaded? : string;
    getApi?                                : (api : BrowserSingleTabViewAPI) => any;
    onMessage?                             : (msg : string) => any;
    onNewCanGoState?                       : (tabId : number, canGoForward : boolean, canGoBackward : boolean) => any;
    onLoadStart?                           : () => any;
    onLoadEnd?                             : () => any;
    onBurgerPressed?                       : () => any;
    };

export default function BrowserSingleTabView(props : BrowserSingleTabViewProps) : JSX.Element
    {
    const [ currentUrl, setCurrentUrl ] = useState<string>((props.initialUrl || props.initialUrl == "") ? props.initialUrl : MC.getMC().storage.browserHomePage);
    const [ urlInputText, setUrlInputText ] = useState<string>(currentUrl);
    const [ canGoBack, setCanGoBack ] = useState<boolean>(false);
    const [ canGoForward, setCanGoForward ] = useState<boolean>(false);
    const [ showLoading, setShowLoading ] = useState<boolean>(false);
    const [ menu, setMenu ] = useState<(() => JSX.Element) | null>(null);
    const webref = useRef<WebView>(null);
    const titleref = useRef<string>("");
	const isVisible = useCallback(() : boolean => props.activeTabId === props.ownTabId, [props.activeTabId, props.ownTabId]);

    const initialJScript = props.injectedJavaScript ? props.injectedJavaScript : "";
    const initialBeforeJScript = props.injectedJavaScriptBeforeContentLoaded ? props.injectedJavaScriptBeforeContentLoaded : "";

    if (props.getApi) props.getApi(
        {
        reload: onGoPressed,
        canGoForward: () => canGoForward,
        canGoBackward: () => canGoBack,
        goForward: onForwardPressed,
        goBackward: onBackPressed,
        currentUrl: getCurrentUrl,
        currentTitle: getCurrentTitle,
        goToUrl: goToUrl,
        executeJavaScript: executeJavaScript,
        openInOtherBrowser: openInOtherBrowser,
        activateMenu: activateMenu,
        dismissMenu: dismissMenu,
        });

    function openInOtherBrowser() : void
        {
        Linking.openURL(currentUrl).then((_ : any) : void => { ; }).catch((_ : any) : void => { ; });
        }

    function activateMenu(renderMenu : () => JSX.Element) : void
        {
        if (!menu && isVisible()) setMenu(() : () => JSX.Element => renderMenu); // Set state methods always execute any function argument and set the state to what the function returns.
        }

    function dismissMenu() : void
        {
        if (menu) setMenu(null);
        }

    function getCurrentUrl() : string
        {
        return currentUrl;
        }

    function getCurrentTitle() : string
        {
        return titleref.current;
        }

    function goToUrl(url : string) : void
        {
        url = parseBrowserUrl(url);
        setUrlInputText(url);
        setCurrentUrl(url);
        }

    function executeJavaScript(src : string) : void
        {
        if (webref.current) webref.current.injectJavaScript(src);
        }

    function onWebViewLoad(wvEvent : WebViewNavigationEvent) : void
        {
        processWebViewNavigation(wvEvent.nativeEvent);
        }

    function onWebViewNavigationStateChange(navEvent : WebViewNavigation) : void
        {
        processWebViewNavigation(navEvent);
        }

    function processWebViewNavigation(navEvent : WebViewNavigation) : void
        {
        setCanGoBack(navEvent.canGoBack);
        setCanGoForward(navEvent.canGoForward);
        goToUrl(navEvent.url);
        setShowLoading(navEvent.loading);
        titleref.current = navEvent.title;
        if (props.onNewCanGoState) props.onNewCanGoState(props.ownTabId, navEvent.canGoForward, navEvent.canGoBack);
        }

    function onWebViewMessage(wvEvent : WebViewMessageEvent) : void
        {
        const msgStr = wvEvent.nativeEvent.data;
        if (props.onMessage) props.onMessage(msgStr);
        }

    function onChangeUrlTextInput(newUrlText : string) : void
        {
        setUrlInputText(newUrlText);
        };

    function onEndEditintgUrlTextInput(wvEvent : NativeSyntheticEvent<TextInputEndEditingEventData>) : void
        {
        goToUrl(urlInputText);
        }

    function onBurgerPressed() : void
        {
        if (props.onBurgerPressed) props.onBurgerPressed();
        }

    function onForwardPressed() : void
        {
        webref.current && webref.current.goForward();
        }

    function onBackPressed() : void
        {
        webref.current && webref.current.goBack();
        }

    function onGoPressed() : void
        {
        if (urlInputText != currentUrl)
            goToUrl(urlInputText);
        else
            webref.current && webref.current.reload();
        Keyboard.dismiss();
        }

    function onLoadStart(wvEvent : WebViewNavigationEvent) : void
        {
        const { nativeEvent } = wvEvent;
        setShowLoading(nativeEvent.loading);
        if (props.onLoadStart) props.onLoadStart();
        }

    function onLoadEnd(wvEvent : WebViewNavigationEvent | WebViewErrorEvent) : void
        {
        const { nativeEvent } = wvEvent;
        setShowLoading(nativeEvent.loading);
        if (props.onLoadEnd) props.onLoadEnd();
        }

    function WebProgressBar() : JSX.Element
        {
        if (showLoading)
            return (<ProgressBar style={{ height: 3 }} indeterminate color={ COLOR_DARK_PURPLE }/>);
        else
            return (<ProgressBar style={{ height: 3 }} progress={ 1 } color={ COLOR_DARK_PURPLE }/>);
        }

    const BLANK_SOURCE = { html: "<!doctype html><html><head></head><body></body></html>" };
    const webViewSource = Platform.OS === "ios" && currentUrl == "" ? BLANK_SOURCE : { uri: currentUrl };
    const keyboardType = Platform.OS === "ios" ? "web-search" : "url";

    return (
        <View style={ isVisible() ? commonStyles.containingView : browserTabStyles.hiddenContainingView } { ...(Platform.OS === "android" && isVisible() ? { collapsable: false } : { }) }>
            { menu ? menu() : null }
            <View style={ commonStyles.topBar }>
                <IconButton style={ commonStyles.icon } rippleColor={ COLOR_PURPLE_RIPPLE } size={ 24 } icon="menu" onPress={ onBurgerPressed }/>
                <TextInput
                    style={ browserTabStyles.urlTextInput }
                    onChangeText={ onChangeUrlTextInput }
                    onEndEditing={ onEndEditintgUrlTextInput }
                    value={ urlInputText == "about:blank" ? "" : urlInputText }
                    placeholder="www.website.com"
                    keyboardType={ keyboardType }
                    />
            </View>
            <WebProgressBar/>
            <View style={ browserTabStyles.webView }>
                <WebView
                    style={ browserTabStyles.webView }
                    originWhitelist={[ "*" ]}
                    source={ webViewSource }
                    injectedJavaScript={ initialJScript }
                    injectedJavaScriptBeforeContentLoaded={ initialBeforeJScript }
                    ref={ webref }
                    sharedCookiesEnabled={ true }
                    allowsInlineMediaPlayback
                    onLoad={ onWebViewLoad }
                    onLoadStart={ onLoadStart }
                    onLoadEnd={ onLoadEnd }
                    onNavigationStateChange={ onWebViewNavigationStateChange }
                    onMessage={ onWebViewMessage }
                    />
            </View>
        </View>
        );
    }
