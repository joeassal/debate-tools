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
  "Readmode": async () => await readMode(),
  "Importdocx": async () => ImportDocX(),
  "Exportdocx": async () => ExportDocX(),
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
async function modifySelection(e) {
  startCB = await checkClipboard();
  startCB2 = await navigator.clipboard.read();
  await new Promise(resolve => {
    chrome.runtime.sendMessage({ action: "c", useShift: false, useAlt: false }, resolve);
  });
  if (startCB == await checkClipboard()) { return }

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
    chrome.runtime.sendMessage({ action: "v", useShift: false, useAlt: false }, resolve);
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
async function readMode() {
  startCB = await checkClipboard();
  startCB2 = await navigator.clipboard.read();
  await new Promise(resolve => {
    chrome.runtime.sendMessage({ action: "a", useShift: false, useAlt: false }, resolve);
  });
  await new Promise(resolve => {
    chrome.runtime.sendMessage({ action: "c", useShift: false, useAlt: false }, resolve);
  });
  if (startCB == await checkClipboard()) { return }

  newCB = await checkClipboard();
  //parsing logic
  const container = document.createElement("div");
  container.innerHTML = newCB;
  //end parsing logic

  //give back old clipboard
  await navigator.clipboard.write(startCB2);


  // actual logic u care about
  let keepContent = "";
  let pgs = container.querySelector('b');
  for(const pg of pgs.children){
    let inntertext=pg.innerText;
    isCite=(inntertext.includes("http") || inntertext.includes("www"))

    //card logic if it is a card
    let isCard = false;
    let contingentKC="";

    //loop thru spans to find highlight or small text
    pg.querySelectorAll('span').forEach(span => {
      if(span.style.fontSize && parseFloat(span.style.fontSize) >=13 && span.style.fontWeight > 400){
        contingentKC+=span.outerHTML + " ";
        return;
      }
      if(isCite && span.style.fontWeight && span.style.fontWeight > 400){
        contingentKC+=span.outerHTML + " ";
      }
      const bg = span.style.backgroundColor;
      const size = span.style.fontSize;
      if (bg && bg !== "transparent") {
        isCard = true;
        contingentKC += span.outerHTML + " ";
      }
      if(size && parseFloat(size) <= 8){
        isCard = true;
      }
    });
    if (isCard || isCite) {
      keepContent+=contingentKC;
    } else {
      keepContent+=pg.outerHTML;
    }
  }

  return keepContent
}

async function ImportDocX() {
  console.log("ImportDocX called");
  try {
    const [fileHandle] = await window.showOpenFilePicker({
      types: [{
        description: 'Word Document',
        accept: {
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
        }
      }]
    });
    const file = await fileHandle.getFile();
    await new Promise(resolve => {
      chrome.runtime.sendMessage({ action: "importDocX", file: file }, async (response) => {
        if (response.error) {
          console.error("Error converting DOCX:", response.error);
        } else {
          const html = response.html;
          const blob = new Blob([html], { type: "text/html" });
          await navigator.clipboard.write([
            new ClipboardItem({ "text/html": blob })
          ]);
        }
        await new Promise(resolve => {
          chrome.runtime.sendMessage({ action: "tabThenPaste" }, resolve);
        });
      });
    });
  } catch (err) {
    // User cancelled the picker
    console.log("Picker closed or failed", err);
  }
}
function ExportDocX() {
  const originalUrl = window.location.href;
  const editIndex = originalUrl.indexOf("/edit");
  const exportUrl = originalUrl.substring(0, editIndex) + "/export?format=docx";
  window.location.href = exportUrl;
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
      <button class="side-btn" data-action="Importdocx">Ez Import DocX</button>
      <button class="side-btn" data-action="Exportdocx">Ez Export DocX</button>
      <button class="side-btn" data-action="Readmode">Read Mode</button>
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

      //special handling funcitons
      if(actionName==="Readmode"){
        const readContent = await actions["Readmode"]();
        const readWindow = window.open("", "DebateReadMode", "width=900,height=900");
        readWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body {
                width: 900px;
                margin: 20px auto;
                font-family: times new roman, serif;
                overflow: hidden;
              }
              #page-container {
                height: 100vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
              }
              #content-area {
                flex: 1;
                overflow-y: auto;
              }
              #page-info {
                text-align: center;
                padding: 10px;
                border-top: 1px solid #ccc;
                background: #f5f5f5;
              }
            </style>
          </head>
          <body>
            <div id="page-container">
              <div id="content-area">${readContent}</div>
              <div id="page-info">Page <span id="current-page">1</span></div>
            </div>
          </body>
          </html>
        `);
        readWindow.focus();

        // Page navigation logic
        let currentPage = 1;
        const contentArea = readWindow.document.getElementById("content-area");
        const pageInfo = readWindow.document.getElementById("page-info");
        
        readWindow.addEventListener("keydown", (event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            contentArea.scrollBy({ top: contentArea.clientHeight, behavior: 'smooth' });
            currentPage++;
            pageInfo.innerHTML = `Page <span id="current-page">${currentPage}</span>`;
          }
          if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            contentArea.scrollBy({ top: -contentArea.clientHeight, behavior: 'smooth' });
            currentPage = (currentPage > 1) ? currentPage - 1 : 1;
            pageInfo.innerHTML = `Page <span id="current-page">${currentPage}</span>`;
          }
        });
      }
      else {
        sidebarButtonClick(actionName);
      }
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
