const aliyunDomain = "aliyun.com";
const aliyunAccountCookieName = "login_aliyunid";

(async function () {
    const currentCookies = await chrome.cookies.getAll({domain: aliyunDomain});
    const currentAccountCookie = currentCookies.find(item => item.name === aliyunAccountCookieName);
    const currentAccount = currentAccountCookie?.value?.replaceAll("\"", "");
    let storage = await getStorage();

    // 如果当前已登录，则使用登录的cookie覆盖存储中的cookie
    if (currentAccount) {
        storage = storage || {};
        storage[currentAccount] = {
            account: currentAccount,
            displayName: currentAccount,
            cookies: currentCookies
        };
        await putStorage(storage);
    }

    // 如果存储中有数据，则渲染账号列表
    if (storage) {
        const textHTMLs = [];
        for (let name in storage) {
            const account = storage[name].account;
            const displayName = storage[name].displayName;
            const textClass = account === currentAccount ? "selected" : "selectable";
            textHTMLs.push(`<div class="row" id="row-${account}">
                                <div class="text ${textClass}">${displayName}</div>
                                <div class="button delete">退出</div>
                            </div>`);
        }
        document.getElementById("list-container").innerHTML = textHTMLs.join("\n");
    }

    // 文本点击事件：账号切换
    const selectableTexts = document.getElementsByClassName("text");
    Array.from(selectableTexts).forEach(element => element.addEventListener("click", accountSwitchListener));
    // 按钮点击事件：账号删除
    const deleteButtons = document.getElementsByClassName("delete");
    Array.from(deleteButtons).forEach(element => element.addEventListener("click", accountDeletionListener));
    // 按钮点击事件：登录新账号
    const createButton = document.getElementById("new-account-btn");
    createButton.addEventListener("click", accountCreateListener);
})();

async function accountSwitchListener(event) {
    // 对已选中的不作响应
    if (event.target.classList.contains("selected")) {
        return;
    }
    const account = event.target.parentElement.id.split("-")[1];
    // 移除当前cookie
    const currentCookies = await chrome.cookies.getAll({domain: aliyunDomain});
    currentCookies.map(deleteCookie);
    // 恢复选中账号的cookie
    const storage = await getStorage();
    storage[account].cookies.map(restoreCookie);
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

async function accountDeletionListener(event) {
    const account = event.target.parentElement.id.split("-")[1];
    // 移除选中的cookie
    const storage = await getStorage();
    delete storage[account];
    await putStorage(storage);
    // 如果移除的是当前登录的账号，还要移除前台cookie
    const currentCookies = await chrome.cookies.getAll({domain: aliyunDomain});
    const currentAccountCookie = currentCookies.find(item => item.name === aliyunAccountCookieName);
    const currentAccount = currentAccountCookie?.value?.replaceAll("\"", "");
    if (account === currentAccount) {
        currentCookies.map(deleteCookie);
        await refreshAllAliyunTabs();
    }
    // 移除当前行的html元素
    const currentRow = event.target.parentElement;
    currentRow.parentElement.removeChild(currentRow);
}

async function accountCreateListener(event) {
    const currentCookies = await chrome.cookies.getAll({domain: aliyunDomain});
    currentCookies.map(deleteCookie);
    const loginUrl = `https://signin.aliyun.com/login.htm`;
    await chrome.tabs.create({url: loginUrl});
}

async function getStorage() {
    const storage = await chrome.storage.local.get(aliyunDomain);
    return storage[aliyunDomain];
}

async function putStorage(object) {
    return await chrome.storage.local.set({[aliyunDomain]: object});
}

function deleteCookie(cookie) {
    const protocol = cookie.secure ? "https" : "http";
    const cookieUrl = `${protocol}://${cookie.domain}${cookie.path}`;
    return chrome.cookies.remove({
        url: cookieUrl,
        name: cookie.name,
        storeId: cookie.storeId
    });
}

function restoreCookie(cookie) {
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
        storeId: cookie.storeId
    }).catch((error) => {
        console.log(error);
    });
}

async function clearAllCookie() {
    await chrome.storage.local.clear();
    chrome.cookies.getAll({domain: aliyunDomain}, (cookies) => {
        cookies.map(deleteCookie);
    });
}

async function refreshAllAliyunTabs() {
    const tabs = await chrome.tabs.query({url: "*://*.aliyun.com/*"});
    tabs.map((tab) => {
        chrome.tabs.reload(tab.id);
    });
}