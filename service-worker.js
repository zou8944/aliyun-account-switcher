const aliyunDomain = "aliyun.com";
const aliyunAccountCookieName = "login_aliyunid";

(async function () {
    const currentCookies = await chrome.cookies.getAll({domain: aliyunDomain});
    const currentAccountCookie = currentCookies.find(item => item.name === aliyunAccountCookieName);
    const currentAccount = currentAccountCookie?.value?.replaceAll("\"", "");
    if (currentAccount) {
        const badge = currentAccount.split("@")[1].trim();
        await chrome.action.setBadgeText({text: badge});
    } else {
        await chrome.action.setBadgeText({text: "未登录"});
    }
})();

chrome.cookies.onChanged.addListener(async (changeInfo) => {
    const cause = changeInfo.cause;
    const cookie = changeInfo.cookie;
    const removed = changeInfo.removed;
    if (cookie.name !== aliyunAccountCookieName) {
        return;
    }
    const badge = cookie.value.replaceAll("\"", "").split("@")[1].trim();
    switch (cause) {
        case "explicit":
            if (removed) {
                await chrome.action.setBadgeText({text: "已退出"});
            } else {
                await chrome.action.setBadgeText({text: badge});
            }
            break;
        case "overwrite":
            await chrome.action.setBadgeText({text: badge});
            break;
        case "expired":
        case "expired_overwrite":
            await chrome.action.setBadgeText({text: "过期"});
            break;
        case "evicted":
            await chrome.action.setBadgeText({text: "过期"});
            break;
    }
});
