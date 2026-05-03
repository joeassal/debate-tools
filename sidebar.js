(function (global) {
  const DebateTools = global.DebateTools || {};
  
  function getMainEditor() {
    return document.querySelector(".docs-main-container") || document.querySelector("#docs-chrome");
  }

  function writeReadModeWindow(readWindow, readContent) {
    /* html */
    readWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            width: 900px;
            margin: 20px auto;
            font-family: Calibri, sans-serif;
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
  }

  function attachReadModeNavigation(readWindow) {
    let currentPage = 1;
    const contentArea = readWindow.document.getElementById("content-area");
    const pageInfo = readWindow.document.getElementById("page-info");

    readWindow.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        contentArea.scrollBy({ top: contentArea.clientHeight, behavior: "smooth" });
        currentPage++;
        pageInfo.innerHTML = `Page <span id="current-page">${currentPage}</span>`;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        contentArea.scrollBy({ top: -contentArea.clientHeight, behavior: "smooth" });
        currentPage = currentPage > 1 ? currentPage - 1 : 1;
        pageInfo.innerHTML = `Page <span id="current-page">${currentPage}</span>`;
      }
    });
  }

  async function openReadModeWindow() {
    const readContent = await DebateTools.actions.Readmode();
    const readWindow = window.open("", "DebateReadMode", "width=900,height=900");

    writeReadModeWindow(readWindow, readContent);
    readWindow.focus();
    attachReadModeNavigation(readWindow);
  }
  async function openSpeechDocsWindow() {
    const speechWindow = window.open("https://docs.new", "SpeechDoc", "width=700px,height=900px");
    speechWindow.focus();
  }

  function attachSidebarResize(sidebar, resizeHandle) {
    let isResizing = false;

    resizeHandle.addEventListener("mousedown", () => {
      isResizing = true;
      document.body.style.userSelect = "none";
    });

    document.addEventListener("mousemove", (e) => {
      if (!isResizing) return;

      const maxWidth = window.innerWidth * 0.5;
      const minWidth = 280;
      const newWidth = window.innerWidth - e.clientX;

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        sidebar.style.width = newWidth + "px";

        const mainEditor = getMainEditor();
        if (mainEditor) {
          mainEditor.style.marginRight = newWidth + "px";
        }
      }
    });

    document.addEventListener("mouseup", () => {
      isResizing = false;
      document.body.style.userSelect = "auto";
    });
  }

  function attachSidebarButtonListeners(sidebar) {
    sidebar.querySelectorAll(".side-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        DebateTools.focusDocsEditor();
        await new Promise((resolve) => setTimeout(resolve, 50));

        const actionName = btn.getAttribute("data-action");

        if (actionName === "Readmode") {
          await openReadModeWindow();
        }
        else {
          await DebateTools.runAction(actionName);
        }
      });
    });
  }

  DebateTools.injectSidebar = function injectSidebar() {
    if (document.getElementById("doc-extension-sidebar")) {
      document.getElementById("doc-extension-sidebar").style.display = "flex";
      return;
    }

    const sidebar = document.createElement("div");
    sidebar.id = "doc-extension-sidebar";
    sidebar.style.cssText = /* css */ `
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
      font-family: Calibri, sans-serif;
      box-shadow: -2px 0 10px rgba(0,0,0,0.1);
    `;

    sidebar.innerHTML = /* html */ `
      <div style="padding: 15px; background: #2d3c80; color: white; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
        <span>Debate Tools</span>
        <button id="close-sidebar" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px;">x</button>
      </div>
      <div class="sidebar-control-grid">
        <div class="sidebar-button-grid">

        <button class="side-btn" data-action="Paste">Paste (F2)</button>
        <button class="side-btn" data-action="Condense">Condense (F3)</button>
        <button class="side-btn" data-action="Pocket">Pocket (F4)</button>
        <button class="side-btn" data-action="Hat">Hat (F5)</button>
        <button class="side-btn" data-action="Block">Block (F6)</button>
        <button class="side-btn" data-action="Tag">Tag (F7)</button>
        <button class="side-btn" data-action="Cite">Cite (F8)</button>
        <button class="side-btn" data-action="Underline">Underline (F9)</button>
        <button class="side-btn" data-action="Emphasis">Emphasis (F10)</button>
        <button class="side-btn" data-action="Highlight">Highlight (F11)</button>
        <button class="side-btn" data-action="Clear">Clear (F12)</button>
        <button class="side-btn" data-action="Shrink">Shrink</button>
        <button class="side-btn" data-action="StandardizeHighlights">Standardize Highlights</button>
        <hr style="width: 100%; border: 0; border-top: 1px solid #eee;">
        <button class="side-btn" data-action="Importdocx">Quick Import DOCX</button>
        <button class="side-btn" data-action="ImportdocxToClipboard">Import DOCX to Clipboard</button>
        <button class="side-btn" data-action="Exportdocx">Export entire as DOCX</button>
        <button class="side-btn" data-action="Exportpdf">Export entire as PDF</button>
        <hr style="width: 100%; border: 0; border-top: 1px solid #eee;">
        <button class="side-btn" data-action="Readmode">Read Mode</button>
        <button id="flow-btn" class="side-btn" data-action="Flow">Flow</button>
        <hr style="width: 100%; border: 0; border-top: 1px solid #eee;">
        <button class="side-btn" data-action="NewSpeechDoc">Create Speech Doc</button>
        <button class="side-btn" data-action="SendSpeechDoc">Send to Speech Doc</button>
        <button class="side-btn" data-action="Wikify">Wikify</button>
        <button class="side-btn" data-action="Readmode">Caselist</button>
        <hr style="width: 100%; border: 0; border-top: 1px solid #eee;">
        <button class="side-btn" id="SettingsBtn">Settings</button>
        <a class="side-btn" href="https://www.example.com">Help</a>
        <hr style="width: 100%; border: 0; border-top: 1px solid #eee;">
        </div>
        <div id="folder-tree-host"></div>
      </div>
      <div id="settings" style="display:none;">
      <button id="settings-close">X</button>
      <b style="font-size: 17px">Settings</b>
        <details id="keybindsFormat" open><Summary>Formatting&nbsp<button id="settings-default">Reset Default</button></Summary>
            Paste:<select name="Paste"style=""><option value="Not  Selected"></option></select><br>
            Condense:<select name="Condense"style=""><option value="Not  Selected"></option></select><br>
            Pocket:<select name="Pocket"style=""><option value="Not  Selected"></option></select><br>
            Hat:<select name="Hat"style=""><option value="Not  Selected"></option></select><br>
            Block:<select name="Block"style=""><option value="Not  Selected"></option></select><br>
            Tag:<select name="Tag"style=""><option value="Not  Selected"></option></select><br>
            Cite:<select name="Cite"style=""><option value="Not  Selected"></option></select><br>
            Underline:<select name="Underline"style=""><option value="Not  Selected"></option></select><br>
            Emphasis:<select name="Emphasis"style=""><option value="Not  Selected"></option></select><br>
            Highlight:<select name="Highlight"style=""><option value="Not  Selected"></option></select><br>
            Clear:<select name="Clear"style=""><option value="Not  Selected"></option></select><br>
        </details>
      </div>
      <style>
        .side-btn {
          flex: 0 0 auto;
          display: block;
          box-sizing: border-box;
          width: 100%;
          padding: 4px 6px;
          cursor: pointer;
          border: 1px solid #dadce0;
          border-radius: 4px;
          background: white;
          text-align: left;
          text-decoration: none;
          color: inherit;
          font-size: 11px;
          transition: background 0.2s;
        }
        .side-btn:hover { background: #f8f9fa; }
        .side-btn:active { background: #e8eaed; }
        .sidebar-control-grid {
          padding: 10px;
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          overflow-y: auto;
        }
        .sidebar-button-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          align-content: start;
        }
        .sidebar-button-grid hr {
          grid-column: 1 / -1;
        }
        #folder-tree-host {
          flex: 0 0 auto;
          margin-top: auto;
          min-height: 0;
        }
        #settings {
          position: fixed;
          top: 20%;
          left: 67%;
          padding: 10px;
          border: 2px solid #575757;
          background: white;
          width: 300px;
          height: 400px;
        }
        #keybindsFormat {
          font-size:15px;
        }
        select {
          background: #fdfeff;
          cursor:pointer;
          font-size:11px;          
        }
    </style>  
    `;
    document.body.appendChild(sidebar);

    document.getElementById("flow-btn").addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "openSidePanel" });
    });

    // Settings logic
    document.getElementById("settings-close").addEventListener("click", () => {
      document.getElementById("settings").style.display = "none";
    });
    document.getElementById("SettingsBtn").addEventListener("click", () => {
      document.getElementById("settings").style.display = "block";
    });
    document.getElementById("settings-default").addEventListener("click",()=> {
      for(let i=0;i<11;i++){
        setKeybind(DebateTools.bindableActions[i], "F"+(i+2))
      }
    })

    //keybinds
    keybindsFormat = document.getElementById("keybindsFormat")
    keybindsFormat.querySelectorAll("SELECT").forEach((tsKey) => {
      for(let i=1;i<=12;i++) {
        option = document.createElement("option")
        option.value="F"+i
        option.innerHTML="F"+i
        tsKey.appendChild(option)
      }
      tsKey.value = localStorage.getItem(tsKey.name)

      tsKey.addEventListener('change', (e) => setKeybind(tsKey.name, e.target.value))      
    })
    function setKeybind(action, newKey) {
      // 1. Remove duplicate usage of this key
      for (const key in DebateTools.keybinds) {
        if (DebateTools.keybinds[key] === newKey) {
          DebateTools.keybinds[key] = "Not Selected";
          syncSelect(key, "Not Selected");
          localStorage.setItem(key, "Not Selected");
        }
      }
      // 2. Set new value
      DebateTools.keybinds[action] = newKey;
      localStorage.setItem(action, newKey);
      // 3. Sync UI
      syncSelect(action, newKey);
    }
    function syncSelect(action, value) {
      const select = keybindsFormat.querySelector(
        `select[name="${action}"]`
      );
      if (select) select.value = value;
    }

    //attaching folder tree
    DebateTools.attachFolderTree();

    //reize handle logic
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

    document.getElementById("close-sidebar").addEventListener("click", () => {
      sidebar.style.display = "none";
    });

    attachSidebarResize(sidebar, resizeHandle);

    const mainEditor = getMainEditor();
    if (mainEditor) {
      mainEditor.style.marginRight = "280px";
    }

    attachSidebarButtonListeners(sidebar);
  };

  DebateTools.createSidebarToggleButton = function createSidebarToggleButton() {
    if (document.getElementById("sidebar-toggle-btn")) return;

    const toggleBtn = document.createElement("button");
    toggleBtn.id = "sidebar-toggle-btn";
    toggleBtn.textContent = "Tools";
    toggleBtn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 10px 15px;
      background: #2d3c80;
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
      toggleBtn.style.background = "#2d3c80";
    });

    toggleBtn.addEventListener("mouseout", () => {
      toggleBtn.style.background = "#2d3c80";
    });

    toggleBtn.addEventListener("click", () => {
      DebateTools.injectSidebar();
    });

    document.body.appendChild(toggleBtn);
  };

  global.DebateTools = DebateTools;
})(window);
