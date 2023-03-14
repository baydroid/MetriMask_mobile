import { MC } from "./mc";

export function addEM(msg : string) : void
    {
    MC.logErrorMessage(msg);
    }

export function raiseError(e : any, extraInfo : string) : void
    {
    MC.raiseError(e, extraInfo);
    }
