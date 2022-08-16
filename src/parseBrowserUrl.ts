import { MC } from "./mc";

const RX_ALPHANUMERIC = /^[\p{L}\p{N}]*$/u;
const CH_DOT = ".".charCodeAt(0);
const CH_DASH = "-".charCodeAt(0);
const CH_USCORE = "_".charCodeAt(0);



abstract class SearchEngine
    {
    public abstract get name() : string;
    public abstract makeSearchUrl(querry : string) : string;
    }

abstract class SimpleSearchEngine extends SearchEngine
    {
    private engineName : string;
    protected prefix : string;
    protected suffix : string;

    public constructor(name : string, prefix : string, suffix : string)
        {
        super();
        this.engineName = name;
        this.prefix = prefix;
        this.suffix = suffix;
        }

    public get name() : string
        {
        return this.engineName;
        }

    public abstract makeSearchUrl(querry : string) : string;
    }

class EncodingSearchEngine extends SimpleSearchEngine
    {
    public constructor(name : string, prefix : string, suffix : string)
        {
        super(name, prefix, suffix);
        }

    public makeSearchUrl(querry : string) : string
        {
        return this.prefix + encodeURIComponent(querry) + this.suffix;
        }
    }



const searchEngines : SearchEngine[] =
    [
    new EncodingSearchEngine("Google",       "https://www.google.com/search?q=",             ""),
    new EncodingSearchEngine("Bing",         "https://www.bing.com/search?q=",               ""),
    new EncodingSearchEngine("Yahoo!",       "https://search.yahoo.com/search?p=",           ""),
    new EncodingSearchEngine("Wikipedia",    "https://en.wikipedia.org/w/index.php?search=", ""),
    new EncodingSearchEngine("Ecosia",       "https://www.ecosia.org/search?q=",             ""),
    new EncodingSearchEngine("Duck Duck Go", "https://duckduckgo.com/?q=",                   ""),
    ];

let seIndexInited : boolean = false;
let seIndex : number = 0;



export function searchEngineIndex() : number
    {
    if (!seIndexInited)
        {
        seIndex = MC.getMC().storage.searchEngineIndex;
        seIndexInited = true;
        }
    return seIndex;
    }

export function searchEngineCount() : number
    {
    return searchEngines.length;
    }

export function searchEngineName(index : number) : string
    {
    return searchEngines[index].name;
    }

export function setSearchEngine(index : number) : void
    {
    seIndex = index;
    MC.getMC().storage.searchEngineIndex = index;
    }

export function parseBrowserUrl(s : string) : string
    {
    let url : string = s.toLowerCase();
    if (url.startsWith("about:")) return s;
    if (url.startsWith("http://")) return "https://" + s.substring(7);
    if (url.startsWith("https://")) return s;
    if (url.startsWith("file://")) return s;
    if (isUnschemedUrl(url)) return "https://" + url;
    return searchEngines[searchEngineIndex()].makeSearchUrl(s);
    }

function isUnschemedUrl(s : string) : boolean
    {
    const len = s.length;
    if (len < 3) return false;
    let prevWasDot : boolean = false;
    let dotCount : number = 0;
    for (let i : number = 0; i < len; i++)
        {
        const ch : string = s.charAt(i);
        const n : number = ch.charCodeAt(0);
        if (n == CH_DOT)
            {
            if (prevWasDot || i == 0) return false;
            prevWasDot = true;
            dotCount++;
            }
        else
            {
            prevWasDot = false;
            if (n != CH_USCORE && n != CH_DASH && !ch.match(RX_ALPHANUMERIC)) return false;
            }
        }
    return prevWasDot ? dotCount >= 2 : dotCount >= 1;
    }
