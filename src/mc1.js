"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.raiseError = exports.addEM = void 0;
const mc_1 = require("./mc");
function addEM(msg) {
    mc_1.MC.logErrorMessage(msg);
}
exports.addEM = addEM;
function raiseError(e, extraInfo) {
    mc_1.MC.raiseError(e, extraInfo);
}
exports.raiseError = raiseError;
