settings = {
  "highlightColor": "yellow",
}
actions = {
  "Paste": async () => await chrome.runtime.sendMessage({ action: "V", useShift: true, useAlt: false }),
  "Condense": async () => await condense(),
  "Pocket": async () => await chrome.runtime.sendMessage({ action: "1", useAlt: true }),
  "Hat": async () => await chrome.runtime.sendMessage({ action: "2", useAlt: true }),
  "Block": async () => await chrome.runtime.sendMessage({ action: "3", useAlt: true }),
  "Tag": async () => await chrome.runtime.sendMessage({ action: "4", useAlt: true }),
  "Cite": async () => await changeProperty("style", "font-size: 17.33px; font-weight: bold; display: inline-block;"),
  "Underline": async () => await chrome.runtime.sendMessage({ action: "u", useShift: false, useAlt: false  }),
  "Highlight": async () => await highlight(),
  "Clear": async () => {await chrome.runtime.sendMessage({ action: "0", useAlt: true }); await chrome.runtime.sendMessage({ action: "\\", useShift: false, useAlt: false });},
  "Readmode":  async () => await readMode()
}
  keybinds = {
  "F2": "Paste",
  "F3": "Condense",
  "F4": "Pocket",
  "F5": "Hat",
  "F6": "Block",
  "F7": "Tag",
  "F8": "Cite",
  "F9": "Underline",
  "F10": "Highlight",
  "F12": "Clear"
}

async function checkClipboard() {
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      if (item.types.includes("text/html")) {
        const blob = await item.getType("text/html");
        const html = await blob.text();
        return html;
      }
    }
  } catch (e) {
    // permission blocked or unsupported context
  }
  return "";
}
async function modifySelection(e){
    startCB = await checkClipboard();
    startCB2 = await navigator.clipboard.read();
    await new Promise(resolve => {
        chrome.runtime.sendMessage({ action: "c", useShift: false, useAlt: false  }, resolve);
    });
    if(startCB==await checkClipboard()){ return }

    newCB = await checkClipboard();
    //parsing logic
    newCB = newCB.replace(/\bid=(["']).*?\1/g, 'id=""');
    const container = document.createElement("div");
    container.innerHTML = newCB;
    //end parsing logic

    // write to clipboard
    const blob = new Blob([await e(container)], { type: "text/html" });
    await navigator.clipboard.write([
      new ClipboardItem({ "text/html": blob })
    ]);
    /// simulate paste
    await new Promise(resolve => {
        chrome.runtime.sendMessage({ action: "v", useShift: false, useAlt: false  }, resolve);
    });

    // Wait for paste to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    //give back old clipboard
    await navigator.clipboard.write(startCB2);
}

function addBlock(blockstart, blockend) {
  console.log('addblock');
  return modifySelection(async (container) => {
    const spans = container.querySelectorAll("span");
    spans.forEach(span => {
        span.innerHTML = blockstart + span.innerHTML + blockend;
    });
    return container.innerHTML;
  })
}
function changeProperty(property, value) {
  return modifySelection(async (container) => {
    const spans = container.querySelectorAll("*");
    spans.forEach(span => {
      span.setAttribute(property, value);
    });
    return container.innerHTML;
  })
}
function highlight() {
  return modifySelection(async (container) => {
    let hText = "";

    // Check what's highlighted
    container.querySelectorAll("span").forEach(span => {
      const bg = span.style.backgroundColor;

      if (bg && bg !== "transparent") {
        hText += span.textContent;
      }
    });

    // If ENTIRE selection is highlighted, toggle OFF
    if (hText.trim() === container.textContent.trim()) {
      container.querySelectorAll("span").forEach(span => {
        span.style.backgroundColor = "transparent";
      });
    } else {
      // Otherwise highlight EVERYTHING
      container.querySelectorAll("span").forEach(span => {
        span.style.backgroundColor = settings.highlightColor;
      });
    }

    return container.innerHTML;
  });
}
function condense() {
  return modifySelection(async (container) => {
    const children = container.querySelectorAll('*');
    children.forEach(el => {
        el.style.display = 'inline';
        el.style.margin = '0';
        el.style.padding = '0';
    });

    // 2. Force the container to stay on one line
    container.style.whiteSpace = 'nowrap';
    container.style.display = 'inline-block';
    return container.innerHTML;
  })
}
function readMode() {

}
//end hotkeys.js

async function onKeyDown(e) {
  if (keybinds[e.key]!==undefined) {
    e.preventDefault();
    e.stopImmediatePropagation();
    await actions[keybinds[e.key]]();
  }
}

function sidebarButtonClick(actionName) {
  if (actions[actionName]) {
    actions[actionName]();
  }
}

// stuff you dont care about
function attachToDocsEditor() {
  // 1. Target the specific iframe Google Docs uses for input
  const editorIframe = document.querySelector('.docs-texteventtarget-iframe');
  
  if (editorIframe) {
    // We have to listen to the DOCUMENT inside the iframe
    editorIframe.contentDocument.addEventListener("keydown", (e) => {
      onKeyDown(e);
    }, true); // Use 'true' for capture phase to beat Google's own scripts
  }
}
/**
 * Injects a sidebar directly into the Google Docs UI
 */
function injectSidebar() {
  if (document.getElementById("doc-extension-sidebar")) {
    // Sidebar already exists, just show it
    document.getElementById("doc-extension-sidebar").style.display = "flex";
    return;
  }

  // 1. Create the Sidebar Element
  const sidebar = document.createElement("div");
  sidebar.id = "doc-extension-sidebar";
  sidebar.style.cssText = /*css*/`
    position: fixed;
    top: 0;
    right: 0;
    width: 280px;
    height: 100vh;
    background: #ffffff;
    z-index: 1000000;
    border-left: 1px solid #d1d1d1;
    display: flex;
    flex-direction: column;
    font-family: times new roman, serif;
    box-shadow: -2px 0 10px rgba(0,0,0,0.1);
  `;

  // 2. Add Content & Styling
  sidebar.innerHTML = /*html*/`
    <div style="padding: 15px; background: #fd4444; color: white; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
      <span>Debate Tools</span>
      <button id="close-sidebar" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px;">✕</button>
    </div>
    <div style="padding: 10px; display: flex; flex-direction: row; flex-wrap: wrap; gap: 8px;">
    <button class="side-btn" data-action="Paste">Paste (F2)</button>
      <button class="side-btn" data-action="Condense">Condense (F3)</button>
      <button class="side-btn" data-action="Pocket">Pocket (F4)</button>
      <button class="side-btn" data-action="Hat">Hat (F5)</button>
      <button class="side-btn" data-action="Block">Block (F6)</button>
      <button class="side-btn" data-action="Tag">Tag (F7)</button>
      <button class="side-btn" data-action="Cite">Cite (F8)</button>
      <button class="side-btn" data-action="Underline">Underline (F9)</button>
      <button class="side-btn" data-action="Highlight">Highlight (F10)</button>
      <button class="side-btn" data-action="Clear">Clear (F12)</button>
      <hr style="width: 100%; border: 0; border-top: 1px solid #eee;">
    </div>
    <style>
      .side-btn {
        flex: 1 1 calc(50% - 4px);
        padding: 4px 6px;
        cursor: pointer;
        border: 1px solid #dadce0;
        border-radius: 4px;
        background: white;
        text-align: left;
        font-size: 11px;
        transition: background 0.2s;
      }
      .side-btn:hover { background: #f8f9fa; }
      .side-btn:active { background: #e8eaed; }
    </style>
  `;

  document.body.appendChild(sidebar);

  // Create resize handle
  const resizeHandle = document.createElement("div");
  resizeHandle.id = "sidebar-resize-handle";
  resizeHandle.style.cssText = `
    position: absolute;
    left: 0;
    top: 0;
    width: 4px;
    height: 100%;
    cursor: col-resize;
    background: transparent;
    z-index: 10001;
  `;
  sidebar.appendChild(resizeHandle);

  // Add close button functionality
  document.getElementById("close-sidebar").addEventListener("click", () => {
    sidebar.style.display = "none";
  });

  // Add resize functionality
  let isResizing = false;
  resizeHandle.addEventListener("mousedown", (e) => {
    isResizing = true;
    document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;

    const maxWidth = window.innerWidth * 0.5; // 50% of page width
    const minWidth = 280; // Minimum width
    const newWidth = window.innerWidth - e.clientX;

    if (newWidth >= minWidth && newWidth <= maxWidth) {
      sidebar.style.width = newWidth + "px";
      
      // Update the main editor margin
      const mainEditor = document.querySelector(".docs-main-container") || document.querySelector("#docs-chrome");
      if (mainEditor) {
        mainEditor.style.marginRight = newWidth + "px";
      }
    }
  });

  document.addEventListener("mouseup", () => {
    isResizing = false;
    document.body.style.userSelect = "auto";
  });

  // 3. Shift the Google Docs Editor UI
  // This class targets the main workspace wrapper in Google Docs
  const mainEditor = document.querySelector(".docs-main-container") || document.querySelector("#docs-chrome");
  if (mainEditor) {
    mainEditor.style.marginRight = "280px";
  }

  // 4. Attach Event Listeners to Buttons
  sidebar.querySelectorAll(".side-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      // 1. Find the hidden iframe Google Docs uses for events
      const editorIframe = document.querySelector('.docs-texteventtarget-iframe');
      
      if (editorIframe) {
        // 2. Force focus back to the editor
        editorIframe.contentWindow.focus();
        editorIframe.focus();
        
        // 3. Small "breath" to let the browser register the focus shift
        await new Promise(resolve => setTimeout(resolve, 50)); 
      }

      const actionName = btn.getAttribute("data-action");
      sidebarButtonClick(actionName);
    });
  });
}

/**
 * Creates a floating toggle button for the sidebar
 */
function createSidebarToggleButton() {
  if (document.getElementById("sidebar-toggle-btn")) return;

  const toggleBtn = document.createElement("button");
  toggleBtn.id = "sidebar-toggle-btn";
  toggleBtn.textContent = "Tools";
  toggleBtn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 10px 15px;
    background: #fd4444;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    z-index: 999999;
    font-weight: bold;
    font-size: 12px;
    transition: background 0.2s;
  `;

  toggleBtn.addEventListener("mouseover", () => {
    toggleBtn.style.background = "#e63939";
  });

  toggleBtn.addEventListener("mouseout", () => {
    toggleBtn.style.background = "#fd4444";
  });

  toggleBtn.addEventListener("click", () => {
    injectSidebar();
  });

  document.body.appendChild(toggleBtn);
}
/**
 * Watch for the Google Docs editor to load
 */
const initObserver = new MutationObserver(() => {
  // Wait for the main container to exist before injecting
  if (document.querySelector(".docs-texteventtarget-iframe")) {
    injectSidebar();
    attachToDocsEditor(); // Your existing function to listen for keys
    createSidebarToggleButton(); // Create the toggle button
    initObserver.disconnect();
  }
});

initObserver.observe(document.body, { childList: true, subtree: true });
