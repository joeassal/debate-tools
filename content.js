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
    Readmode: async () => await DebateTools.readMode(),
    Importdocx: async () => await DebateTools.ImportDocX(),
    Exportdocx: () => DebateTools.ExportDocX(),
  };

  DebateTools.keybinds = {
    F2: "Paste",
    F3: "Condense",
    F4: "Pocket",
    F5: "Hat",
    F6: "Block",
    F7: "Tag",
    F8: "Cite",
    F9: "Underline",
    F10: "Highlight",
    F12: "Clear",
  };

  DebateTools.runAction = async function runAction(actionName) {
    if (DebateTools.actions[actionName]) {
      await DebateTools.actions[actionName]();
    }
  };

  DebateTools.onKeyDown = async function onKeyDown(e) {
    const actionName = DebateTools.keybinds[e.key];
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

  const initObserver = new MutationObserver(() => {
    if (document.querySelector(".docs-texteventtarget-iframe")) {
      DebateTools.injectSidebar();
      DebateTools.attachToDocsEditor();
      DebateTools.createSidebarToggleButton();
      initObserver.disconnect();
    }
  });

  initObserver.observe(document.body, { childList: true, subtree: true });

  global.DebateTools = DebateTools;
})(window);
