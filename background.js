chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));


let attachedTabs = new Set();
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received message in background:", message);
    (async () => {
        if (message.action === "openSidePanel") {
            await chrome.sidePanel.open({
            windowId: sender.tab.windowId
            });
            return;
        }
        try {
            if(message.action == "tabThenPaste") {
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
                            }, 2000); // 2 second delay
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
            sendResponse({ error: error.message });
        }
    })();
    
    return true; // Keep the channel open for async response
});