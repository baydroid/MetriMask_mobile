import { MC } from "../mc";
import { BrowserTabContextBase } from "./BrowserAllTabsView";



const MAX_WEB_REF_LIST_LENGTH = 100;



type WebRefListStorageObj =
    {
    refs : WebRefStorageObj[];
    };

export abstract class WebRefList
    {
    protected refList : WebRef[];
    private refMap : Map<string, WebRef> = new Map<string, WebRef>();
    private dirty : boolean = false;
    private notifyRefSelected : ((wref : WebRef) => any) | null = null
    private notifyRefDeleted : ((wref : WebRef) => any) | null = null

    protected abstract makeNewWebRef(so? : WebRefStorageObj) : WebRef;
    protected abstract saveSelf() : void;

    public constructor(refList? : WebRef[])
        {
        this.refList = refList ? refList : [ ];
        for (const wref of this.refList) this.refMap.set(unblat(wref.url), wref);
        }

    public setOnRefSelected(onRefSelected : ((wref : WebRef) => any) | null) : void
        {
        this.notifyRefSelected = onRefSelected;
        }

    public setOnRefDeleted(onRefDeleted : ((wref : WebRef) => any) | null) : void
        {
        this.notifyRefDeleted = onRefDeleted;
        }

    public get list() : WebRef[]
        {
        return this.refList;
        }

    public get length() : number
        {
        return this.refList.length;
        }

    public get isDirty() : boolean
        {
        const wasDirty : boolean = this.dirty;
        this.dirty = false;
        return wasDirty;
        }

    public deletePressed(wref : WebRef, index : number) : any
        {
        for (let i = index + 1; i < this.refList.length; i++) this.refList[i - 1] = this.refList[i];
        this.refList.length = this.refList.length - 1;
        this.refMap.delete(unblat(wref.url));
        this.saveSelf();
        if (this.notifyRefDeleted)
            {
            this.dirty = false;
            this.notifyRefDeleted(wref);
            }
        else
            this.dirty = true;
        }

    public selectPressed(wref : WebRef, index : number) : any
        {
        if (this.notifyRefSelected) this.notifyRefSelected(wref);
        }

    public addRef(tabContext : BrowserTabContextBase) : void
        {
        const url = unblat(tabContext.currentUrl);
        let wref = this.refMap.get(url);
        if (wref)
            {
            let iWref : number = 0;
            while (iWref < this.refList.length && this.refList[iWref].url != wref.url) iWref++;
            if (iWref >= this.refList.length) MC.raiseError(`WebRefList internal inconsistency`, `WebRefList`);
            for (let i : number = iWref - 1; i >= 0; i--) this.refList[i + 1] = this.refList[i];
            this.refList[0] = wref;
            wref.updateEpochMillis();
            }
        else
            {
            wref = this.makeNewWebRef().setFromTab(tabContext);
            this.refMap.set(url, wref);
            if (this.refList.length == 0)
                this.refList.push(wref);
            else if (this.refList.length < MAX_WEB_REF_LIST_LENGTH)
                {
                const lastWref : WebRef = this.refList[this.refList.length - 1];
                for (let i : number = this.refList.length - 2; i >= 0; i--) this.refList[i + 1] = this.refList[i];
                this.refList.push(lastWref);
                this.refList[0] = wref;
                }
            else
                {
                for (let i : number = this.refList.length - 2; i >= 0; i--) this.refList[i + 1] = this.refList[i];
                this.refList[0] = wref;
                }
            }
        this.saveSelf();
        }

    public static makeWebRefArray(storageStr : string, makeNewWebRef : (so? : WebRefStorageObj) => WebRef) : WebRef[]
        {
        const storageObj : WebRefListStorageObj = JSON.parse(storageStr);
        const refStorageObjs : WebRefStorageObj[] =storageObj.refs;
        const refs : WebRef[] = new Array(refStorageObjs.length);
        for (let i : number = 0; i < refStorageObjs.length; i++) refs[i] = makeNewWebRef(refStorageObjs[i]);
        return refs;
        }

    public toStorageStr() : string
        {
        const storageObjs : WebRefStorageObj[] = new Array(this.refList.length);
        for (let i : number = 0; i < this.refList.length; i++) storageObjs[i] = this.refList[i].getStorageObj();
        return JSON.stringify({ refs: storageObjs });
        }
    }



export type WebRefStorageObj =
    {
    url         : string;
    title       : string;
    epochMillis : number;
    };

export class WebRef
    {
    protected so : WebRefStorageObj;

    public constructor(so? : WebRefStorageObj)
        {
        this.so = so ? so : { url: "", title: "", epochMillis: 0 };
        }

    public get url() : string
        {
        return this.so.url;
        }

    public setFromTab(tabContext : BrowserTabContextBase) : WebRef
        {
        this.so.url = tabContext.currentUrl;
        this.so.title = tabContext.currentTitle;
        this.so.epochMillis = Date.now();
        return this;
        }

    public updateEpochMillis() : void
        {
        this.so.epochMillis = Date.now();
        }

    public getStorageObj() : WebRefStorageObj
        {
        return this.so;
        }
    }



function unblat(url : string) : string
    {
    const pos = url.indexOf("#");
    return pos >= 0 ? url.substring(0, pos) : url;
    }
