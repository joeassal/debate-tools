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
    const modKey = isMac ? 91 : 17; // Cmd or Ctrl
    const altKey = 18;
    const shiftKey = 16;

    // 1. Calculate Bitmask correctly using bitwise OR
    let modifierBit = isMac ? 8 : 2; 
    if (useShift) modifierBit |= 4; // Use bitwise OR to set bits
    if (useAlt)   modifierBit |= 1;

    // 2. Handle KeyCode
    const keyCode = (char === '\\') ? 220 : char.toUpperCase().charCodeAt(0);

    // --- SEQUENCE START ---
    
    // Press Modifiers
    await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", { 
        type: "keyDown", modifiers: modifierBit, windowsVirtualKeyCode: modKey 
    });
    
    if (useAlt) {
        await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", { 
            type: "keyDown", modifiers: modifierBit & ~1, windowsVirtualKeyCode: altKey 
        });
    }
    
    if (useShift) {
        await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", { 
            type: "keyDown", modifiers: modifierBit & ~4, windowsVirtualKeyCode: shiftKey 
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
        await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", { 
            type: "keyUp", modifiers: modifierBit & ~4, windowsVirtualKeyCode: shiftKey 
        });
    }

    if (useAlt) {
        await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", { 
            type: "keyUp", modifiers: modifierBit & ~1, windowsVirtualKeyCode: altKey 
        });
    }

    await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", { 
        type: "keyUp", modifiers: 0, windowsVirtualKeyCode: modKey 
    });
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    sendUniversalShortcut(sender.tab.id, message.action, message.useShift, message.useAlt).then(() => sendResponse());
});