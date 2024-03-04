import { APIProvider } from '@metrixcoin/metrilib';
import { MRXtoUSDOracle, getPriceOracle } from '@metrixnames/pricelib';



const PROVIDER                      : APIProvider    = new APIProvider('MainNet');
const ORACLE                        : MRXtoUSDOracle = getPriceOracle('MainNet', PROVIDER);
const POLLING_SLEEP_MILLIS          : number         = 55*60*1000; // 55 minutes
const POLLING_INTERVAL_MILLIS       : number         = 5*60*1000;  //  5 minutes
const ERROR_BACKOFF_INTERVAL_MILLIS : number         = 10*60*1000; // 10 minutes
const MIN_RESOLUTION_DIGITS         : number         = 14;
const BIG_0                         : bigint         = BigInt(0);
const BIG_1                         : bigint         = BigInt(1);
const BIG_2                         : bigint         = BigInt(2);
const BIG_10                        : bigint         = BigInt(10);



let thePriceFinder : USDPriceFinder | null = null;

export class USDPriceFinder
    {
    private started              : boolean = false;
    private satPerUSD            : bigint  = BIG_0;
    private satPerUSDDigitCount  : number  = 0;
    private epochTimeLastUpdated : number  = 0;

    public static getFinder() : USDPriceFinder
        {
        if (thePriceFinder == null) thePriceFinder = new USDPriceFinder();
        return thePriceFinder!;
        }

    private constructor() { }

    public get hasUSDPrice() : boolean
        {
        return this.satPerUSD != BIG_0;
        }

    public satoshiToUSD(satoshi : bigint | number | string) : string
        {
        if (!this.hasUSDPrice) return "";
        let sat : bigint = typeof satoshi == "bigint" ? satoshi : BigInt(satoshi);
        if (sat < BIG_0) return "";
        if (sat == BIG_0) return "0.00";
        const satDigitCount = sat.toString().length;
        let shifts : number = 2;
        if (satDigitCount < this.satPerUSDDigitCount + MIN_RESOLUTION_DIGITS)
            {
            shifts = this.satPerUSDDigitCount + MIN_RESOLUTION_DIGITS - satDigitCount;
            if (shifts < 2) shifts = 2;
            }
        let n : number = shifts;
        while (n--) sat = BIG_10*sat;
        let usd = this.divideRounding(sat, this.satPerUSD).toString();
        const usdDigitCount = usd.length;
        let pos : number;
        if (usdDigitCount <= shifts)
            {
            let n : number = shifts - usdDigitCount;
            while (n--) usd = "0" + usd;
            usd = "0." + usd;
            pos = 3;
            }
        else
            {
            pos = usdDigitCount - shifts;
            usd = usd.slice(0, pos) + "." + usd.slice(pos);
            pos += 2;
            }
        let trim : number = usd.length - 1;
        while (trim > pos && usd.charAt(trim) == "0") trim--;
        return this.shorten(usd.slice(0, trim + 1));
        }

    private divideRounding(dividend : bigint, divisor : bigint) : bigint
        {
        const quotient : bigint = dividend/divisor;
        const remainder : bigint = dividend - quotient*divisor;
        return remainder > divisor/BIG_2 ? quotient + BIG_1 : quotient;
        }

    private shorten(usd : string) : string 
        {
        if (usd.length < 5) return usd;
        let rp : number;
        if (usd.startsWith("0."))
            {
            rp = 2;
            while (rp < usd.length && usd.charAt(rp) == "0") rp++;
            if (rp >= usd.length) return "0.00";
            }
        else
            {
            rp = 1;
            while (usd.charAt(rp) != ".") rp++;
            }
        rp += 3;
        if (rp >= usd.length) return usd;
        if (this.roundUp(usd.charAt(rp)))
            {
            let x : number = rp - 1;
            while (true)
                {
                if (usd.charAt(x) == ".") x--;
                const newCh = this.inc(usd.charAt(x));
                usd = this.setCh(usd, x, newCh);
                if (newCh != "0") break;
                x--;
                if (x < 0)
                    {
                    usd = "1" + usd;
                    rp++;
                    break;
                    }
                }
            }
        if (rp < usd.length) usd = usd.slice(0, rp);
        if (usd.charAt(rp - 1) == ".")
            return usd + "00";
        if (usd.charAt(rp - 2) == ".")
            return usd + "0";
        else
            return usd;
        }

    private roundUp(digit : string) : boolean
        {
        return digit == "5" || digit == "6" || digit == "7" || digit == "8" || digit == "9";
        }

    private inc(digit : string) : string
        {
        switch (digit)
            {
            case "0": return "1";
            case "1": return "2";
            case "2": return "3";
            case "3": return "4";
            case "4": return "5";
            case "5": return "6";
            case "6": return "7";
            case "7": return "8";
            case "8": return "9"; 
            case "9": return "0";
            }
        return "0";
        }

    private setCh(s : string, i : number, ch : string) : string
        {
        return i >= 0 && i < s.length ? s.slice(0, i) + ch + s.slice(i + 1) : s;
        }

    public start() : Promise<void>
        {
        return new Promise<void>((resolve : () => any, reject : (e : any) => any) : void =>
            {
            if (this.started)
                {
                setTimeout(() : void => resolve(), 0);
                return;
                }
            this.started = true;
            this.fetch().then(() : void =>
                {
                this.fetchLoop(false);
                resolve();
                })
            .catch((e : any) : any =>
                {
                this.fetchLoop(true);
                resolve();
                });
            });
        }

    private fetchLoop(backoff : boolean) : void
        {
        const fetchAgain = () : void =>
            {
            this.fetch().then(() : void =>
                {
                this.fetchLoop(false);
                })
            .catch((e : any) : void =>
                {
                this.fetchLoop(true);
                });
            };

        let timeoutMillis : number = ERROR_BACKOFF_INTERVAL_MILLIS;
        if (!backoff)
            {
            const epochNowMillis : number = Date.now();
            const lastUpdatedMillis : number = 1000*this.epochTimeLastUpdated;
            const sinceLastUpadtedMillis : number = epochNowMillis > lastUpdatedMillis ? epochNowMillis - lastUpdatedMillis : 0;
            timeoutMillis = POLLING_SLEEP_MILLIS > sinceLastUpadtedMillis ? POLLING_SLEEP_MILLIS - sinceLastUpadtedMillis : POLLING_INTERVAL_MILLIS;
            }
        setTimeout(fetchAgain, timeoutMillis);
        }

    private fetch() : Promise<void>
        {
        return new Promise<void>((resolve : () => any, reject : (e : any) => any) : void =>
            {
            let hasFinished : boolean = false;
            let outCount : number = 2;
            let satPerUSD : bigint = BIG_0;
            let epochTimeLastUpdated : number = 0;

            const done = () : void =>
                {
                if (!hasFinished && --outCount == 0)
                    {
                    hasFinished = true;
                    this.satPerUSD = satPerUSD;
                    this.satPerUSDDigitCount = satPerUSD.toString().length;
                    this.epochTimeLastUpdated = epochTimeLastUpdated;
                    resolve();
                    }
                };

            const fail = (e : any) : void =>
                {
                if (!hasFinished)
                    {
                    hasFinished = true;
                    reject(e);
                    }
                };

            ORACLE.value().then((price : bigint) : void =>
                {
                satPerUSD = price;
                done();
                })
            .catch(fail);
            ORACLE.lastUpdate().then((lastUpdated : bigint) : void =>
                {
                epochTimeLastUpdated = parseInt(lastUpdated.toString());
                done();
                })
            .catch(fail);
            });
        }
    }
