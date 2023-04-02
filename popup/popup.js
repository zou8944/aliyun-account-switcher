import * as cookie from "./cookie.js";
import * as storage from "./storage.js";

(async function () {
    const aliyunCookies = await cookie.getAllAliyunCookie();
    const currentAccount = await cookie.getAliyunAccount();
    const creationTime = await cookie.getAliyunAccountCreationTime();
    if (currentAccount) {
        await storage.putAccount(currentAccount, {
            accountName: currentAccount,
            displayName: currentAccount,
            cookies: aliyunCookies,
            creationTime: creationTime,
        });
    }

    await renderPopupListFromStorage(currentAccount);
    await bindActionInPopupList();

})();

async function renderPopupListFromStorage(currentAccount) {
    const storedObject = await storage.get();
    if (!storedObject) {
        return;
    }
    const textHTMLs = [];
    for (let name in storedObject) {
        const {accountName, displayName, _, creationTime} = storedObject[name];
        const creationDate = new Date(creationTime);
        const remainingSeconds = (creationTime - new Date().getTime() + 24 * 3600 * 1000) / 1000;
        const hoursLeft = Math.floor(remainingSeconds / 60 / 60 % 24);
        const minutesLeft = Math.floor(remainingSeconds / 60 % 60);
        const secondsLeft = Math.floor(remainingSeconds % 60);
        const textClass = accountName === currentAccount ? "selected" : "selectable";
        let timeLeftClass = "";
        let timeLeftText = "";
        if (remainingSeconds > 10 * 60) {
            timeLeftClass = "far-from-expired";
            timeLeftText = `${hoursLeft}:${minutesLeft}:${secondsLeft}`;
        } else if (remainingSeconds > 0) {
            timeLeftClass = "almost-expired";
            timeLeftText = `${hoursLeft}:${minutesLeft}:${secondsLeft}`;
        } else {
            timeLeftClass = "expired";
            timeLeftText = "已过期";
        }
        textHTMLs.push(`<div class="row" id="row-${accountName}">
                                <div class="row-main">
                                    <div class="display-name ${textClass}">${displayName}</div>
                                    <div class="button rename">重命名</div>
                                    <div class="button delete">退出</div>
                                </div>
                                <div class="row-foot">
                                    <div class="account">账号名: ${accountName}</div>
                                    <div class="creation-time">创建时间: ${creationDate.toLocaleString()}</div>
                                    <div class="time-left ${timeLeftClass}">有效时间剩余: ${timeLeftText}</div>
                                </div>
                            </div>`);
    }
    document.getElementById("list-container").innerHTML = textHTMLs.join("\n");
}

async function bindActionInPopupList() {
    // 文本点击事件：账号切换
    const selectableTexts = document.getElementsByClassName("display-name");
    Array.from(selectableTexts).forEach(element => element.addEventListener("click", accountSwitchListener));
    // 按钮点击事件：重命名
    const renameButtons = document.getElementsByClassName("rename");
    Array.from(renameButtons).forEach(element => element.addEventListener("click", accountRenameListener));
    // 按钮点击事件：账号删除
    const deleteButtons = document.getElementsByClassName("delete");
    Array.from(deleteButtons).forEach(element => element.addEventListener("click", accountDeletionListener));
    // 按钮点击事件：登录新账号
    const createButton = document.getElementById("new-account-btn");
    createButton.addEventListener("click", accountCreateListener);
}

async function accountSwitchListener(event) {
    // 对已选中的不作响应
    if (event.target.classList.contains("selected")) {
        return;
    }
    const accountName = event.target.parentElement.parentElement.id.split("-")[1];
    // 移除当前cookie
    (await cookie.getAllAliyunCookie()).map(cookie.removeOne);
    // 恢复选中账号的cookie
    (await storage.getAccount(accountName)).cookies.map(cookie.restoreOne);
    // 重置样式
    Array.from(document.getElementsByClassName("selected")).forEach((item) => {
        item.classList.remove("selected");
        item.classList.add("selectable");
    });
    event.target.classList.remove("selectable");
    event.target.classList.add("selected");
    // 刷新相关tab
    await refreshAllAliyunTabs();
}

async function accountRenameListener(event) {
    const accountName = event.target.parentElement.parentElement.id.split("-")[1];
    const newName = prompt("请输入新的账号名称：");
    if (newName) {
        const accountObject = await storage.getAccount(accountName);
        accountObject.displayName = newName;
        await storage.putAccount(accountName, accountObject, true);
        event.target.parentElement.getElementsByClassName("display-name")[0].innerText = newName;
    }
}

async function accountDeletionListener(event) {
    const accountName = event.target.parentElement.parentElement.id.split("-")[1];
    // 移除选中的cookie
    await storage.removeAccount(accountName);
    // 如果移除的是当前登录的账号，还要移除前台cookie
    const currentCookies = await cookie.getAllAliyunCookie();
    const currentAccount = await cookie.getAliyunAccount();
    if (accountName === currentAccount) {
        currentCookies.map(cookie.removeOne);
        await refreshAllAliyunTabs();
    }
    // 移除当前行的html元素
    const currentRow = event.target.parentElement.parentElement;
    currentRow.parentElement.removeChild(currentRow);
}

async function accountCreateListener(event) {
    const currentCookies = await cookie.getAllAliyunCookie();
    currentCookies.map(cookie.removeOne);
    const loginUrl = `https://signin.aliyun.com/login.htm`;
    await chrome.tabs.create({url: loginUrl});
}

async function refreshAllAliyunTabs() {
    const tabs = await chrome.tabs.query({url: "*://*.aliyun.com/*"});
    tabs.map((tab) => {
        chrome.tabs.reload(tab.id);
    });
}