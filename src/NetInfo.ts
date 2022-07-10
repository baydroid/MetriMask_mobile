import { Network, networks } from "metrixjs-wallet";
import { ItemType } from 'react-native-dropdown-picker';

import { MC } from "./mc";



export enum NET_ID
    {
    MAIN   = 0,
    TEST   = 1,
    REG    = 2,
    length = 3
    };

export class NetInfo
    {
    private ownId : number;
    private ownName : string;
    private ownTxUrlHeader : string;
    private hostNetwork : Network;

    constructor(name : string, id : number, ownTxUrlHeader : string, network : Network)
        {
        this.ownName = name;
        this.ownId = id;
        this.ownTxUrlHeader = ownTxUrlHeader;
        this.hostNetwork = network;
        }

    public get name()        : string  { return this.ownName;        }
    public get id()          : number  { return this.ownId;          }
    public get txUrlHeader() : string  { return this.ownTxUrlHeader; }
    public get network()     : Network { return this.hostNetwork;    }
    }

export class NetInfoManager
    {
    private infoArray : NetInfo[] = [ ];
    private infosByNmae : Map<string, NetInfo> = new Map<string, NetInfo>();

    public constructor()
        {
        this.infoArray.push(new NetInfo("MainNet", NET_ID.MAIN, "https://explorer.metrixcoin.com/tx/",         networks.mainnet));
        this.infoArray.push(new NetInfo("TestNet", NET_ID.TEST, "https://testnet-explorer.metrixcoin.com/tx/", networks.testnet));
        this.infoArray.push(new NetInfo("RegTest", NET_ID.REG,  "http://localhost/tx/",                        networks.regtest));
        for (const ni of this.infoArray) this.infosByNmae.set(ni.name, ni);
        }

    public fromId(id : number) : NetInfo
        {
        if (0 <= id && id < NET_ID.length)
            return this.infoArray[id];
        else
            MC.raiseError(`NetInfoManager unknown network id ${ id }`, "NetInfoManager fromId()");
        return this.infoArray[0]; // This never happens because MC.raiseError() exits the program. But I don't know how to tell typescript that.
        }

    public fromName(name : string) : NetInfo
        {
        const ni = this.infosByNmae.get(name);
        if (!ni) MC.raiseError(`NetInfoManager unknown network name ${ name }`, "NetInfoManager fromName()");
        return ni!;
        }

    public get netInfoDropDownItems() : ItemType<number>[]
        {
        const items : ItemType<number>[] = [ ];
        for (const ni of this.infoArray.values()) items.push({ label: ni.name, value: ni.id } );
        return items;
        }
    }



const manager = new NetInfoManager();

export function nim() : NetInfoManager
    {
    return manager;
    }
