chrome.cookies.onChanged.addListener(async (changeInfo) => {
    const cause = changeInfo.cause;
    const cookie = changeInfo.cookie;
    const removed = changeInfo.removed;
    if (cookie.name !== "login_aliyunid") {
        return;
    }
    const badge = cookie.value.replaceAll("\"", "").split("@")[1].trim();
    switch (cause) {
        case "explicit":
            if (removed) {
                await chrome.action.setBadgeText({text: "退出"});
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
            await chrome.action.setBadgeText({text: "驱逐"});
            break;
    }
});