import React, { useState } from "react";

import { BrowserTabContext } from "../BrowserTabContext";
import BrowserSingleTabView, { BrowserSingleTabViewAPI, BrowserSingleTabViewProps } from "./BrowserSingleTabView";
import { MC } from "../mc";



export abstract class BrowserTabContextBase
    {
    private viewAPI : BrowserSingleTabViewAPI | null = null;
    private ownTabId : number;
    private ownTabKey : string;
    private viewProps : BrowserSingleTabViewProps;
    private loadEndHook : ((tabContext : BrowserTabContextBase) => any) | null = null;;

    public abstract onMessageFromHtml(message : string) : void;
    public abstract onLoadStart() : void;
    public abstract onLoadEnd() : void;
    public abstract onTabClosed() : void;

    public constructor(tabId : number, initialUrl : string, injectedJavaScript : string | null = null, injectedJavaScriptBeforeContentLoaded : string | null = null)
        {
        this.ownTabId = tabId;
        this.ownTabKey = `Tab_${this.ownTabId}`;
        this.viewProps = { key: this.ownTabKey, ownTabId: this.ownTabId, activeTabId: -1, initialUrl: initialUrl };
        if (injectedJavaScript) this.viewProps.injectedJavaScript = injectedJavaScript;
        if (injectedJavaScriptBeforeContentLoaded) this.viewProps.injectedJavaScriptBeforeContentLoaded = injectedJavaScriptBeforeContentLoaded;
        this.viewProps.onMessage = (msg : string) : void => this.onMessageFromHtml(msg);
        this.viewProps.onLoadStart = () : void => this.onLoadStart();
        this.viewProps.onLoadEnd = () : void => this.handleLoadEnd();
        this.viewProps.getApi = (api : BrowserSingleTabViewAPI) : void => { this.viewAPI = api; };
        }

    public hookLoadEnd(onLoadEnd : ((tabContext : BrowserTabContextBase) => any) | null) : void
        {
        this.loadEndHook = onLoadEnd;
        }

    public handleLoadEnd() : void
        {
        this.onLoadEnd();
        if (this.loadEndHook) this.loadEndHook(this);
        }

    public openInOtherBrowser() : void
        {
        this.viewAPI && this.viewAPI.openInOtherBrowser();
        }

    public reload() : void
        {
        this.viewAPI && this.viewAPI.reload();
        }

    public get isOpen() : boolean
        {
        return this.viewAPI != null;
        }

    public get canGoForward() : boolean
        {
        return this.viewAPI ? this.viewAPI.canGoForward() : false;
        }

    public get canGoBackward() : boolean
        {
        return this.viewAPI ? this.viewAPI.canGoBackward() : false;
        }

    public goForward() : void
        {
        this.canGoForward && this.viewAPI!.goForward();
        }

    public goBackward() : void
        {
        this.canGoBackward && this.viewAPI!.goBackward();
        }

    public get currentUrl() : string
        {
        return this.viewAPI ? this.viewAPI.currentUrl() : "";
        }

    public get currentTitle() : string
        {
        return this.viewAPI ? this.viewAPI.currentTitle() : "";
        }

    public goToUrl(url : string) : void
        {
        this.viewProps.initialUrl = url;
        this.viewAPI && this.viewAPI.goToUrl(url);
        }

    public executeJavaScript(javaScriptSource : string) : void
        {
        this.viewAPI && this.viewAPI.executeJavaScript(javaScriptSource);
        }

    public activateMenu(renderMenu : () => JSX.Element) : void
        {
        this.viewAPI && this.viewAPI.activateMenu(renderMenu);
        }

    public dismissMenu() : void
        {
        this.viewAPI && this.viewAPI.dismissMenu();
        }

    public get tabId() : number
        {
        return this.ownTabId;
        }

    public get tabKey() : string
        {
        return this.ownTabKey;
        }

    public get tabViewProps() : BrowserSingleTabViewProps
        {
        return this.viewProps;
        }

    public browserAllTabsView_closedTab() : void
        {
        this.viewAPI = null;
        this.onTabClosed();
        }
    }



export function browserSetInitialUrl(url : string) : void
    {
    initialUrl = url;
    }

let initialUrl : string = "";
let firstTab : BrowserTabContext | null = null;

export type BrowserAllTabsViewAPI =
    {
    isHidden           : () => boolean;
    setHiding          : (hide : boolean) => void;
    activeTab          : () => BrowserTabContextBase | null;
    activeTabIndex     : () => number;
    activeTabId        : () => number;
    isActiveTabId      : (x : number) => boolean;
    isActiveTab        : (x : BrowserTabContextBase | null | undefined) => boolean;
    activateTab        : (tabContext : BrowserTabContextBase) => void;
    activateSoloTab    : (tabContext : BrowserTabContextBase) => void;
    closeTab           : (tabContext : BrowserTabContextBase) => void;
    closeTabById       : (tabId : number) => void;
    closeAllTabs       : () => void;
    tabCount           : () => number;
    tabList            : () => BrowserTabContextBase[];
    tabAtIndex         : (index : number) => BrowserTabContextBase | null;
    forEachTab         : (func : (tabContext : BrowserTabContextBase) => any) => void;
    mapTabs            : <MappedTabType>(mapper : (tabContext : BrowserTabContextBase) => MappedTabType) => MappedTabType[];
    activateTabAtIndex : (index : number) => void;
    closeTabAtIndex    : (index : number) => void;
    openInOtherBrowser : () => void;
    activateMenu       : (renderMenu : () => JSX.Element) => void;
    dismissMenu        : () => void;
    };

export type BrowserAllTabsViewProps =
    {
    hide?             : boolean;
    getApi?           : (api : BrowserAllTabsViewAPI) => any;
    onBurgerPressed?  : () => any;
    onNewCanGoState?  : (canGoForward : boolean, canGoBackward : boolean) => any;
    onNewTabCount?    : (tabCount : number) => any;
    allTabsOnLoadEnd? : (tabContext : BrowserTabContextBase) => any;
    };

export default function BrowserAllTabsView(props : BrowserAllTabsViewProps) : JSX.Element | null
    {
    const [ tabArray, setTabArray ] = useState<BrowserTabContextBase[]>([ provideFirstTab() ]);
    const [ activeTabIndex, setActiveTabIndex ] = useState<number>(0);
    const [ showActiveTab, setShowActiveTab ] = useState<boolean>(!props.hide);

    if (props.getApi) props.getApi(
        {
        isHidden: () => !showActiveTab,
        setHiding: setHiding,
        activeTabId: activeTabId,
        isActiveTabId: isActiveTabId,
        activeTab: activeTab,
        isActiveTab: isActiveTab,
        activateTab: activateTab,
        activateSoloTab: activateSoloTab,
        closeTab: closeTab,
        closeTabById: closeTabById,
        closeAllTabs: closeAllTabs,
        tabCount: tabCount,
        tabList: () => tabArray,
        tabAtIndex: tabAtIndex,
        forEachTab : forEachTab,
        mapTabs: mapTabs,
        activateTabAtIndex: activateTabAtIndex,
        closeTabAtIndex: closeTabAtIndex,
        activeTabIndex: () => activeTabIndex,
        openInOtherBrowser: openInOtherBrowser,
        activateMenu: activateMenu,
        dismissMenu: dismissMenu,
        });

    function provideFirstTab() : BrowserTabContext
        {
        if (initialUrl == "") initialUrl = MC.getMC().storage.browserHomePage;
        if (!firstTab) firstTab = new BrowserTabContext(MC.getUniqueInt(), initialUrl);
        return firstTab;
        }

    function activateMenu(renderMenu : () => JSX.Element) : void
        {
        if (activeTabIndex >= 0) tabArray[activeTabIndex].activateMenu(renderMenu);
        }

    function dismissMenu() : void
        {
        if (activeTabIndex >= 0) tabArray[activeTabIndex].dismissMenu();
        }

    function openInOtherBrowser() : void
        {
        const t = activeTab();
        if (t) t.openInOtherBrowser();
        }

    function setHiding(hide : boolean) : void
        {
        setShowActiveTab(!hide);
        }

    function activeTabId() : number
        {
        const t = activeTab();
        return t ? t.tabId : -1;
        }

    function isActiveTabId(x : number) : boolean
        {
        return x > 0 && x == activeTabId();
        }

    function activeTab() : BrowserTabContextBase | null
        {
        return activeTabIndex >= 0 ? tabArray[activeTabIndex] : null;
        }

    function isActiveTab(x : BrowserTabContextBase | null | undefined) : boolean
        {
        const a = activeTab();
        return (a && x) ? a.tabId == x.tabId : false;
        }

    function activateTab(tabContext : BrowserTabContextBase) : void
        {
        actualActivateTab(tabContext, false);
        }

    function activateSoloTab(tabContext : BrowserTabContextBase) : void
        {
        actualActivateTab(tabContext, true);
        }

    function actualActivateTab(tabContext : BrowserTabContextBase, soloIfNew : boolean) : void
        {
        if (isActiveTabId(tabContext.tabId)) return;
        let iTabToActivate = tabId2Index(tabContext.tabId);
        if (iTabToActivate >= 0)
            activateTabAtIndex(iTabToActivate);
        else if (soloIfNew)
            {
            setTabArray([ tabContext ]);
            setActiveTabIndex(0);
            notifyCanGoState(false, false);
            notifyTabCount(1);
            }
        else
            {
            const newTabArray : BrowserTabContextBase[] = Array(tabArray.length + 1);
            for (let i = 0; i < tabArray.length; i++) newTabArray[i] = tabArray[i];
            newTabArray[tabArray.length] = tabContext;
            setTabArray(newTabArray);
            setActiveTabIndex(newTabArray.length - 1);
            notifyCanGoState(tabContext.canGoForward, tabContext.canGoBackward);
            notifyTabCount(newTabArray.length);
            }
        }

    function closeTab(tabContext : BrowserTabContextBase) : void
        {
        closeTabById(tabContext.tabId);
        }

    function closeTabById(tabId : number) : void
        {
        closeTabAtIndex(tabId2Index(tabId));
        }

    function closeAllTabs() : void
        {
        if (!tabArray.length) return;
        tabArray.forEach((tab : BrowserTabContextBase) : void => { tab.browserAllTabsView_closedTab(); });
        setTabArray([ ]);
        setActiveTabIndex(-1);
        notifyCanGoState(false, false);
        notifyTabCount(0);
        }

    function tabCount() : number
        {
        return tabArray.length;
        }

    function tabAtIndex(index : number) : BrowserTabContextBase | null
        {
        return 0 <= index && index < tabArray.length ? tabArray[index] : null;
        }

    function forEachTab(func : (tabContext : BrowserTabContextBase) => any) : void
        {
        tabArray.forEach(func);
        }

    function mapTabs<MappedTabType>(mapper : (tabContext : BrowserTabContextBase) => MappedTabType) : MappedTabType[]
        {
        return tabArray.map(mapper);
        }

    function activateTabAtIndex(index : number) : void
        {
        if (index >= tabArray.length) index = tabArray.length - 1;
        if (index < 0) index = 0;
        const tab = tabArray[index];
        notifyCanGoState(tab.canGoForward, tab.canGoBackward);
        setActiveTabIndex(index);
        }

    function closeTabAtIndex(index : number) : void
        {
        if (index < 0 || index >= tabArray.length) return;
        const newTabArray : BrowserTabContextBase[] = Array(tabArray.length - 1);
        let j = 0;
        for (let i = 0; i < tabArray.length; i++)
            {
            if (i == index)
                tabArray[i].browserAllTabsView_closedTab();
            else
                newTabArray[j++] = tabArray[i];
            }
        let newActiveTabIndex = activeTabIndex;
        if (newTabArray.length == 0)
            newActiveTabIndex = -1;
        else if (index < activeTabIndex || (index == activeTabIndex && activeTabIndex > 0))
            newActiveTabIndex = activeTabIndex - 1;
        setTabArray(newTabArray);
        notifyTabCount(newTabArray.length);
        if (newActiveTabIndex >= 0)
            {
            const tab : BrowserTabContextBase = newTabArray[newActiveTabIndex];
            notifyCanGoState(tab.canGoForward, tab.canGoBackward);
            setActiveTabIndex(newActiveTabIndex);
            }
        else
            {
            notifyCanGoState(false, false);
            setActiveTabIndex(-1);
            }
        }

    function tabId2Index(tabId : number) : number
        {
        if (tabId > 0) for (let i = 0; i < tabArray.length; i++) if (tabArray[i].tabId == tabId) return i;
        return -1;
        }

    function onBurgerPressed() : void
        {
        props.onBurgerPressed && props.onBurgerPressed();
        }

    function onNewCanGoState(tabId : number, canGoForward : boolean, canGoBackward : boolean) : void
        {
        if (isActiveTabId(tabId)) notifyCanGoState(canGoForward, canGoBackward);
        }

    function notifyCanGoState(canGoForward : boolean, canGoBackward : boolean) : void
        {
        if (props.onNewCanGoState) props.onNewCanGoState(canGoForward, canGoBackward);
        }

    function notifyTabCount(tabCount : number) : void
        {
        if (props.onNewTabCount) props.onNewTabCount(tabCount);
        }

    function renderAllTabs() : JSX.Element[]
        {
        const atid = showActiveTab ? activeTabId() : -1;
        return tabArray.map((tabContext : BrowserTabContextBase) : JSX.Element =>
            {
            tabContext.hookLoadEnd(props.allTabsOnLoadEnd ? props.allTabsOnLoadEnd : null);
            return (
                <BrowserSingleTabView { ...tabContext.tabViewProps } activeTabId = { atid } onNewCanGoState = { onNewCanGoState } onBurgerPressed = { onBurgerPressed }/>
                );
            });
        }

    return tabArray.length > 0 ? (<>{ renderAllTabs() }</>) : null;
    }
