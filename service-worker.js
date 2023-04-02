const ALIYUN_DOMAIN = "aliyun.com";
const ALIYUN_ACCOUNT_COOKIE_NAME = "login_aliyunid";
const ALIYUN_ACCOUNT_SC_COOKIE_NAME = "login_aliyunid_sc";

/*
 budget 用途：展示当前账号的状态：有效、未登录、过期、已退出
 - 有效：显示账号名称。当前cookie中的账号未过期
 - 未登录：当前cookie中没有账号相关字段
 - 过期：当前cookie中的账号已过期

 只需要设置一个定时器，每几秒遍历一次当前状态并更新到badge上。不用监听cookie变化了。因为账号是session有效期，监听意义不大
 */
chrome.runtime.onInstalled.addListener(async function (details) {
    // 安装OK后马上更新badge状态
    await updateBadgeText();
    // 之后每五秒检查更新一次Badge状态
    setInterval(updateBadgeText, 5000);
    // 或者收到消息时更新一次
    chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
        if (request.type === "updateBadge") {
            await updateBadgeText();
        }
    });
});


async function updateBadgeText() {
    const currentCookies = await chrome.cookies.getAll({domain: ALIYUN_DOMAIN});
    // 当前账号不存在：未登录
    const currentAccountCookie = currentCookies.find(item => item.name === ALIYUN_ACCOUNT_COOKIE_NAME);
    const currentAccount = currentAccountCookie?.value?.replaceAll("\"", "");
    if (!currentAccount) {
        await chrome.action.setBadgeText({text: "未登录"});
        return;
    }
    // 当前账号登录超24小时：已过期
    // 原理：login_aliyunid_sc过期时间的一个月前就是当前账号的登录时间，阿里云服务器设置session有效期为24小时
    const aliyunAccountScCookie = currentCookies.find(item => item.name === ALIYUN_ACCOUNT_SC_COOKIE_NAME);
    if (!aliyunAccountScCookie) {
        await chrome.action.setBadgeText({text: "未登录"});
        return;
    }
    const loginTime = new Date(aliyunAccountScCookie.expirationDate * 1000);
    if (loginTime.getMonth() === 0) {
        loginTime.setFullYear(loginTime.getFullYear() - 1);
        loginTime.setMonth(11);
    } else {
        loginTime.setMonth(loginTime.getMonth() - 1);
    }
    if (new Date().getTime() > loginTime.getTime() + 24 * 60 * 60 * 1000) {
        await chrome.action.setBadgeText({text: "已过期"});
        return;
    }
    // 当前账号有效：显示账号别名 或 账号名
    const displayName = await getDisplayName(currentAccount);
    await chrome.action.setBadgeText({text: displayName});
}


async function getDisplayName(accountName) {
    // 存储中查询显示名，如果没有则用账号名
    const storageObject = (await chrome.storage.local.get(ALIYUN_DOMAIN))[ALIYUN_DOMAIN];
    if (!storageObject || !storageObject[accountName]) {
        return accountName.split("@")[1].trim();
    } else {
        let displayName = storageObject[accountName].displayName;
        if (displayName.includes(" @ ")) {
            displayName = displayName.split("@")[1].trim();
        }
        return displayName;
    }
}