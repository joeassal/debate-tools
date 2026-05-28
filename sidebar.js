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
            font-family: Inter, sans-serif;
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
            overflow-x: hidden;
          }
          #content-area * {
            max-width: 100%;
            box-sizing: border-box;
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
        event.preventDefault();
        contentArea.scrollLeft = 0;
        contentArea.scrollBy({ top: contentArea.clientHeight-200, behavior: "smooth" });
        currentPage++;
        pageInfo.innerHTML = `Page <span id="current-page">${currentPage}</span>`;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        contentArea.scrollLeft = 0;
        contentArea.scrollBy({ top: 200-contentArea.clientHeight, behavior: "smooth" });
        currentPage = currentPage > 1 ? currentPage - 1 : 1;
        pageInfo.innerHTML = `Page <span id="current-page">${currentPage}</span>`;
      }
    });
    contentArea.addEventListener("scroll", () => {
      if (contentArea.scrollLeft !== 0) contentArea.scrollLeft = 0;
    });
  }

  async function openReadModeWindow() {
    const readContent = await DebateTools.actions.Readmode();
    const readWindow = window.open("", "DebateReadMode", "width=900,height=900");

    writeReadModeWindow(readWindow, readContent);
    readWindow.focus();
    attachReadModeNavigation(readWindow);
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
      const minWidth = 220;
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
    sidebar.querySelectorAll(".side-btn[data-action]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        DebateTools.focusDocsEditor();
        await new Promise((resolve) => setTimeout(resolve, 50));

        const actionName = btn.getAttribute("data-action");

        if (actionName === "Readmode") {
          await openReadModeWindow();
        }
        else if (actionName === "Timer") {
          window.open("https://debatetimer.net/", "Debate Timer", "width=400,height=600");
        } else if (actionName === "SpeechDrop") {
          window.open(`https://speechdrop.net/${prompt("Speech drop code?")}`, "Speech Drop", "width=600,height=600");
        }
        else {
          await DebateTools.runAction(actionName);
        }
      });
    });
  }

  function attachSidebarDropdownDismiss(sidebar) {
    const dropdownSelector = ".more-features-dropdown, .action-menu-dropdown";

    document.addEventListener("click", (event) => {
      sidebar.querySelectorAll(`${dropdownSelector}[open]`).forEach((dropdown) => {
        if (!dropdown.contains(event.target)) {
          dropdown.open = false;
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
      background: #f8fafc;
      z-index: 1000000;
      border-left: 1px solid #cfd6e4;
      display: flex;
      flex-direction: column;
      font-family: Inter, sans-serif;
      color: #172033;
      box-shadow: -6px 0 18px rgba(15, 23, 42, 0.14);
    `;

    sidebar.innerHTML = /* html */ `
      <div class="sidebar-header">
        <span>CardFlow - Debate Tools</span>
        <button id="close-sidebar" type="button" title="Close">x</button>
      </div>
      <div class="sidebar-control-grid">
        <div class="sidebar-button-grid">

        <button class="side-btn" data-action="Paste"><span class="side-btn-label">Paste</span><span class="side-btn-keybind">${DebateTools.getSetting("Paste")}</span></button>
        <button class="side-btn" data-action="Condense"><span class="side-btn-label">Condense</span><span class="side-btn-keybind">${DebateTools.getSetting("Condense")}</span></button>
        <button class="side-btn" data-action="Pocket"><span class="side-btn-label">Pocket</span><span class="side-btn-keybind">${DebateTools.getSetting("Pocket")}</span></button>
        <button class="side-btn" data-action="Hat"><span class="side-btn-label">Hat</span><span class="side-btn-keybind">${DebateTools.getSetting("Hat")}</span></button>
        <button class="side-btn" data-action="Block"><span class="side-btn-label">Block</span><span class="side-btn-keybind">${DebateTools.getSetting("Block")}</span></button>
        <button class="side-btn" data-action="Tag"><span class="side-btn-label">Tag</span><span class="side-btn-keybind">${DebateTools.getSetting("Tag")}</span></button>
        <button class="side-btn" data-action="Cite"><span class="side-btn-label">Cite</span><span class="side-btn-keybind">${DebateTools.getSetting("Cite")}</span></button>
        <button class="side-btn" data-action="Underline"><span class="side-btn-label">Underline</span><span class="side-btn-keybind">${DebateTools.getSetting("Underline")}</span></button>
        <button class="side-btn" data-action="Emphasis"><span class="side-btn-label">Emphasis</span><span class="side-btn-keybind">${DebateTools.getSetting("Emphasis")}</span></button>
        <button class="side-btn" data-action="Highlight"><span class="side-btn-label">Highlight</span><span class="side-btn-keybind">${DebateTools.getSetting("Highlight")}</span>
          <select id="highlight-color-select" name="HighlightColor" class="sidebar-select">
          <option  value="yellow">🟨</option>
          <option  value="lime">🟩</option>
          <option  value="cyan">🟦</option>
          <option  value="magenta">🟪</option>
          <option value="red">🟥️</option>
          </select>
        </button>
        <button class="side-btn" data-action="Clear"><span class="side-btn-label">Clear</span><span class="side-btn-keybind">${DebateTools.getSetting("Clear")}</span></button>
        <button class="side-btn" data-action="Shrink">Shrink</button>
        <details class="more-features-dropdown">
          <summary class="side-btn" title="More feature options">Doc v</summary>
          <div class="action-menu-list action-menu-list-wide ">
          <button class="side-btn" data-action="StandardizeHighlights">🖍 Standardize Highlights</button>
            <button class="side-btn" data-action="ConvertStyles">Convert to default styles</button>
            <button class="side-btn" data-action="NumberHeaders">Auto Number Headers</button>
            <button class="side-btn" data-action="DeNumberHeaders">De-Number Headers</button>
            <button class="side-btn" data-action="CutBlankTags">Remove Blank Tags</button>
            <button class="side-btn" data-action="CutHyperLinks">Remove Hyper Links</button>
          </div>
        </details>
        <hr style="width: 100%; border: 0; border-top: 1px solid #eee;">
        <button class="side-btn" data-action="Exportdocx">Export DOCX</button>
        <button class="side-btn" data-action="ImportdocxToClipboard">Clipboard Import</button>
        <button class="side-btn" data-action="SpeechDrop">Speech Drop</button>
        <button class="side-btn" data-action="Timer">⏲ Timer</button>
        <button class="side-btn" data-action="Email">✉ Email</button>
        <button class="side-btn" data-action="Readmode">🕮 Read Mode</button>
        <button class="side-btn" data-action="Wikify">❝❞ Wikify</button>
        <button class="side-btn" data-action="OpenCaseList">🗀 Caselist</button>
        <hr style="width: 100%; border: 0; border-top: 1px solid #eee;">
        <div class="action-menu">
          <button class="side-btn action-menu-main" data-action="Flow">Flow</button>
          <details class="action-menu-dropdown">
            <summary title="Flow options">More</summary>
            <div class="action-menu-list">
              <button class="side-btn" data-action="SendSelectionToFlow">Send to Flow</button>
              <button class="side-btn" data-action="ExtrapolateFlow">Flow Doc</button>
            </div>
          </details>
        </div>
        <div class="action-menu" aria-label="Speech document actions">
          <button class="side-btn action-menu-main" data-action="NewSpeechDoc" title="Create a new speech doc">+ Speech Doc</button>
          <details class="action-menu-dropdown">
            <summary title="Speech doc options">More</summary>
            <div class="action-menu-list action-menu-list-wide">
              <button class="side-btn" data-action="SendSpeechDoc" title="Send selected content to current speech doc">Send to Speech Doc</button>
              <button class="side-btn" data-action="SelectSpeechDoc" title="Select an open speech doc">Select Speech Doc</button>
            </div>
          </details>
        </div>
        <button class="side-btn" id="SettingsBtn">⛯ Settings</button>
        <a class="side-btn" href="https://www.example.com">ⓘ Help</a>
        </div>
        <br>
        <div id="folder-tree-host"></div>
      </div>
      <div id="settings" style="display:none;">
      <div class="settings-header">
        <b>Settings</b>
        <button id="settings-close" type="button">X</button>
      </div>
        <details class="settings-detail" id="keybindsFormat"><summary><span>Formatting Keybinds</span><button id="settings-default" type="button">Reset Default</button></summary>
            <label class="settings-row">Paste<select name="Paste"><option value="Not Selected">Not Selected</option></select></label>
            <label class="settings-row">Condense<select name="Condense"><option value="Not Selected">Not Selected</option></select></label>
            <label class="settings-row">Pocket<select name="Pocket"><option value="Not Selected">Not Selected</option></select></label>
            <label class="settings-row">Hat<select name="Hat"><option value="Not Selected">Not Selected</option></select></label>
            <label class="settings-row">Block<select name="Block"><option value="Not Selected">Not Selected</option></select></label>
            <label class="settings-row">Tag<select name="Tag"><option value="Not Selected">Not Selected</option></select></label>
            <label class="settings-row">Cite<select name="Cite"><option value="Not Selected">Not Selected</option></select></label>
            <label class="settings-row">Underline<select name="Underline"><option value="Not Selected">Not Selected</option></select></label>
            <label class="settings-row">Emphasis<select name="Emphasis"><option value="Not Selected">Not Selected</option></select></label>
            <label class="settings-row">Highlight<select name="Highlight"><option value="Not Selected">Not Selected</option></select></label>
            <label class="settings-row">Clear<select name="Clear"><option value="Not Selected">Not Selected</option></select></label>
        </details>
        <details class="settings-detail" id="formatStyles"><summary><span>Styles</span> <button id="settings-setstyle">Set Styles</button></summary>
            <label class="settings-row">Font<select id="font" name="formatFont">
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Calibri">Calibri</option>
            </select></label>
            <label class="settings-row">Normal text font size<input name="ntextSize"></label>
            <label class="settings-row">Pocket font size<input name="h1Size"></label>
            <label class="settings-row">Hat font size<input name="h2Size"></label>
            <label class="settings-row">Block font size<input name="h3Size"></label>
            <label class="settings-row">Tag font size<input name="h4Size"></label>
        </details>
        <details class="settings-detail" id="Features"><summary><span>Features</span></summary>
            <label class="settings-row">Cut Text in Read Mode?<input type="checkbox" name="cutTextReadMode"></label>
            <label class="settings-row">Use pilcrows on Condense?<input type="checkbox" name="usePilcrows"></label>
            <label class="settings-row">New window when making speech doc?<input type="checkbox" name="speechDocNewWindow"></label>
            <label class="settings-row">Convert to normal text when clearing formatting?<input type="checkbox" name="normalTextOnClear"></label>
        </details>
        <details class="settings-detail"><summary><span>Flow</span></summary>
            <label class="settings-row">Shorthand when sending to flow<input type="text" name="fillerFlowWords" placeholder="topicality:T,links:LX"></label>
        </details>
        <details class="settings-detail"><summary><span>Virtual Tub</span></summary>
            <label class="settings-row">Show Virtual Tub?<input type="checkbox" name="showFolderTree"></label>
            <label class="settings-row">Ask to confirm when rewriting?<input type="checkbox" name="confirmOnRewrite"></label>
        </details>
        <details class="settings-detail" id="Caselist"><summary><span>Caselist Info</span></summary>
            <label class="settings-row">Format<select id="userFormat">
            <option value="hspolicy">HS Policy</option>
            <option value="hsld">HS Lincoln-Douglas</option>
            <option value="hspf">HS Public Forum</option>
            <option value="nfald">NFA Lincoln-Douglas</option>
            <option value="ndtceda">College Policy</option>
            </select></label>
            <label class="settings-row">School Name on Wiki<input name="userSchool"></label>
            <label class="settings-row">Full Name<input name="userName"></label>
        </details>
      </div>
      <style>
        .side-btn {
          position: relative;
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          box-sizing: border-box;
          width: 100%;
          min-height: 28px;
          padding: 10px 7px 5px 7px;
          cursor: pointer;
          border: 1px solid #cfd6e4;
          border-radius: 4px;
          background: #ffffff;
          text-align: left;
          text-decoration: none;
          color: #172033;
          font-size: 12px;
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: background-color 0.15s, border-color 0.15s, box-shadow 0.15s;
        }
        .side-btn-label {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .side-btn-keybind {
          position: absolute;
          top: 2px;
          right: 5px;
          color: #7a8494;
          font-size: 9px;
          font-weight: 400;
          line-height: 1;
          pointer-events: none;
        }
        .side-btn[data-action="Highlight"] {
          gap: 6px;
        }
        .side-btn[data-action="Highlight"] .side-btn-label {
          flex: 1;
        }
        .side-btn[data-action="Highlight"] .sidebar-select {
          margin-left: auto;
        }
        .side-btn:hover {
          background: #eef2ff;
          border-color: #95a3d6;
        }
        .side-btn:active {
          background: #e0e7ff;
        }
        .side-btn:focus-visible,
        #close-sidebar:focus-visible,
        #settings-close:focus-visible,
        #settings-default:focus-visible,
        #settings-setstyle:focus-visible {
          outline: none;
          border-color: #2d3c80;
          box-shadow: 0 0 0 2px rgba(45, 60, 128, 0.16);
        }
        .sidebar-header {
          min-height: 44px;
          padding: 10px 12px;
          background: #2d3c80;
          color: #ffffff;
          font-weight: bold;
          display: flex;
          justify-content: space-between;
          align-items: center;
          letter-spacing: 0;
        }
        #close-sidebar {
          width: 26px;
          height: 26px;
          border: 1px solid rgba(255, 255, 255, 0.35);
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
        }
        #close-sidebar:hover {
          background: rgba(255, 255, 255, 0.18);
        }
        .sidebar-control-grid {
          padding: 10px;
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
        }
        .sidebar-button-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          align-content: start;
        }
        .sidebar-button-grid hr {
          grid-column: 1 / -1;
          width: 100%;
          margin: 2px 0;
          border: 0;
          border-top: 1px solid #dfe5ef;
        }
        .action-menu {
          grid-column: 1 / -1;
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 74px;
          border: 1px solid #cfd6e4;
          border-radius: 4px;
          background: #ffffff;
        }
        .action-menu .action-menu-main {
          min-height: 32px;
          border: 0;
          border-radius: 0;
          background: transparent;
          font-weight: 450;
        }
        .action-menu .action-menu-main:hover {
          background: #eef2ff;
          border-color: transparent;
        }
        .action-menu-dropdown {
          border-left: 1px solid #dfe5ef;
        }
        .action-menu-dropdown summary {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 32px;
          padding: 0 8px;
          cursor: pointer;
          color: #172033;
          font-size: 12px;
          list-style: none;
          user-select: none;
        }
        .action-menu-dropdown summary::-webkit-details-marker {
          display: none;
        }
        .action-menu-dropdown summary::after {
          content: "v";
          margin-left: 5px;
          font-size: 10px;
          color: #64748b;
        }
        .action-menu-dropdown[open] summary {
          background: #eef2ff;
        }
        .action-menu-list {
          position: absolute;
          top: calc(100% + 4px);
          right: 0;
          z-index: 2;
          width: 154px;
          padding: 4px;
          border: 1px solid #cfd6e4;
          border-radius: 4px;
          background: #ffffff;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.16);
        }
        .action-menu-list .side-btn {
          justify-content: flex-start;
          border: 0;
          border-radius: 3px;
        }
        .action-menu-list-wide {
          width: 176px;
        }
        .more-features-dropdown {
          position: relative;
        }
        .more-features-dropdown .action-menu-list {
          left: 0;
          right: auto;
          width: calc(200% + 8px);
          box-sizing: border-box;
        }
        .more-features-dropdown summary::-webkit-details-marker {
          display: none;
        }
        .select-row {
          box-sizing: border-box;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          min-height: 28px;
          padding: 5px 7px;
          border: 1px solid #cfd6e4;
          border-radius: 4px;
          background: #fff;
          color: #172033;
          font-size: 12px;
        }
        .highlight-select-row {
          min-height: 24px;
        }
        .sidebar-select,
        #settings select {
          box-sizing: border-box;
          min-height: 24px;
          padding: 2px 22px 2px 7px;
          border: 1px solid #c9d1d9;
          border-radius: 4px;
          background-color: #f8fafc;
          color: #172033;
          cursor: pointer;
          font-family: Inter, sans-serif;
          font-size: 12px;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s, background-color 0.15s;
        }
        #highlight-color-select {
          width: 22px;
          min-width: 22px;
          min-height: 20px;
          padding: 0 1px;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          text-align: center;
        }
        .sidebar-select:hover,
        #settings select:hover {
          background-color: #fff;
          border-color: #8fa1b3;
        }
        .sidebar-select:focus,
        #settings select:focus {
          background-color: #fff;
          border-color: #2d3c80;
          box-shadow: 0 0 0 2px rgba(45, 60, 128, 0.14);
        }
        #folder-tree-host {
          flex: 0 0 auto;
          margin-top: auto;
          min-height: 0;
        }
        #settings {
          position: fixed;
          top: 72px;
          right: 12px;
          box-sizing: border-box;
          padding: 12px;
          border: 1px solid #c9d1d9;
          border-radius: 6px;
          background: white;
          width: min(320px, calc(100vw - 24px));
          max-height: min(520px, calc(100vh - 96px));
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
          color: #172033;
          font-size: 12px;
          overflow: auto;
        }
        .settings-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .settings-header b {
          font-size: 17px;
        }
        #settings-close {
          width: 24px;
          height: 24px;
          border: 1px solid #cfd6e4;
          border-radius: 4px;
          background: #fff;
          cursor: pointer;
          font-size: 12px;
        }
        #settings-close:hover {
          background: #f8f9fa;
        }
        .settings-detail {
          font-size: 13px;
        }
        .settings-detail summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 8px;
          cursor: pointer;
          font-weight: bold;
        }
        #settings-default, #settings-setstyle {
          border: 1px solid #dadce0;
          border-radius: 4px;
          background: #f8fafc;
          cursor: pointer;
          padding: 3px 7px;
          font-size: 12px;
        }
        #settings-default:hover {
          background: #eef2ff;
          border-color: #9aa7d9;
        }
        .settings-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 128px;
          align-items: center;
          gap: 10px;
          padding: 7px 0;
          border-top: 1px solid #f0f2f5;
        }
    </style>  
    `;
    document.body.appendChild(sidebar);

    // Settings logic
    function changeSetting(key, value) {
      DebateTools.changeSetting(key, value);
      if (key === "showFolderTree") updateFolderTreeVisibility(value);
    }
    
    document.getElementById("SettingsBtn").addEventListener("click", () => {
      const settings = document.getElementById("settings");
      settings.style.display = settings.style.display === "block" ? "none" : "block";
    });
    document.getElementById("settings-close").addEventListener("click", () => {
      document.getElementById("settings").style.display = "none";
    });
    document.getElementById("settings-default").addEventListener("click",()=> {
      for(let i=0;i<11;i++){
        setKeybind(DebateTools.bindableActions[i], "F"+(i+2))
      }
    })
    document.getElementById("settings-setstyle").addEventListener("click", async ()=> await DebateTools.formatHeaderStyles())

    const highlightColorSelect = document.getElementById("highlight-color-select");
    highlightColorSelect.value = DebateTools.getSetting("highlightColor");
    ["pointerdown", "mousedown", "mouseup", "click"].forEach((eventName) => {
      highlightColorSelect.addEventListener(eventName, (e) => e.stopPropagation());
    });
    highlightColorSelect.addEventListener("change", (e) => {
      e.stopPropagation();
      changeSetting("highlightColor", e.target.value);
    });

    document.getElementById("userFormat").value = DebateTools.getSetting("userFormat");
    document.getElementById("userFormat").addEventListener("change", (e) => changeSetting("userFormat", e.target.value));
    document.getElementById("font").value = DebateTools.getSetting("formatFont");
    document.getElementById("font").addEventListener("change", (e) => changeSetting("formatFont", e.target.value));
    sidebar.querySelectorAll('INPUT').forEach((input) => {
      if(input.type=="checkbox") {
        input.checked = DebateTools.getSetting(input.name)
        input.addEventListener("change", (e) => changeSetting(input.name, e.target.checked))
      } else {
        input.value = DebateTools.getSetting(input.name)
        input.addEventListener("change", (e) => changeSetting(input.name, e.target.value))
      }
    })
    function updateFolderTreeVisibility(showFolderTree) {
      const folderTreeHost = document.getElementById("folder-tree-host");
      if (!folderTreeHost) return;

      folderTreeHost.style.display = showFolderTree ? "" : "none";
      if (showFolderTree && !folderTreeHost.hasChildNodes()) {
        DebateTools.attachFolderTree();
      }
    }

    //keybinds
    const keybindsFormat = document.getElementById("keybindsFormat")
    keybindsFormat.querySelectorAll("SELECT").forEach((tsKey) => {
      for(let i=1;i<=12;i++) {
        const option = document.createElement("option")
        option.value="F"+i
        option.innerHTML="F"+i
        tsKey.appendChild(option)
      }
      tsKey.value = DebateTools.getSetting(tsKey.name)

      tsKey.addEventListener('change', (e) => setKeybind(tsKey.name, e.target.value))      
    })
    function setKeybind(action, newKey) {
      // 1. Remove duplicate usage of this key
      for (const key in DebateTools.keybinds) {
        if (DebateTools.keybinds[key] === newKey) {
          DebateTools.keybinds[key] = "Not Selected";
          syncSelect(key, "Not Selected");
          syncActionButton(key, "Not Selected");
          DebateTools.changeSetting(key, "Not Selected");
        }
      }
      // 2. Set new value
      DebateTools.keybinds[action] = newKey;
      DebateTools.changeSetting(action, newKey);
      // 3. Sync UI
      syncSelect(action, newKey);
      syncActionButton(action, newKey);
    }
    function syncSelect(action, value) {
      const select = keybindsFormat.querySelector(
        `select[name="${action}"]`
      );
      if (select) select.value = value;
    }
    function syncActionButton(action, value) {
      const button = sidebar.querySelector(`.side-btn[data-action="${action}"]`);
      if (!button) return;

      let keybind = button.querySelector(".side-btn-keybind");
      if (!keybind) {
        keybind = document.createElement("span");
        keybind.className = "side-btn-keybind";
        button.appendChild(keybind);
      }
      keybind.textContent = value;
    }
    // end keybind logic



    //attaching folder tree
    if (DebateTools.getSetting("showFolderTree")) {
      DebateTools.attachFolderTree();
    }
    updateFolderTreeVisibility(DebateTools.getSetting("showFolderTree"));

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
    attachSidebarDropdownDismiss(sidebar);

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
