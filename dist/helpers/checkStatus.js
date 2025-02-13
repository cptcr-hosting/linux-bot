"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = checkStatus;
async function checkStatus(url, debug) {
    try {
        const response = await fetch(url, { method: 'GET' });
        if (debug) {
            console.log(response);
        }
        return true;
    }
    catch (error) {
        return false;
    }
}
