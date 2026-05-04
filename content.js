(function (global) {
  const DebateTools = global.DebateTools || {};

  DebateTools.settings = {
    highlightColor: localStorage.getItem("highlightColor") || "yellow",
    cutTextReadMode: localStorage.getItem("cutTextReadMode") !== "false",
    usePilcrows: localStorage.getItem("usePilcrows") !== "false",
    speechDocNewWindow: localStorage.getItem("speechDocNewWindow") !== "false",
    showFolderTree: localStorage.getItem("showFolderTree") !== "false",

    userName: localStorage.getItem("userName") || "",
    userSchool: localStorage.getItem("userSchool") || "",
    userFormat: localStorage.getItem("userFormat") || "hspolicy",
  };
  highlightLookup = {
    yellow: "docs-material-colorpalette-cell-103",
    lime: "docs-material-colorpalette-cell-104",
    cyan: "docs-material-colorpalette-cell-105",
    magenta: "docs-material-colorpalette-cell-109",
    red: "docs-material-colorpalette-cell-101",
  }
  DebateTools.actions = {
    Paste: async () => await DebateTools.sendShortcut("v", true),
    Condense: async () => await DebateTools.condense(),
    Pocket: async () => await DebateTools.sendShortcut("1", false, true),
    Hat: async () => await DebateTools.sendShortcut("2", false, true),
    Block: async () => await DebateTools.sendShortcut("3", false, true),
    Tag: async () => await DebateTools.sendShortcut("4", false, true),
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
      DebateTools.clickDocButton(highlightLookup[DebateTools.settings.highlightColor]);
    },
    Clear: async () => {
      DebateTools.clickDocButton("clearFormattingButton");
      await DebateTools.sendShortcut("0", false, true);
    },
    Emphasis: () => {DebateTools.clickDocButton("underlineButton");DebateTools.clickDocButton("boldButton")},
    Readmode: async () => await DebateTools.readMode(),
    Importdocx: async () => await DebateTools.ImportDocX(),
    ImportdocxToClipboard: async () => await DebateTools.ImportDocXtoClipboard(),
    Exportdocx: () => DebateTools.ExportDocX(),
    Exportpdf: () => DebateTools.ExportPDF(),
    SendSpeechDoc: async () => await chrome.runtime.sendMessage({ action: "sendSpeechDoc" }, (response) => {if(response && !response.success) { alert(response.message); }}),
    NewSpeechDoc: async () => await chrome.runtime.sendMessage({ action: "newSpeechDoc", newWindow: DebateTools.settings.speechDocNewWindow }, (response) => {if(response && !response.success) { alert(response.message); }}),
    Shrink: async () => await DebateTools.shrink(),
    Wikify: async () => await DebateTools.wikify(),
    StandardizeHighlights: async () => await DebateTools.standardizeHighlights(),
  };

  //init keybinds
  DebateTools.keybinds = {
    SendSpeechDoc: "`"
  };
  DebateTools.bindableActions = ["Paste", "Condense", "Pocket", "Hat", "Block", "Tag", "Cite", "Underline", "Emphasis", "Highlight", "Clear"];
  DebateTools.bindableActions.forEach(action => {
    DebateTools.keybinds[action] =
      localStorage.getItem(action) || "Not Selected";
  });
  //set keybinds


  DebateTools.defaultKeybinds = function defaultKeybinds() {
    for(let i=0;i<11;i++){
      localStorage.setItem(DebateTools.bindableActions[i], "F"+(i+2))
    }
  }

  // If user is new, do these actions
  if(localStorage.getItem("hasLoadedBefore") === null) {
    DebateTools.defaultKeybinds()
    localStorage.setItem("cutTextReadMode", "true");
    localStorage.setItem("usePilcrows", "true");
    localStorage.setItem("speechDocNewWindow", "true");
    localStorage.setItem("showFolderTree", "true");
    localStorage.setItem("hasLoadedBefore", "true");
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
      editorIframe.focus();
      return true;
    }
    return false;
  };

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action !== "focusDocsEditor") return;
    sendResponse({ focused: DebateTools.focusDocsEditor() });
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
