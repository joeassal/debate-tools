(function (global) {
  const DebateTools = global.DebateTools || {};
  const settingsStorageKey = "debateSettings";
  const defaultSettings = {
    highlightColor: "yellow",
    cutTextReadMode: true,
    usePilcrows: true,
    speechDocNewWindow: true,
    showFolderTree: true,
    confirmOnRewrite: true,
    normalTextOnClear: false,
    userName: "",
    userSchool: "",
    userFormat: "hspolicy",
    Paste: "F2",
    Condense: "F3",
    Pocket: "F4",
    Hat: "F5",
    Block: "F6",
    Tag: "F7",
    Cite: "F8",
    Underline: "F9",
    Emphasis: "F10",
    Highlight: "F11",
    Clear: "F12",
    formatFont: "Calibri",
    ntextSize: "11",
    h1Size: "26",
    h2Size: "22",
    h3Size: "16",
    h4Size: "13",
  }

  DebateTools.loadSettings = function loadSettings() {
    try {
      return {
        ...defaultSettings,
        ...JSON.parse(localStorage.getItem(settingsStorageKey) || "{}"),
      };
    } catch (error) {
      console.warn("Could not load debate settings", error);
      return { ...defaultSettings };
    }
  };

  DebateTools.saveSettings = function saveSettings() {
    localStorage.setItem(settingsStorageKey, JSON.stringify(DebateTools.settings));
  };

  DebateTools.getSetting = function getSetting(setting) {
    return DebateTools.settings[setting];
  };

  DebateTools.changeSetting = function changeSetting(setting, newValue) {
    DebateTools.settings[setting] = newValue;
    if (DebateTools.keybinds && DebateTools.bindableActions && DebateTools.bindableActions.includes(setting)) {
      DebateTools.keybinds[setting] = newValue;
    }
    DebateTools.saveSettings();
    return newValue;
  };

  DebateTools.settings = DebateTools.loadSettings();
  highlightLookup = {
    yellow: "docs-material-colorpalette-cell-103",
    lime: "docs-material-colorpalette-cell-104",
    cyan: "docs-material-colorpalette-cell-105",
    magenta: "docs-material-colorpalette-cell-109",
    red: "docs-material-colorpalette-cell-101",
  }
  DebateTools.actions = {
    Paste: async () => await DebateTools.clickDocsMenuShortcut("Ctrl+Shift+V"),
    Condense: async () => await DebateTools.condense(),
    Pocket: async () => await DebateTools.clickHeader("Ctrl+Alt+1"),
    Hat: async () => await DebateTools.clickHeader("Ctrl+Alt+2"),
    Block: async () => await DebateTools.clickHeader("Ctrl+Alt+3"),
    Tag: async () => await DebateTools.clickHeader("Ctrl+Alt+4"),
    Cite: async () => {
      DebateTools.clickDocButton("clearFormattingButton");
      DebateTools.clickDocButton("fontSizeIncrement");
      DebateTools.clickDocButton("fontSizeIncrement");
      DebateTools.clickDocButton("boldButton");
    },
    Underline: () => DebateTools.clickDocButton("underlineButton"),
    Highlight: async () => {
      DebateTools.clickDocButton("bgColorButton");
      DebateTools.clickDocButton("bgColorButton");
      DebateTools.clickDocButton(highlightLookup[DebateTools.getSetting("highlightColor")]);
    },
    Clear: async () => {
      DebateTools.clickDocButton("clearFormattingButton");
      if(DebateTools.getSetting("normalTextOnClear")) DebateTools.clickHeader("Ctrl+Alt+0")
    },
    Emphasis: () => {DebateTools.clickDocButton("underlineButton");DebateTools.clickDocButton("boldButton")},
    Readmode: async () => await DebateTools.readMode(),
    Importdocx: async () => await DebateTools.ImportDocX(),
    ImportdocxToClipboard: async () => await DebateTools.ImportDocXtoClipboard(),
    Exportdocx: () => DebateTools.ExportDocX(),
    Exportpdf: () => DebateTools.ExportPDF(),
    SendSpeechDoc: async () => await chrome.runtime.sendMessage({ action: "sendSpeechDoc" }, (response) => {if(response && !response.success) { alert(response.message); }}),
    NewSpeechDoc: async () => await chrome.runtime.sendMessage({ action: "newSpeechDoc", newWindow: DebateTools.getSetting("speechDocNewWindow") }, (response) => {if(response && !response.success) { alert(response.message); }}),
    Shrink: async () => await DebateTools.shrink(),
    Email: async () => await DebateTools.clickDocsMenuShortcut("Email this file a"),
    Wikify: async () => await DebateTools.wikify(),
    StandardizeHighlights: async () => await DebateTools.standardizeHighlights(),
    OpenCaseList: async () => await DebateTools.openCaselist()
  };

  //init keybinds
  DebateTools.keybinds = {
    SendSpeechDoc: "`"
  };
  DebateTools.bindableActions = ["Paste", "Condense", "Pocket", "Hat", "Block", "Tag", "Cite", "Underline", "Emphasis", "Highlight", "Clear"];
  DebateTools.bindableActions.forEach(action => {
    DebateTools.keybinds[action] = DebateTools.getSetting(action) || "Not Selected";
  });
  //set keybinds


  DebateTools.defaultKeybinds = function defaultKeybinds() {
    for(let i=0;i<11;i++){
      const action = DebateTools.bindableActions[i];
      DebateTools.keybinds[action] = "F"+(i+2);
      DebateTools.changeSetting(action, "F"+(i+2));
    }
  }


  DebateTools.runAction = async function runAction(actionName) {
    if (DebateTools.actions[actionName]) {
      await DebateTools.actions[actionName]();
    }
  };

  DebateTools.onKeyDown = async function onKeyDown(e) {
    const actionName = Object.keys(DebateTools.keybinds).find(key => DebateTools.keybinds[key] === e.key);
    if (actionName !== undefined) {
      e.preventDefault();
      e.stopImmediatePropagation();
      await DebateTools.runAction(actionName);
    }
  };

  DebateTools.attachToDocsEditor = function attachToDocsEditor() {
    const editorIframe = document.querySelector(".docs-texteventtarget-iframe");

    if (editorIframe) {
      editorIframe.contentDocument.addEventListener(
        "keydown",
        (e) => {
          DebateTools.onKeyDown(e);
        },
        true
      );
    }
  };

  DebateTools.focusDocsEditor = function focusDocsEditor() {
    const editorIframe = document.querySelector(".docs-texteventtarget-iframe");
    if (editorIframe) {
      editorIframe.contentWindow.focus();
      if (editorIframe.contentDocument && editorIframe.contentDocument.body) {
        editorIframe.contentDocument.body.focus();
      }
      editorIframe.focus();
      return true;
    }
    return false;
  };

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "focusDocsEditor") {
      sendResponse({ focused: DebateTools.focusDocsEditor() });
      return;
    }

    if (message.action === "clickDocsMenuShortcut") {
      (async () => {
        const clicked = await DebateTools.clickDocsMenuShortcut(message.shortcutLabel);
        sendResponse({ success: clicked });
      })().catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }
  });

  const initObserver = new MutationObserver(() => {
    if (document.querySelector(".docs-texteventtarget-iframe")) {
      DebateTools.attachToDocsEditor();
      DebateTools.createSidebarToggleButton();
      initObserver.disconnect();
    }
  });

  initObserver.observe(document.body, { childList: true, subtree: true });

  global.DebateTools = DebateTools;
})(window);
