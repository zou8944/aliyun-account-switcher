const ALIYUN_DOMAIN = "aliyun.com";
const ALIYUN_ACCOUNT_COOKIE_NAME = "login_aliyunid";
const ALIYUN_ACCOUNT_SC_COOKIE_NAME = "login_aliyunid_sc";

async function getAllAliyunCookie() {
    return await chrome.cookies.getAll({domain: ALIYUN_DOMAIN});
}

async function getAliyunAccount() {
    const aliyunCookies = await getAllAliyunCookie();
    const aliyunAccountCookie = aliyunCookies.find(item => item.name === ALIYUN_ACCOUNT_COOKIE_NAME);
    return aliyunAccountCookie?.value?.replaceAll("\"", "");
}

async function getAliyunAccountCreationTime() {
    const aliyunCookies = await getAllAliyunCookie();
    const aliyunAccountScCookie = aliyunCookies.find(item => item.name === ALIYUN_ACCOUNT_SC_COOKIE_NAME);
    const creationTime = new Date(aliyunAccountScCookie.expirationDate * 1000);
    // 取 login_aliyunid_sc 创建时间的一个月前
    if (creationTime.getMonth() === 0) {
        creationTime.setFullYear(creationTime.getFullYear() - 1);
        creationTime.setMonth(11);
    } else {
        creationTime.setMonth(creationTime.getMonth() - 1);
    }
    return creationTime.getTime();
}

async function removeOne(cookie) {
    const protocol = cookie.secure ? "https" : "http";
    const cookieUrl = `${protocol}://${cookie.domain}${cookie.path}`;
    return await chrome.cookies.remove({
        url: cookieUrl,
        name: cookie.name,
        storeId: cookie.storeId
    });
}

async function restoreOne(cookie) {
    const protocol = cookie.secure ? "https" : "http";
    const domain = cookie.domain.charAt(0) === "." ? cookie.domain.substring(1) : cookie.domain;
    const cookieUrl = `${protocol}://${domain}${cookie.path}`;
    return chrome.cookies.set({
        url: cookieUrl,
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        expirationDate: cookie.expirationDate,
        creationTime: cookie.creationTime,
        storeId: cookie.storeId
    }).catch((error) => {
        console.log(error);
    });
}

export {
    ALIYUN_DOMAIN,
    getAllAliyunCookie,
    getAliyunAccount,
    getAliyunAccountCreationTime,
    removeOne,
    restoreOne
};