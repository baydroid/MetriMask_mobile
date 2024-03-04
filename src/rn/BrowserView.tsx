import React, { useEffect, useState } from "react";
import { Text, View, StyleSheet, Platform, TouchableWithoutFeedback, ListRenderItemInfo, FlatList } from "react-native";
import { IconButton, TouchableRipple } from 'react-native-paper';
import DropDownPicker, { ItemType } from 'react-native-dropdown-picker';

import { MC } from "../mc";
import BrowserAllTabsView, { BrowserAllTabsViewAPI, BrowserTabContextBase } from "./BrowserAllTabsView";
import { BrowserTabContext } from "./BrowserTabContext";
import { COLOR_BLACK, COLOR_DARK_PURPLE, COLOR_DARKISH_PURPLE, COLOR_PURPLE_RIPPLE, COLOR_WHITE, commonStyles, MenuOption, COLOR_LIGHT_PURPLE, COLOR_MIDDLE_GREY } from "./common";
import { WebRefList, WebRef, WebRefStorageObj } from "./WebRefList";
import { MRXStorage } from "../MRXStorage";
import { searchEngineCount, searchEngineIndex, searchEngineName, setSearchEngine } from "../parseBrowserUrl";



const browserViewStyles=StyleSheet.create
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
        backgroundColor: COLOR_LIGHT_PURPLE,
        flexDirection: "row",
        },
    buttonView:
        {
        backgroundColor: COLOR_LIGHT_PURPLE,
        flex: 2,
        height: "100%",
        alignItems: "center",
        margin: 0,
        padding: 0,
        border: 0
        },
    halfButtonView:
        {
        backgroundColor: COLOR_LIGHT_PURPLE,
        flex: 1,
        height: "100%",
        },
    hilite:
        {
        backgroundColor: COLOR_LIGHT_PURPLE,
        },
    lolite:
        {
        backgroundColor: COLOR_WHITE,
        },
    itemRow:
        {
        flexDirection: "row",
        },
    itemColumn:
        {
        flexDirection: "column",
        },
    modalView:
        {
        flex: 1,
        flexDirection: "column",
        backgroundColor: "transparent",
        justifyContent: "flex-end",
        alignItems: "flex-end",
        margin: 0,
        padding: 0,
        border: 0,
        },
    menuContainer:
        {
        position: 'absolute',
        zIndex: 1000,
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#00000080",
        },
    menu:
        {
        position: 'absolute',
        zIndex: 1001,
        backgroundColor: COLOR_WHITE,
        bottom: 24,
        right: 24,
        },
    });



abstract class RNWebRefList extends WebRefList
    {
    public abstract get title() : string;

    public get list() : RNWebRef[]
        {
        return this.refList as RNWebRef[];
        }

    protected makeNewWebRef(so? : WebRefStorageObj) : WebRef
        {
        return new RNWebRef(so);
        }
    }

export class WebFavouritesList extends RNWebRefList
    {
    public get title() : string
        {
        return "Favourites";
        }

    public static fromStorageStr(storageStr : string) : WebFavouritesList
        {
        return new WebFavouritesList(WebRefList.makeWebRefArray(storageStr, (so? : WebRefStorageObj) : WebRef => new RNWebRef(so)));
        }

    protected saveSelf() : void
        {
        MC.getMC().storage.browserFavourites = this;
        }
    }

export class WebHistoryList extends RNWebRefList
    {
    public get title() : string
        {
        return "History";
        }

    public static fromStorageStr(storageStr : string) : WebHistoryList
        {
        return new WebHistoryList(WebRefList.makeWebRefArray(storageStr, (so? : WebRefStorageObj) : WebRef => new RNWebRef(so)));
        }

    protected saveSelf() : void
        {
        MC.getMC().storage.browserHistory = this;
        }
    }

class RNWebRef extends WebRef
    {
    public render(wrList : WebRefList, index : number) : JSX.Element
        {
        const when = new Date(this.so.epochMillis);
        const description = when.toLocaleDateString() + " " + when.toLocaleTimeString(undefined, { hour12: false }) + "   " + this.so.url;
        return (
            <View key={ index + 1 } style={ browserViewStyles.lolite }>
                { renderListItem(this.so.title, description, () : void => wrList.selectPressed(this, index), () => wrList.deletePressed(this, index)) }
                <View style={ commonStyles.horizontalBar }/>
            </View>
            );
        }
    }



function renderListItem(title : string, description : string, onPress : () => any, onClose : () => any) : JSX.Element
    {
    return (
        <TouchableRipple style={{ flex: 1 }} rippleColor={ COLOR_PURPLE_RIPPLE } onPress={ onPress }>
            <View>
                <View style={ browserViewStyles.itemRow }>
                    <View style={{ flex: 1, paddingLeft: 12, paddingRight: 0, paddingTop: 9, paddingBottom: 9 }}>
                        <Text numberOfLines={ 1 } ellipsizeMode="tail" style={{ color: COLOR_BLACK }}>{ title }</Text>
                        <Text numberOfLines={ 1 } ellipsizeMode="tail" style={{ color: COLOR_MIDDLE_GREY }}>{ description }</Text>
                    </View>
                    <View style={ browserViewStyles.itemColumn }>
                        <IconButton style={{ ...commonStyles.icon, zIndex: 1000 }} rippleColor={ COLOR_PURPLE_RIPPLE } size={ 24 } icon="close" onPress={ onClose }/>
                        <View style={{ flex: 1 }}/>
                    </View>
                </View>
            </View>
        </TouchableRipple>
        );
    }



enum Screen
    {
    browser    = 0,
    tabs       = 1,
    favourites = 2,
    history    = 3,
    settings   = 4
    };

export type BrowserViewProps =
    {
    onBurgerPressed? : () => any;
    };

export default function BrowserView(props : BrowserViewProps) : JSX.Element
    {
    const [ whatShowing, setWhatShowing ] = useState<Screen>(Screen.browser);
    const [ canGoForward, setCanGoForward ] = useState<boolean>(false);
    const [ canGoBack, setCanGoBack ] = useState<boolean>(false);
    const [ tabCount, setTabCount ] = useState<number>(1);
    const [ menuShowing, setMenuShowing ] = useState<boolean>(false);
    const [ searchEngineDDOpen, setSearchEngineDDOpen ] = useState<boolean>(false);
    const [ searchEngineDDValue, setSearchEngineDDValue ] = useState<number>(searchEngineIndex());
    const [ searchEngineDDItems, setSearchEngineDDItems ] = useState<ItemType<number>[]>(initialSEItems());
    const [ tabNonce, setTabNonce ] = useState<number>(1);

    const mc : MC = MC.getMC();
    const storage : MRXStorage = mc.storage;
    const favourites : WebFavouritesList = storage.browserFavourites;
    const history : WebHistoryList = storage.browserHistory;

    let allTabsAPI : BrowserAllTabsViewAPI | null = null;

    function initialSEItems() : ItemType<number>[]
        {
        const len = searchEngineCount();
        const items : ItemType<number>[] = Array(len);
        for (let i = 0; i < len; i++) items[i] = { label: searchEngineName(i), value: i };
        return items;
        }

    function getApi(api : BrowserAllTabsViewAPI) : void
        {
        allTabsAPI = api;
        mc.setAllTabsAPI(api);
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
        openNewTab("");
        }

    function openNewTab(url : string) : void
        {
        if (allTabsAPI)
            {
            allTabsAPI.setHiding(false);
            allTabsAPI.activateTab(new BrowserTabContext(MC.getUniqueInt(), url));
            setTabNonce(tabNonce + 1);
            }
        }

    function onBottomBarCloseTabPressed() : void
        {
        if (allTabsAPI)
            {
            allTabsAPI.setHiding(false);
            allTabsAPI.closeTabById(activeTabId());
            setTabNonce(tabNonce + 1);
            }
        }

    function onTabListPressed() : void
        {
        setWhatShowing(Screen.tabs);
        if (allTabsAPI) allTabsAPI.setHiding(true);
        }

    function openMenu() : void
        {
        if (allTabsAPI)
            {
            allTabsAPI.activateMenu(renderMenu);
            setMenuShowing(true);
            }
        }

    function closeMenu() : void
        {
        if (allTabsAPI) allTabsAPI.dismissMenu();
        setMenuShowing(false);
        }

    function activeTabId() : number
        {
        return allTabsAPI ? allTabsAPI.activeTabId() : -1;
        }

    function activeTab() : BrowserTabContextBase | null
        {
        return allTabsAPI ? allTabsAPI.activeTab() : null;
        }

    function allTabsOnLoadEnd(tabContext : BrowserTabContextBase) : void
        {
        if (tabContext.currentUrl != "about:blank") history.addRef(tabContext);
        }

    function onTabListItemPressed(tabContext : BrowserTabContextBase) : void
        {
        resumeShowingBrowser();
        if (allTabsAPI)
            {
            allTabsAPI.setHiding(false);
            allTabsAPI.activateTab(tabContext);
            }
        }

    function openInOtherBrowser() : void
        {
        closeMenu();
        if (allTabsAPI) allTabsAPI.openInOtherBrowser();
        }

    function addFavourite() : void
        {
        closeMenu();
        if (allTabsAPI)
            {
            const activeTab : BrowserTabContextBase | null = allTabsAPI.activeTab();
            if (activeTab) favourites.addRef(activeTab);
            }
        }

    function setHome() : void
        {
        closeMenu();
        if (allTabsAPI)
            {
            const activeTab : BrowserTabContextBase | null = allTabsAPI.activeTab();
            if (activeTab) mc.storage.browserHomePage = activeTab.currentUrl;
            }
        }

    function onSelectSearchEngine(item : ItemType<number>) : void
        {
        setSearchEngine(item.value as number);
        setSearchEngineDDValue(item.value as number);
        }

    function showFavourites() : void
        {
        setWhatShowing(Screen.favourites);
        if (allTabsAPI) allTabsAPI.setHiding(true);
        closeMenu();
        }

    function showHistory() : void
        {
        setWhatShowing(Screen.history);            
        if (allTabsAPI) allTabsAPI.setHiding(true);
        closeMenu();
        }

    function showSettings() : void
        {
        setWhatShowing(Screen.settings);            
        if (allTabsAPI) allTabsAPI.setHiding(true);
        closeMenu();
        }

    function goToHome() : void
        {
        if (tabCount > 0)
            goToUrl(mc.storage.browserHomePage);
        else if (allTabsAPI)
            allTabsAPI.activateSoloTab(new BrowserTabContext(MC.getUniqueInt(), mc.storage.browserHomePage));
        closeMenu();
        }

    function goToUrl(url : string) : void
        {
        if (allTabsAPI)
            {
            const activeTab : BrowserTabContextBase | null = allTabsAPI.activeTab();
            if (activeTab)
                activeTab.goToUrl(url);
            else
                allTabsAPI.activateTab(new BrowserTabContext(MC.getUniqueInt(), url));
            }
        }

    function resumeShowingBrowser() : void
        {
        setWhatShowing(Screen.browser);
        if (allTabsAPI) allTabsAPI.setHiding(false);
        }

    function ListTabs() : JSX.Element
        {
        function onCloseTabListItemPressed(tabContext : BrowserTabContextBase) : void
            {
            setTabNonce(tabNonce + 1);
            if (allTabsAPI) allTabsAPI.closeTab(tabContext);
            if (tabCount <= 1) resumeShowingBrowser();
            }
    
        function renderItem(param : ListRenderItemInfo<BrowserTabContextBase>) : JSX.Element
            {
            const tabContext : BrowserTabContextBase = param.item;
            return (
                <View style={ tabContext.tabId == activeTabId() ? browserViewStyles.hilite : browserViewStyles.lolite }>
                    { renderListItem(tabContext.currentTitle, tabContext.currentUrl, () : void => onTabListItemPressed(tabContext), () => onCloseTabListItemPressed(tabContext)) }
                    <View style={ commonStyles.horizontalBar }/>
                </View>
                );
            }

        function getKey(tabContext : BrowserTabContextBase) : string
            {
            return tabContext.tabKey;
            }

        if (tabCount > 0)
            return (
                <>
                    { renderListHeader("Open Tabs") }
                    <FlatList<BrowserTabContextBase> data={ allTabsAPI!.tabList() } renderItem={ renderItem } keyExtractor={ getKey } extraData={ tabNonce }/>
                </>
                );
        else
            return renderListHeader("No Open Tabs");
        }

    function ListWebRefs(props : { list : RNWebRefList }) : JSX.Element
        {
        const [ nonce, setNonce ] = useState<number>(1);
        const list : RNWebRefList = props.list;

        function bumpNonce(wref : WebRef) : void
            {
            setNonce(nonce + 1);
            }

        function openWebRef(wref : WebRef) : void
            {
            if (tabCount > 0)
                goToUrl(wref.url);
            else if (allTabsAPI)
                allTabsAPI.activateSoloTab(new BrowserTabContext(MC.getUniqueInt(), wref.url));
            resumeShowingBrowser();
            }

        function renderItem(param : ListRenderItemInfo<RNWebRef>) : JSX.Element
            {
            return param.item.render(list, param.index);
            }

        function getKey(wref : RNWebRef) : string
            {
            return wref.url;
            }

        list.setOnRefSelected(openWebRef);
        list.setOnRefDeleted(bumpNonce);
        if (list.length > 0)
            return (
                <>
                    { renderListHeader(list.title) }
                    <FlatList<RNWebRef> data={ props.list.list } renderItem={ renderItem } keyExtractor={ getKey } extraData={ nonce }/>
                </>
                );
        else
            return renderListHeader(list.title);
        }

    function Settings() : JSX.Element
        {
        useEffect(() : (() => void) =>
            {
            return () : void =>
                {
                if (searchEngineDDOpen) setSearchEngineDDOpen(false);
                }
            });
    
        return (
            <View style={ commonStyles.containingView }>
                { renderListHeader("Browser Settings") }
                <View style={ { height: 24 } }/>
                <View style={ commonStyles.squeezed }>
                    <Text style={{ color: COLOR_MIDDLE_GREY}}>Default Search Engine:</Text>
                    <DropDownPicker
                        dropDownContainerStyle={{ borderColor: COLOR_DARKISH_PURPLE }}
                        style={{ borderColor: COLOR_DARKISH_PURPLE }}
                        maxHeight={ 300 }
                        flatListProps={{ initialNumToRender: searchEngineDDItems.length }}
                        items={ searchEngineDDItems }
                        open={ searchEngineDDOpen }
                        value={ searchEngineDDValue as number }
                        setOpen={ setSearchEngineDDOpen }
                        setValue={ setSearchEngineDDValue }
                        setItems={ setSearchEngineDDItems }
                        onSelectItem={ onSelectSearchEngine }/>
                </View>
            </View>
            );
        }

    function renderListHeader(title : string) : JSX.Element
        {
        return (
            <>
                <View style={ commonStyles.topBar }>
                    <IconButton style={ commonStyles.icon } rippleColor={ COLOR_PURPLE_RIPPLE } size={ 24 } icon="menu" onPress={ onBurgerPressed }/>
                    <View style={ commonStyles.titleContainingView }>
                        <Text style={ commonStyles.titleText }>{ title }</Text>
                    </View>
                    <IconButton style={ commonStyles.icon } rippleColor={ COLOR_PURPLE_RIPPLE } size={ 24 } icon="close" onPress={ resumeShowingBrowser }/>
                </View>
                <View style={ commonStyles.horizontalBar }/>
            </>
            );
        }

    function BrowserBottom() : JSX.Element
        {
        if (menuShowing && tabCount > 0)
            return (
                <View>
                    <WebButtonBar/>
                    <TouchableWithoutFeedback onPress={ closeMenu }>
                        <View style={ browserViewStyles.menuContainer }/>
                    </TouchableWithoutFeedback>
                </View>
                );
        else
            return (
                <WebButtonBar/>
                );
        }

    function WebButtonBar() : JSX.Element
        {
        return (
            <View style={ browserViewStyles.buttonBar }>
                <View style={ browserViewStyles.buttonView }>
                    <IconButton style={ commonStyles.icon } rippleColor={ COLOR_PURPLE_RIPPLE } iconColor={ COLOR_DARK_PURPLE } size={ 24 } icon="arrow-left" disabled={ !canGoBack } onPress={ onBackPressed }/>
                </View>
                <View style={ browserViewStyles.buttonView }>
                    <IconButton style={ commonStyles.icon } rippleColor={ COLOR_PURPLE_RIPPLE } iconColor={ COLOR_DARK_PURPLE } size={ 24 } icon="refresh" disabled={ tabCount == 0 } onPress={ onLoadPressed }/>
                </View>
                <View style={ browserViewStyles.buttonView }>
                    <IconButton style={ commonStyles.icon } rippleColor={ COLOR_PURPLE_RIPPLE } iconColor={ COLOR_DARK_PURPLE } size={ 24 } icon="arrow-right" disabled={ !canGoForward } onPress={ onForwardPressed }/>
                </View>
                <View style={ browserViewStyles.halfButtonView }></View>
                <View style={ browserViewStyles.buttonView }>
                    <IconButton style={ commonStyles.icon } rippleColor={ COLOR_PURPLE_RIPPLE } iconColor={ COLOR_DARK_PURPLE } size={ 24 } icon="tab-plus" onPress={ onNewTabPressed }/>
                </View>
                <View style={ browserViewStyles.buttonView }>
                    <IconButton style={ commonStyles.icon } rippleColor={ COLOR_PURPLE_RIPPLE } iconColor={ COLOR_DARK_PURPLE } size={ 24 } icon="tab-remove" disabled={ tabCount == 0 } onPress={ onBottomBarCloseTabPressed }/>
                </View>
                <View style={ browserViewStyles.buttonView }>
                    <IconButton style={ commonStyles.icon } rippleColor={ COLOR_PURPLE_RIPPLE } iconColor={ COLOR_DARK_PURPLE } size={ 24 } icon="tab" disabled={ tabCount == 0 } onPress={ onTabListPressed }/>
                </View>
                <View style={ browserViewStyles.buttonView }>
                    <IconButton style={ commonStyles.icon } rippleColor={ COLOR_PURPLE_RIPPLE } iconColor={ COLOR_DARK_PURPLE } size={ 24 } icon="dots-horizontal" onPress={ openMenu }/>
                </View>
            </View>
            );
        }

    function renderMenu() : JSX.Element
        {
        return (
            <TouchableWithoutFeedback onPress={ closeMenu }>
                <View style={ browserViewStyles.menuContainer }>
                    <View style={ browserViewStyles.menu }>
                        <MenuOption disabled={ tabCount == 0 } icon="heart-plus-outline"  label="Add Favourite"   onPress={ addFavourite       }/>
                        <MenuOption disabled={ false         } icon="heart-outline"       label="View Favourites" onPress={ showFavourites     }/>
                        <MenuOption disabled={ false         } icon="history"             label="History"         onPress={ showHistory        }/>
                        <MenuOption disabled={ tabCount == 0 } icon="home-switch-outline" label="Set Home"        onPress={ setHome            }/>
                        <MenuOption disabled={ false         } icon="home-outline"        label="Home"            onPress={ goToHome           }/>
                        <MenuOption disabled={ false         } icon="cog-outline"         label="Settings"        onPress={ showSettings       }/>
                        <MenuOption disabled={ tabCount == 0 } icon="launch"              label="Other Browser"   onPress={ openInOtherBrowser }/>
                    </View>
                </View>
            </TouchableWithoutFeedback>
            );
        }

    function renderBrowser() : JSX.Element
        {
        if (tabCount > 0)
            return (
                <View style={ commonStyles.containingView } { ...(Platform.OS === "android" ? { collapsable: false } : { }) }>
                    <BrowserAllTabsView hide={ false } getApi={ getApi } onBurgerPressed={ onBurgerPressed } onNewCanGoState={ onNewCanGoState } onNewTabCount={ setTabCount } allTabsOnLoadEnd={ allTabsOnLoadEnd } />
                    <BrowserBottom/>
                </View>
                );
        else
            return (
                <View style={ commonStyles.containingView } { ...(Platform.OS === "android" ? { collapsable: false } : { }) }>
                    { menuShowing ? renderMenu() : null }
                    <BrowserAllTabsView hide={ true } getApi={ getApi } onBurgerPressed={ onBurgerPressed } onNewCanGoState={ onNewCanGoState } onNewTabCount={ setTabCount } />
                    <View style={ commonStyles.topBar }>
                        <IconButton style={ commonStyles.icon } rippleColor={ COLOR_PURPLE_RIPPLE } size={ 24 } icon="menu" onPress={ onBurgerPressed }/>
                    </View>
                    <View style={ commonStyles.horizontalBar }/>
                    <View style={{ flex: 1 }}/>
                    <View style={ commonStyles.titleContainingView }>
                        <Text style={ commonStyles.titleText }>No Open Tabs</Text>
                    </View>
                    <View style={{ flex: 1 }}/>
                    <View style={ commonStyles.titleContainingView }>
                        <Text style={{ color: COLOR_BLACK }}>Use the</Text>
                        <IconButton style={ commonStyles.icon } rippleColor={ COLOR_PURPLE_RIPPLE } iconColor={ COLOR_DARK_PURPLE } size={ 24 } icon="tab-plus" onPress={ onNewTabPressed }/>
                        <Text style={{ color: COLOR_BLACK }}>button to open a new tab.</Text>
                    </View>
                    <View style={{ flex: 1 }}/>
                    <BrowserBottom/>
                </View>
                );
            }

    function renderTabs() : JSX.Element
        {
        return (
            <View style={ commonStyles.containingView } { ...(Platform.OS === "android" ? { collapsable: false } : { }) }>
                <BrowserAllTabsView hide={ true } getApi={ getApi } onBurgerPressed={ onBurgerPressed } onNewCanGoState={ onNewCanGoState } onNewTabCount={ setTabCount } />
                <ListTabs/>
            </View>
            );
        }

    function renderFavourites() : JSX.Element
        {
        return (
            <View style={ commonStyles.containingView } { ...(Platform.OS === "android" ? { collapsable: false } : { }) }>
                <BrowserAllTabsView hide={ true } getApi={ getApi } onBurgerPressed={ onBurgerPressed } onNewCanGoState={ onNewCanGoState } onNewTabCount={ setTabCount } />
                <ListWebRefs list={ favourites }/>
            </View>
            );
        }

    function renderHistory() : JSX.Element
        {
        return (
            <View style={ commonStyles.containingView } { ...(Platform.OS === "android" ? { collapsable: false } : { }) }>
                <BrowserAllTabsView hide={ true } getApi={ getApi } onBurgerPressed={ onBurgerPressed } onNewCanGoState={ onNewCanGoState } onNewTabCount={ setTabCount } />
                <ListWebRefs list={ history }/>
            </View>
            );
        }

    function renderSettings() : JSX.Element
        {
        return (
            <View style={ commonStyles.containingView } { ...(Platform.OS === "android" ? { collapsable: false } : { }) }>
                <BrowserAllTabsView hide={ true } getApi={ getApi } onBurgerPressed={ onBurgerPressed } onNewCanGoState={ onNewCanGoState } onNewTabCount={ setTabCount } />
                <Settings/>
            </View>
            );
        }

    switch (whatShowing)
        {
        case Screen.browser: default: return renderBrowser();
        case Screen.tabs:             return renderTabs();
        case Screen.favourites:       return renderFavourites();
        case Screen.history:          return renderHistory();
        case Screen.settings:         return renderSettings();
        }
    }
