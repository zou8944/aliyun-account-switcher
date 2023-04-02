import {ALIYUN_DOMAIN} from "./cookie.js";

async function get() {
    const storage = await chrome.storage.local.get(ALIYUN_DOMAIN);
    return storage[ALIYUN_DOMAIN];
}

async function getAccount(accountName) {
    const object = await get();
    if (object) {
        return object[accountName];
    } else {
        return undefined;
    }
}

async function put(object) {
    return await chrome.storage.local.set({[ALIYUN_DOMAIN]: object});
}

async function putAccount(accountName, accountObject, overrideDisplayName = false) {
    let object = await get();
    object = object || {};
    if (object[accountName]) {
        object[accountName].cookies = accountObject.cookies;
        object[accountName].account = accountObject.account;
        object[accountName].creationTime = accountObject.creationTime;
        if (overrideDisplayName) {
            object[accountName].displayName = accountObject.displayName;
        }
    } else {
        object[accountName] = accountObject;
    }
    return await put(object);
}

async function removeAccount(accountName) {
    const object = await get();
    delete object[accountName];
    return await put(object);
}

export {
    get, put, getAccount, putAccount, removeAccount
};