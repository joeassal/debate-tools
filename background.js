let attachedTabs = new Set();
let speechDocs = new Map();
let activeSpeechDocID = null;

function isGoogleDocUrl(url) {
    return Boolean(url && url.includes("https://docs.google.com/document/d/"));
}

async function registerSpeechDoc(tabId) {
    const tab = await chrome.tabs.get(tabId);
    if (!isGoogleDocUrl(tab.url)) {
        throw new Error("Selected tab is not a Google Doc.");
    }

    const speechDoc = {
        id: tabId,
        title: tab.title || "Untitled speech doc",
        url: tab.url,
        windowId: tab.windowId
    };

    speechDocs.set(tabId, speechDoc);
    activeSpeechDocID = tabId;
    return speechDoc;
}

async function getLiveSpeechDocs() {
    const liveSpeechDocs = [];

    for (const [tabId, speechDoc] of speechDocs) {
        try {
            const tab = await chrome.tabs.get(tabId);
            if (!isGoogleDocUrl(tab.url)) {
                speechDocs.delete(tabId);
                continue;
            }

            const updatedSpeechDoc = {
                ...speechDoc,
                title: tab.title || speechDoc.title,
                url: tab.url,
                windowId: tab.windowId
            };
            speechDocs.set(tabId, updatedSpeechDoc);
            liveSpeechDocs.push(updatedSpeechDoc);
        } catch (error) {
            speechDocs.delete(tabId);
        }
    }

    if (activeSpeechDocID && !speechDocs.has(activeSpeechDocID)) {
        activeSpeechDocID = liveSpeechDocs[0] && liveSpeechDocs[0].id || null;
    }

    return liveSpeechDocs;
}

async function getActiveSpeechDocId() {
    await getLiveSpeechDocs();
    return activeSpeechDocID;
}

chrome.tabs.onRemoved.addListener((tabId) => {
    speechDocs.delete(tabId);
    if (activeSpeechDocID === tabId) {
        activeSpeechDocID = speechDocs.keys().next().value || null;
    }
});

let flowPort = null;
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "flow-panel") return;

  flowPort = port;

  port.onDisconnect.addListener(() => {
    if (flowPort === port) flowPort = null;
  });
});

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

async function clickDocsMenuShortcut(tabId, shortcutLabel) {
    let response;
    let lastError;

    for (let attempt = 0; attempt < 20; attempt++) {
        try {
            response = await chrome.tabs.sendMessage(tabId, {
                action: "clickDocsMenuShortcut",
                shortcutLabel
            });
            if (response && response.success) return;
        } catch (error) {
            lastError = error;
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
    }

    throw new Error(
        response && response.error ||
        lastError && lastError.message ||
        `Could not click Docs menu shortcut ${shortcutLabel}`
    );
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
            else if (message.action === "getGoogleDocTabs") {
                const tabs = await chrome.tabs.query({ url: "https://docs.google.com/document/d/*" });
                sendResponse({
                    success: true,
                    tabs: tabs.map((tab) => ({
                        id: tab.id,
                        title: tab.title || "Untitled Google Doc",
                        url: tab.url,
                        windowId: tab.windowId
                    })),
                    activeSpeechDocID
                });
                return;
            }
            else if (message.action === "getSpeechDocs") {
                const docs = await getLiveSpeechDocs();
                sendResponse({ success: true, speechDocs: docs, activeSpeechDocID });
                return;
            }
            else if (message.action === "registerSpeechDoc") {
                const speechDoc = await registerSpeechDoc(message.tabId);
                sendResponse({ success: true, speechDoc, activeSpeechDocID });
                return;
            }
            else if (message.action === "selectSpeechDoc") {
                await getLiveSpeechDocs();
                if (!speechDocs.has(message.tabId)) {
                    await registerSpeechDoc(message.tabId);
                } else {
                    activeSpeechDocID = message.tabId;
                }
                sendResponse({ success: true, activeSpeechDocID });
                return;
            }
            else if(message.action == "newSpeechDoc") {
                let newTab;
                if (message.newWindow !== false) {
                    const speechWindow = await new Promise((resolve) => {
                        chrome.windows.create({
                            url: "https://docs.google.com/document/create",
                            type: "popup", // This creates the separate window without the tab bar
                            width: 900,
                            height: 700
                        }, resolve);
                    });
                    newTab = speechWindow.tabs[0];
                } else {
                    newTab = await new Promise((resolve) => {
                        chrome.tabs.create({ url: "https://docs.google.com/document/create" }, resolve);
                    });
                }

                const tabId = await new Promise((resolve) => {
                    const listener = (updatedTabId, changeInfo, tab) => {
                        if (updatedTabId === newTab.id && changeInfo.status === "complete" && isGoogleDocUrl(tab.url)) {
                            chrome.tabs.onUpdated.removeListener(listener);
                            resolve(updatedTabId);
                        }
                    };
                    chrome.tabs.onUpdated.addListener(listener);
                    setTimeout(() => resolve(newTab.id), 5000);
                });

                let speechDoc = null;
                try {
                    speechDoc = await registerSpeechDoc(tabId);
                } catch (error) {
                    activeSpeechDocID = tabId;
                    speechDocs.set(tabId, {
                        id: tabId,
                        title: "New speech doc",
                        url: "https://docs.google.com/document/create",
                        windowId: newTab.windowId
                    });
                    speechDoc = speechDocs.get(tabId);
                }

                sendResponse({ success: true, speechDoc, activeSpeechDocID });
            }
            else if(message.action == "sendSpeechDoc") {
                const speechDocID = message.tabId || await getActiveSpeechDocId();
                if(!speechDocID) { sendResponse({ success: false, message: "There is no selected speech document. Create one or select an existing Google Doc as a speech doc first." }); return; }
                try {
                    await chrome.tabs.get(speechDocID);
                } catch (e) {
                    speechDocs.delete(speechDocID);
                    if (activeSpeechDocID === speechDocID) activeSpeechDocID = null;
                    sendResponse({ success: false, message: "The selected speech document is no longer open. Create one or select another Google Doc." }); return;
                }
                try {
                    await focusTabAndEditor(sender.tab.id);
                    await clickDocsMenuShortcut(sender.tab.id, "Ctrl+C");
                    await focusTabAndEditor(speechDocID);
                    await clickDocsMenuShortcut(speechDocID, "Ctrl+V");
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
                
                await new Promise((resolve, reject) => {
                    const listener = (tabId, changeInfo, tab) => {
                        if (changeInfo.status === 'complete' && tab.url && tab.url.includes('/document/d/')) {
                            chrome.tabs.onUpdated.removeListener(listener);
                            // Add delay to let the editor fully load
                            setTimeout(async () => {
                                try {
                                    await focusTabAndEditor(tabId);
                                    await clickDocsMenuShortcut(tabId, "Ctrl+V");
                                    resolve();
                                } catch (error) {
                                    reject(error);
                                }
                            }, 480); // 2 second delay
                        }
                    };
                    chrome.tabs.onUpdated.addListener(listener);
                });
                sendResponse({ success: true });
            }
            else if (message.action === "toFlow") {
                if (!flowPort) {
                    sendResponse({ success: false, error: "Flow panel is not open." });
                    return;
                }

                flowPort.postMessage(message.message);
                sendResponse({ success: true });
                return;
            } 
            else {
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
