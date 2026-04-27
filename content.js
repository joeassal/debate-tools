settings = {
  "highlightColor": "blue",
}
actions = {
  "Paste": async () => await cleanPaste(),
  "Condense": () => condense(),
  "Pocket": () => addBlock("<h1 style='text-decoration: underline;font-size: 34.66px; text-align: center;'><a style='display: inline-block;'>[ ", " ]</a></h1>"),
  "Hat": () => addBlock("<h2 style='text-align: center; font-size: 29.33px; text-decoration: underline;'><a style='display: inline-block;'>", "</a></h2>"),
  "Block": () => addBlock("<h3 style='font-size: 21.33px; text-align: center;'><a style='display: inline-block;'>", "</a></h3>"),
  "Tag": () => addBlock("<h4 style='font-size: 17.33px; style='display: inline-block;'>","</h4>"),
  "Cite": () => addBlock("<p style='font-size: 17.33px; font-weight: bold; display: inline-block;'>", "</p>"),
  "Underline": () => chrome.runtime.sendMessage({ action: "underline" }),
  "Highlight": () => {
    // loop through spans, if all is highlighted, remove it, else add highlight
    addMarkdown(`<style>*{background-color: ${settings.highlightColor};}</style>`)
  },
  "Clear": () => changeProperty("style", "line-height: 1.5;font-size: 14.33px; font-weight: normal; color: black; text-decoration: none; text-align: left; display: inline-block;")
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
        chrome.runtime.sendMessage({ action: "simulateCopy" }, resolve);
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
        chrome.runtime.sendMessage({ action: "simulatePaste" }, resolve);
    });

    //give back old clipboard
    await navigator.clipboard.write(startCB2);
}

function addBlock(blockstart, blockend) {
  console.log('addblock');
  modifySelection(async (container) => {
    const spans = container.querySelectorAll("span");
    spans.forEach(span => {
        span.innerHTML = blockstart + span.innerHTML + blockend;
    });
    return container.innerHTML;
  })
}
function changeProperty(property, value) {
  modifySelection(async (container) => {
    const spans = container.querySelectorAll("*");
    spans.forEach(span => {
      span.setAttribute(property, value);
    });
    return container.innerHTML;
  })
}
function addMarkdown(text) {
  modifySelection(async (container) => {
    return text + container.innerHTML;
  })
}
function condense() {
  modifySelection(async (container) => {
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
async function cleanPaste() {
  const text = await navigator.clipboard.readText();
  const blob = new Blob([text], { type: "text/plain" });
  await navigator.clipboard.write([
    new ClipboardItem({ "text/plain": blob })
  ]);
  await new Promise(resolve => {
        chrome.runtime.sendMessage({ action: "simulatePaste" }, resolve);
  });
}
//end hotkeys.js

function onKeyDown(e) {
  if (keybinds[e.key]!==undefined) {
    e.preventDefault();
    e.stopImmediatePropagation();
    actions[keybinds[e.key]]();
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
  if (document.getElementById("doc-extension-sidebar")) return;

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
    <div style="padding: 15px; background: #fd4444; color: white; font-weight: bold;">
      Debate Tools
    </div>
    <div style="padding: 10px; display: flex; flex-direction: column; gap: 8px;">
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
 * Watch for the Google Docs editor to load
 */
const initObserver = new MutationObserver(() => {
  // Wait for the main container to exist before injecting
  if (document.querySelector(".docs-texteventtarget-iframe")) {
    injectSidebar();
    attachToDocsEditor(); // Your existing function to listen for keys
    initObserver.disconnect();
  }
});

initObserver.observe(document.body, { childList: true, subtree: true });
