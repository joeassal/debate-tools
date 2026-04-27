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

// Your updated copy function
/**
 * Generic helper to simulate a Ctrl/Cmd + Key combination
 * @param {number} tabId - The ID of the tab
 * @param {string} char - The character to press (e.g., 'v', 'u', 'c')
 */
async function sendKeyCombo(tabId, char) {
    const target = { tabId };
    
    // 1. Ensure attached
    await ensureDebuggerAttached(tabId);

    // 2. Setup keys
    const isMac = navigator.userAgent.toUpperCase().includes('MAC');
    const modifierBit = isMac ? 8 : 2;      // Command (Mac) or Control (Windows/Linux)
    const modifierKey = isMac ? 91 : 17;    // Meta key or Control key
    
    // Convert character to KeyCode
    const keyCode = char.toUpperCase().charCodeAt(0);
    const lowerChar = char.toLowerCase();

    // Press Modifier
    await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", {
        type: "keyDown",
        modifiers: modifierBit,
        windowsVirtualKeyCode: modifierKey,
        nativeVirtualKeyCode: modifierKey,
    });

    // Press Key
    await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", {
        type: "keyDown",
        modifiers: modifierBit,
        windowsVirtualKeyCode: keyCode,
        nativeVirtualKeyCode: keyCode,
        text: lowerChar,
        unmodifiedText: lowerChar
    });

    // Release Key
    await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", {
        type: "keyUp",
        modifiers: modifierBit,
        windowsVirtualKeyCode: keyCode,
    });

    // Release Modifier
    await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", {
        type: "keyUp",
        modifiers: 0,
        windowsVirtualKeyCode: modifierKey,
    });
}
// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "simulateCopy") {
        sendKeyCombo(sender.tab.id, 'c').then(() => sendResponse());
    }
    else if (message.action === "simulatePaste") {
        sendKeyCombo(sender.tab.id, 'v').then(() => sendResponse());
    }
    else if (message.action === "underline") {
        sendKeyCombo(sender.tab.id, 'u').then(() => sendResponse());
    }
    else if (message.action === "selectAll") {
        sendKeyCombo(sender.tab.id, 'a').then(() => sendResponse());
    }
    return true; // Tell Chrome we'll send response asynchronously
});