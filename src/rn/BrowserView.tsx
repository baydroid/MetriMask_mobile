import React, { useState } from "react";
import { Text, View, StyleSheet, Platform, ScrollView } from "react-native";
import { IconButton, List } from 'react-native-paper';

import { MC } from "../mc";
import BrowserAllTabsView, { BrowserAllTabsViewAPI, BrowserTabContextBase } from "./BrowserAllTabsView";
import { BrowserTabContext } from "../BrowserTabContext";
import { commonStyles } from "./common";

export default BrowserView;
export type { BrowserViewProps };



const browserViewStyles = StyleSheet.create
    ({
    noTabsView:
        {
        flex: 1,
        alignItems: "center",
        margin: 0,
        padding: 0,
        border: 0
        },
    buttonBar:
        {
        height: 36,
        backgroundColor: "#FFF0FF",
        flexDirection: "row",
        },
    buttonView:
        {
        backgroundColor: "#FFF0FF",
        flex: 2,
        height: "100%",
        alignItems: "center",
        margin: 0,
        padding: 0,
        border: 0
        },
    halfButtonView:
        {
        backgroundColor: "#FFF0FF",
        flex: 1,
        height: "100%",
        },
    hilite:
        {
        backgroundColor: "#FFF0FF",
        },
    lolite:
        {
        backgroundColor: "#FFFFFF",
        },
    itemRow:
        {
        flexDirection: "row",
        },
    itemColumn:
        {
        flexDirection: "column",
        },
    });



type BrowserViewProps =
    {
    onBurgerPressed? : () => any;
    };

function BrowserView(props : BrowserViewProps) : JSX.Element
    {
    const [ showTabList, setShowTabList ] = useState<boolean>(false);
    const [ canGoForward, setCanGoForward ] = useState<boolean>(false);
    const [ canGoBack, setCanGoBack ] = useState<boolean>(false);
    const [ tabCount, setTabCount ] = useState<number>(1);

    let allTabsAPI : BrowserAllTabsViewAPI | null = null;

    function getApi(api : BrowserAllTabsViewAPI) : void
        {
        allTabsAPI = api;
        MC.getMC().setAllTabsAPI(api);
        }

    function onBurgerPressed() : void
        {
        props.onBurgerPressed && props.onBurgerPressed();
        }

    function onNewCanGoState(newCanGoForward : boolean, newCanGoBackward : boolean) : void
        {
        setCanGoForward(newCanGoForward);
        setCanGoBack(newCanGoBackward);
        }

    function onForwardPressed() : void
        {
        const tc = activeTab();
        tc && tc.goForward();
        }

    function onBackPressed() : void
        {
        const tc = activeTab();
        tc && tc.goBackward();
        }

    function onLoadPressed() : void
        {
        const tc = activeTab();
        tc && tc.reload();
        }

    function onNewTabPressed() : void
        {
        if (allTabsAPI)
            {
            allTabsAPI.setHiding(false);
            allTabsAPI.activateTab(new BrowserTabContext(""));
            }
        }

    function onBottomBarCloseTabPressed() : void
        {
        if (allTabsAPI)
            {
            allTabsAPI.setHiding(false);
            allTabsAPI.closeTabById(activeTabId());
            }
        }

    function onTabListPressed() : void
        {
        setShowTabList(true);
        if (allTabsAPI) allTabsAPI.setHiding(true);
        }

    function onExportPressed() : void
        {
        if (allTabsAPI) allTabsAPI.openInOtherBrowser();
        }

    function activeTabId() : number
        {
        return allTabsAPI ? allTabsAPI.activeTabId() : -1;
        }

    function activeTab() : BrowserTabContextBase | null
        {
        return allTabsAPI ? allTabsAPI.activeTab() : null;
        }

    function onTabListItemPressed(tabContext : BrowserTabContextBase) : void
        {
        setShowTabList(false);
        if (allTabsAPI)
            {
            allTabsAPI.setHiding(false);
            allTabsAPI.activateTab(tabContext);
            }
        }

    function onCloseTabListItemPressed(tabContext : BrowserTabContextBase) : void
        {
        if (tabCount <= 1) setShowTabList(false);
        if (allTabsAPI) allTabsAPI.closeTab(tabContext);
        }

    function onCloseTabListPressed() : void
        {
        setShowTabList(false);
        if (allTabsAPI) allTabsAPI.setHiding(false);
        }

    function TabList() : JSX.Element
        {
        function renderTabListHeader(title : string) : JSX.Element
            {
            return (
                <>
                    <View style = { commonStyles.topBar }>
                        <IconButton style = { commonStyles.icon } size = { 24 } icon = "menu" onPress = { onBurgerPressed }/>
                        <View style = { commonStyles.titleContainingView }>
                            <Text style = { commonStyles.titleText }>{ title }</Text>
                        </View>
                        <IconButton style = { commonStyles.icon } size = { 24 } icon = "close" onPress = { onCloseTabListPressed }/>
                    </View>
                    <View style={ commonStyles.horizontalBar }/>
                </>
                );
            }

        function renderTabListItems() : JSX.Element[]
            {
            return allTabsAPI!.mapTabs((tabContext : BrowserTabContextBase) : JSX.Element =>
                {
                return (
                    <View key = { tabContext.tabKey } style = { tabContext.tabId == activeTabId() ? browserViewStyles.hilite : browserViewStyles.lolite }>
                        <View style = { browserViewStyles.itemRow }>
                            <List.Item style = {{ flex: 1 }} title = { tabContext.currentTitle } description = { tabContext.currentUrl } onPress = { () => onTabListItemPressed(tabContext) } />
                            <View style = { browserViewStyles.itemColumn }>
                                <IconButton style = { commonStyles.icon } size = { 24 } icon = "close" onPress = { () => onCloseTabListItemPressed(tabContext) }/>
                                <View style = {{ flex: 1 }}/>
                            </View>
                        </View>
                        <View style={ commonStyles.horizontalBar }/>
                    </View>
                    );
                });
            }

        if (tabCount > 0)
            return (
                <>
                    { renderTabListHeader("Open Tabs") }
                    <ScrollView>
                        { renderTabListItems() }
                    </ScrollView>
                </>
                );
        else
            return renderTabListHeader("No Open Tabs");
        }

    function WebButtonBar() : JSX.Element
        {
        return (
            <View style = { browserViewStyles.buttonBar }>
                <View style = { browserViewStyles.buttonView }>
                    <IconButton style = { commonStyles.icon } color = "#600060" size = { 24 } icon = "arrow-left" disabled = { !canGoBack } onPress = { onBackPressed }/>
                </View>
                <View style = { browserViewStyles.buttonView }>
                    <IconButton style = { commonStyles.icon } color = "#600060" size = { 24 } icon = "refresh" disabled = { tabCount == 0 } onPress = { onLoadPressed }/>
                </View>
                <View style = { browserViewStyles.buttonView }>
                    <IconButton style = { commonStyles.icon } color = "#600060" size = { 24 } icon = "arrow-right" disabled = { !canGoForward } onPress = { onForwardPressed }/>
                </View>
                <View style = { browserViewStyles.halfButtonView }></View>
                <View style = { browserViewStyles.buttonView }>
                    <IconButton style = { commonStyles.icon } color = "#600060" size = { 24 } icon = "tab-plus" onPress = { onNewTabPressed }/>
                </View>
                <View style = { browserViewStyles.buttonView }>
                    <IconButton style = { commonStyles.icon } color = "#600060" size = { 24 } icon = "tab-remove" disabled = { tabCount == 0 } onPress = { onBottomBarCloseTabPressed }/>
                </View>
                <View style = { browserViewStyles.buttonView }>
                    <IconButton style = { commonStyles.icon } color = "#600060" size = { 24 } icon = "tab" disabled = { tabCount == 0 } onPress = { onTabListPressed }/>
                </View>
                <View style = { browserViewStyles.buttonView }>
                    <IconButton style = { commonStyles.icon } color = "#600060" size = { 24 } icon = "share-variant-outline" disabled = { tabCount == 0 } onPress = { onExportPressed }/>
                </View>
            </View>
            );
        }

    if (showTabList)
        return (
            <View style = { commonStyles.containingView } { ...(Platform.OS === "android" ? { collapsable: false } : { }) }>
                <BrowserAllTabsView hide = { true } getApi = { getApi } onBurgerPressed = { onBurgerPressed } onNewCanGoState = { onNewCanGoState } onNewTabCount = { setTabCount } />
                <TabList/>
            </View>
            );
    else if (tabCount > 0)
        return (
            <View style = { commonStyles.containingView } { ...(Platform.OS === "android" ? { collapsable: false } : { }) }>
                <BrowserAllTabsView hide = { false } getApi = { getApi } onBurgerPressed = { onBurgerPressed } onNewCanGoState = { onNewCanGoState } onNewTabCount = { setTabCount } />
                <WebButtonBar/>
            </View>
            );
    else
        return (
            <View style = { commonStyles.containingView } { ...(Platform.OS === "android" ? { collapsable: false } : { }) }>
                <BrowserAllTabsView hide = { true } getApi = { getApi } onBurgerPressed = { onBurgerPressed } onNewCanGoState = { onNewCanGoState } onNewTabCount = { setTabCount } />
                <View style = { commonStyles.topBar }>
                    <IconButton style = { commonStyles.icon } size = { 24 } icon = "menu" onPress = { onBurgerPressed }/>
                </View>
                <View style={ commonStyles.horizontalBar }/>
                <View style = {{ flex: 1 }}/>
                <View style = { commonStyles.titleContainingView }>
                    <Text style = { commonStyles.titleText }>No Open Tabs</Text>
                </View>
                <View style = {{ flex: 1 }}/>
                <View style = { commonStyles.titleContainingView }>
                    <Text>Use the</Text>
                    <IconButton style = { commonStyles.icon } color = "#600060" size = { 24 } icon = "tab-plus" onPress = { onNewTabPressed }/>
                    <Text>button to open a new tab.</Text>
                </View>
                <View style = {{ flex: 1 }}/>
                <WebButtonBar/>
            </View>
            );
    }
