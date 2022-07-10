import React, { useState, useRef, useCallback } from "react";
import { TextInput, View, StyleSheet, NativeSyntheticEvent, TextInputEndEditingEventData, Keyboard, Platform, Linking } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { WebViewNavigation, WebViewNavigationEvent, WebViewErrorEvent } from "react-native-webview/lib/WebViewTypes";
import { IconButton, ProgressBar } from 'react-native-paper';

import { commonStyles } from "./common";
import { DEFAULT_INITIAL_URL } from "../mc";



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
        backgroundColor: "white",
        borderRadius: 4,
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
    const [ currentUrl, setCurrentUrl ] = useState<string>((props.initialUrl || props.initialUrl == "") ? props.initialUrl : DEFAULT_INITIAL_URL);
    const [ urlInputText, setUrlInputText ] = useState<string>(currentUrl);
    const [ canGoBack, setCanGoBack ] = useState<boolean>(false);
    const [ canGoForward, setCanGoForward ] = useState<boolean>(false);
    const [ showLoading, setShowLoading ] = useState<boolean>(false);
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
        openInOtherBrowser: openInOtherBrowser
        });

    function openInOtherBrowser() : void
        {
        Linking.openURL(currentUrl).then((_ : any) : void => { ; }).catch((_ : any) : void => { ; });
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
        let newUrl = url.trim().toLowerCase();
        if (!newUrl.startsWith("https://") && !newUrl.startsWith("about:"))
            {
            if (newUrl.startsWith("http://")) newUrl = newUrl.substring(7);
            if (newUrl.indexOf("://") < 0) url = "https://" + newUrl;
            }
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
            return (<ProgressBar style = {{ height: 3 }} indeterminate color = "#600060" />);
        else
            return (<ProgressBar style = {{ height: 3 }} progress = { 1 } color = "#600060" />);
        }

    return (
        <View style = { isVisible() ? commonStyles.containingView : browserTabStyles.hiddenContainingView } { ...(Platform.OS === "android" && isVisible() ? { collapsable: false } : { }) }>
            <View style = { commonStyles.topBar }>
                <IconButton style = { commonStyles.icon } size = { 24 } icon = "menu" onPress = { onBurgerPressed }/>
                <TextInput
                    style = { browserTabStyles.urlTextInput }
                    onChangeText = { onChangeUrlTextInput }
                    onEndEditing = { onEndEditintgUrlTextInput }
                    value = { urlInputText == "about:blank" ? "" : urlInputText }
                    placeholder = "www.website.com"
                    />
            </View>
            <WebProgressBar/>
            <View style = { browserTabStyles.webView }>
                <WebView
                    style = { browserTabStyles.webView }
                    originWhitelist = {[ "*" ]}
                    source = {{ uri: currentUrl }}
                    injectedJavaScript = { initialJScript }
                    injectedJavaScriptBeforeContentLoaded = { initialBeforeJScript }
                    ref = { webref }
                    sharedCookiesEnabled = { true }
                    allowsInlineMediaPlayback
                    onLoad = { onWebViewLoad }
                    onLoadStart = { onLoadStart }
                    onLoadEnd = { onLoadEnd }
                    onNavigationStateChange = { onWebViewNavigationStateChange }
                    onMessage = { onWebViewMessage }
                    />
            </View>
        </View>
        );
    }