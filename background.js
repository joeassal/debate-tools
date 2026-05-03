let attachedTabs = new Set();
let speechDocID=null;
async function ensureDebuggerAttached(tabId) {
    if (attachedTabs.has(tabId)) {
        return; // Already attached, nothing to do
    }

    try {
        await chrome.debugger.attach({ tabId: tabId }, "1.3");
        
        // Listen for when the debugger is detached (e.g., user clicks 'Cancel' on the banner)
        chrome.debugger.onDetach.addListener((source) => {
            if (source.tabId === tabId) {
                attachedTabs.delete(tabId);
                console.log("Debugger detached by user or system.");
            }
        });

        attachedTabs.add(tabId);
        console.log("Debugger attached and staying active.");
    } catch (err) {
        console.error("Failed to attach debugger:", err);
    }
}

async function sendUniversalShortcut(tabId, char, useShift = false, useAlt = false) {

    const target = { tabId };
    await ensureDebuggerAttached(tabId);

    const isMac = navigator.userAgent.toUpperCase().includes('MAC');
    const modifierKeys = {
        alt: 1,
        ctrl: 2,
        meta: 4,
        shift: 8,
    };
    const modKey = isMac ? 91 : 17; // Cmd or Ctrl
    const altKey = 18;
    const shiftKey = 16;
    const baseModifier = isMac ? modifierKeys.meta : modifierKeys.ctrl;

    let modifierBit = baseModifier;
    if (useShift) modifierBit |= modifierKeys.shift;
    if (useAlt) modifierBit |= modifierKeys.alt;

    // 2. Handle KeyCode
    if (char === "Backspace") {
        await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", {
            type: "keyDown",
            windowsVirtualKeyCode: 8,
            modifiers: 0
        });

        await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", {
            type: "keyUp",
            windowsVirtualKeyCode: 8,
            modifiers: 0
        });

        return;
    }
    const keyCode = (char === '\\') ? 220 : char.toUpperCase().charCodeAt(0);

    // --- SEQUENCE START ---
    
    // Press Modifiers
    await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", { 
        type: "keyDown", modifiers: baseModifier, windowsVirtualKeyCode: modKey 
    });
    
    let pressedModifiers = baseModifier;

    if (useAlt) {
        pressedModifiers |= modifierKeys.alt;
        await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", { 
            type: "keyDown", modifiers: pressedModifiers, windowsVirtualKeyCode: altKey 
        });
    }
    
    if (useShift) {
        pressedModifiers |= modifierKeys.shift;
        await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", { 
            type: "keyDown", modifiers: pressedModifiers, windowsVirtualKeyCode: shiftKey 
        });
    }

    // Press Key
    // Note: We use the uppercase char for unmodifiedText if shift is on
    await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", {
        type: "keyDown",
        modifiers: modifierBit,
        windowsVirtualKeyCode: keyCode,
        text: "", 
        unmodifiedText: "" 
    });

    // --- RELEASE (REVERSE ORDER) ---
    await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", { 
        type: "keyUp", modifiers: modifierBit, windowsVirtualKeyCode: keyCode 
    });

    if (useShift) {
        pressedModifiers &= ~modifierKeys.shift;
        await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", { 
            type: "keyUp", modifiers: pressedModifiers, windowsVirtualKeyCode: shiftKey 
        });
    }

    if (useAlt) {
        pressedModifiers &= ~modifierKeys.alt;
        await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", { 
            type: "keyUp", modifiers: pressedModifiers, windowsVirtualKeyCode: altKey 
        });
    }

    await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", { 
        type: "keyUp", modifiers: 0, windowsVirtualKeyCode: modKey 
    });
}

async function focusTabAndEditor(tabId) {
    const tab = await chrome.tabs.get(tabId);
    if (tab.windowId) {
        await chrome.windows.update(tab.windowId, { focused: true });
    }
    await chrome.tabs.update(tabId, { active: true });
    try {
        await chrome.tabs.sendMessage(tabId, { action: "focusDocsEditor" });
    } catch (error) {
        console.warn("Could not focus Docs editor before paste", error);
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
}

async function openCleanCaseListWindow(url) {
    const caseListWindow = await new Promise((resolve) => {
        chrome.windows.create({
            url,
            type: "popup",
            width: 600,
            height: 800
        }, resolve);
    });

    const tabId = caseListWindow.tabs && caseListWindow.tabs[0] && caseListWindow.tabs[0].id;
    if (!tabId) return;

    const cleanup = async () => {
        await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
                function cleanLayout() {
                    let root = document.getElementById("root")
                    root.querySelector("HEADER").remove()
                    root.querySelector("FOOTER").remove()
                    const div = root.querySelector("DIV")
                    if(div.innerText.includes("Welcome to openCaselist")) {
                        alert("You need to login on the official opencaselist  website to use the extension addon")
                    } else {
                        div.querySelector("DIV").remove()
                    }
                }

                cleanLayout();

                const observer = new MutationObserver(cleanLayout);
                observer.observe(document.body, { childList: true, subtree: true });
                setTimeout(() => observer.disconnect(), 5000);
            }
        });
    };

    await new Promise((resolve) => {
        const listener = (updatedTabId, changeInfo) => {
            if (updatedTabId === tabId && changeInfo.status === "complete") {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
            }
        };
        chrome.tabs.onUpdated.addListener(listener);
    });

    await cleanup();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received message in background:", message);
    (async () => {
        try {
            if (message.action === "openSidePanel") {
                await chrome.sidePanel.open({
                windowId: sender.tab.windowId
                });
                sendResponse({ success: true });
                return;
            }
            else if (message.action === "loadDocshift") {
                await chrome.scripting.executeScript({
                    target: { tabId: sender.tab.id },
                    files: ["docshift.min.js"],
                });
                sendResponse({ success: true });
                return;
            }
            else if (message.action === "openCleanCaseList") {
                await openCleanCaseListWindow(message.url);
                sendResponse({ success: true });
                return;
            }
            else if(message.action == "newSpeechDoc") {
                if(speechDocID) {
                    try {
                        await chrome.tabs.get(speechDocID);
                        sendResponse({ success: false, message: "Sorry! You can only have one speech doc open at a time, new implementation coming soon. \nFor now, you can use google docs subtabs for multiple speeches." });
                        return;
                    } catch (e) {}
                }
                if (message.newWindow !== false) {
                    const speechWindow = await new Promise((resolve) => {
                        chrome.windows.create({
                            url: "https://docs.google.com/document/create",
                            type: "popup", // This creates the separate window without the tab bar
                            width: 900,
                            height: 700
                        }, resolve);
                    });
                    speechDocID = speechWindow.tabs[0].id;
                } else {
                    const speechTab = await new Promise((resolve) => {
                        chrome.tabs.create({ url: "https://docs.google.com/document/create" }, resolve);
                    });
                    speechDocID = speechTab.id;
                }
                sendResponse({ success: true });
            }
            else if(message.action == "sendSpeechDoc") {
                if(!speechDocID) { sendResponse({ success: false, message: "There is no open speech document to send to. Create a new speech document first." }); return; }
                try {
                    await chrome.tabs.get(speechDocID);
                } catch (e) {
                    sendResponse({ success: false, message: "There is no open speech document to send to. Create a new speech document first." }); return;
                }
                try {
                    await focusTabAndEditor(sender.tab.id);
                    await sendUniversalShortcut(sender.tab.id, "c");
                    await chrome.tabs.update(speechDocID, { active: true });
                    setTimeout(async () => {
                        await focusTabAndEditor(speechDocID);
                        await sendUniversalShortcut(speechDocID, "v");
                    }, 350); // Delay to ensure the new tab is fully focused and editor is ready
                    sendResponse({ success: true });
                } catch (error) {
                    console.error("Error sending speech document:", error);
                    sendResponse({ success: false, message: "Failed to send speech document" });
                }
            }
            else if(message.action == "tabThenPaste") {
                const newTab = await new Promise((resolve) => {
                    chrome.tabs.create({ url: "https://docs.google.com/document/create" }, resolve);
                });
                
                await new Promise((resolve) => {
                    const listener = (tabId, changeInfo, tab) => {
                        if (changeInfo.status === 'complete' && tab.url.includes('/document/d/')) {
                            chrome.tabs.onUpdated.removeListener(listener);
                            // Add delay to let the editor fully load
                            setTimeout(async () => {
                                await focusTabAndEditor(tabId);
                                await sendUniversalShortcut(tabId, "v", false, false);
                                resolve();
                            }, 480); // 2 second delay
                        }
                    };
                    chrome.tabs.onUpdated.addListener(listener);
                });
                sendResponse({ success: true });
            } else {
                await sendUniversalShortcut(sender.tab.id, message.action, message.useShift, message.useAlt);
                sendResponse({ success: true });
            }
        } catch (error) {
            console.error("Error in message listener:", error);
            sendResponse({ success: false, error: error.message });
        }
    })();
    
    return true; // Keep the channel open for async response
});
