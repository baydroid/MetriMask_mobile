import uts46 from "idna-uts46";



const RX_ALPHANUMERIC : RegExp = /^[\p{L}\p{N}]*$/u;
const CH_DOT          : number = ".".charCodeAt(0);
const CH_COLON        : number = ":".charCodeAt(0);
const CH_SLASH        : number = "/".charCodeAt(0);
const CH_USCORE       : number = "_".charCodeAt(0);
const CH_0            : number = "0".charCodeAt(0);
const CH_9            : number = "9".charCodeAt(0);

let name   : string = "";
let cursor : number = 0;

export function isMnsName(str : string) : boolean
    {
    name = str;
    cursor = 0;
    if (name.length == 0) return false;
    scanDottedName(false);
    if (cursor < name.length) return false;
    try
        {
        uts46.toAscii(name, { useStd3ASCII: true, transitional: false });
        }
    catch (e)
        {
        return false;
        }
    return true;
    }

export function isUnschemedUrl(str : string) : boolean
    {
    name = str;
    cursor = 0;
    const dotCount = scanDottedName(true);
    if (cursor == 0 || dotCount == 0 || (dotCount == 1 && name.charCodeAt(cursor - 1) == CH_DOT)) return false;
    if (cursor >= name.length) return true;
    scanPort();
    return cursor < name.length ? name.charCodeAt(cursor) == CH_SLASH : true;
    }

function scanDottedName(includeTrailingDot : boolean) : number
    {
    const startPoint : number = cursor;
    let prevWasDot : boolean = false;
    let dotCount : number = 0;
    while (cursor < name.length)
        {
        const ch : string = name.charAt(cursor);
        const n : number = ch.charCodeAt(0);
        if (n == CH_DOT)
            {
            if (prevWasDot || cursor == startPoint) break;
            dotCount++;
            prevWasDot = true;
            }
        else
            {
            if (n == CH_USCORE)
                {
                if (!prevWasDot && cursor != startPoint) break;
                }
            else if (!ch.match(RX_ALPHANUMERIC))
                break;
            prevWasDot = false;
            }
        cursor++;
        }
    if (prevWasDot && !includeTrailingDot)
        {
        cursor--;
        dotCount--;
        }
    return dotCount;
    }

function scanPort() : void
    {
    const startPoint : number = cursor;
    if (cursor >= name.length || name.charCodeAt(cursor) != CH_COLON) return;
    cursor++;
    let digitCount : number = 0;
    while (cursor < name.length && digitCount < 5)
        {
        const n : number = name.charCodeAt(cursor);
        if (CH_0 <= n && n <= CH_9)
            digitCount++;
        else
            break;
        cursor++;
        }
    if (digitCount == 0) cursor = startPoint;
    }
