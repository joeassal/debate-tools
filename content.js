(function (global) {
  const DebateTools = global.DebateTools || {};

  DebateTools.actions = {
    Paste: async () => await chrome.runtime.sendMessage({ action: "v", useAlt: false, useShift: true }),
    Condense: async () => await DebateTools.condense(),
    Pocket: async () => await chrome.runtime.sendMessage({ action: "1", useAlt: true }),
    Hat: async () => await chrome.runtime.sendMessage({ action: "2", useAlt: true }),
    Block: async () => await chrome.runtime.sendMessage({ action: "3", useAlt: true }),
    Tag: async () => await chrome.runtime.sendMessage({ action: "4", useAlt: true }),
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
      DebateTools.clickDocButton("docs-material-colorpalette-cell-104");
    },
    Clear: async () => {
      DebateTools.clickDocButton("clearFormattingButton");
      await chrome.runtime.sendMessage({ action: "0", useAlt: true });
    },
    Emphasis: () => {DebateTools.clickDocButton("underlineButton");DebateTools.clickDocButton("boldButton")},
    Readmode: async () => await DebateTools.readMode(),
    Importdocx: async () => await DebateTools.ImportDocX(),
    ImportdocxToClipboard: async () => await DebateTools.ImportDocXtoClipboard(),
    Exportdocx: () => DebateTools.ExportDocX(),
    Exportpdf: () => DebateTools.ExportPDF(),
    SendSpeechDoc: async () => await chrome.runtime.sendMessage({ action: "sendSpeechDoc" }, (response) => {if(response && !response.success) { alert(response.message); }}),
    NewSpeechDoc: async () => await chrome.runtime.sendMessage({ action: "newSpeechDoc" }, (response) => {if(response && !response.success) { alert(response.message); }}),
    Shrink: async () => await DebateTools.shrink(),
    Wikify: async () => await DebateTools.wikify(),
    StandardizeHighlights: async () => await DebateTools.standardizeHighlights(),
  };

  //init keybinds
  DebateTools.keybinds = {};
  DebateTools.bindableActions = ["Paste", "Condense", "Pocket", "Hat", "Block", "Tag", "Cite", "Underline", "Emphasis", "Highlight", "Clear"];
  DebateTools.bindableActions.forEach(action => {
    DebateTools.keybinds[action] =
      localStorage.getItem(action) || "Not Selected";
  });
  //set keybinds

  DebateTools.runAction = async function runAction(actionName) {
    if (DebateTools.actions[actionName]) {
      await DebateTools.actions[actionName]();
    }
  };
  DebateTools.defaultKeybinds = function defaultKeybinds() {
    for(let i=0;i<11;i++){
      localStorage.setItem(DebateTools.bindableActions[i], "F"+(i+2))
    }
  }
  if(!DebateTools.keybinds.Paste) {
    DebateTools.defaultKeybinds()
  }
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
