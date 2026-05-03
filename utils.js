(function (global) {
  const DebateTools = global.DebateTools || {};


  DebateTools.clickDocButton = function clickDocButton(buttonId) {
    const buttonEl = document.getElementById(buttonId);

    if (buttonEl) {
      buttonEl.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          view: window,
        })
      );

      buttonEl.dispatchEvent(
        new MouseEvent("mouseup", {
          bubbles: true,
          cancelable: true,
          view: window,
        })
      );

      buttonEl.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          view: window,
        })
      );
    }
  };

  DebateTools.checkClipboard = async function checkClipboard() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.includes("text/html")) {
          const blob = await item.getType("text/html");
          return await blob.text();
        }
      }
    } catch (e) {
      // Permission blocked or unsupported context.
    }
    return "";
  };
  DebateTools.getSelection = async function getSelection() {
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "c", useShift: false, useAlt: false }, resolve);
    });
    const CB = await DebateTools.checkClipboard();
    return CB;
  };
  DebateTools.pasteHTML = async function pasteHTML(html) {
    if (html) {
      const blob = new Blob([html], { type: "text/html" });
      await navigator.clipboard.write([new ClipboardItem({ "text/html": blob })]);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "v", useShift: false, useAlt: false }, resolve);
    });
  }

  DebateTools.ensureDocshiftLoaded = async function ensureDocshiftLoaded() {
    if (global.docshift) return global.docshift;

    const response = await chrome.runtime.sendMessage({ action: "loadDocshift" });
    if (!response || !response.success || !global.docshift) {
      throw new Error("Could not load docshift.");
    }

    return global.docshift;
  };

  DebateTools.modifySelection = async function modifySelection(callback) {
    const startCB = await DebateTools.checkClipboard();
    const startCB2 = await navigator.clipboard.read();

    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "c", useShift: false, useAlt: false }, resolve);
    });

    let newCB = await DebateTools.checkClipboard();
    if (startCB === newCB) {
      return;
    }

    newCB = newCB.replace(/\bid=(["']).*?\1/g, 'id=""');

    const container = document.createElement("div");
    container.innerHTML = newCB;

    const modifiedHtml = await callback(container);
    const blob = new Blob([modifiedHtml ?? container.innerHTML], { type: "text/html" });
    await navigator.clipboard.write([new ClipboardItem({ "text/html": blob })]);

    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "v", useShift: false, useAlt: false }, resolve);
    });
    await new Promise((resolve) => setTimeout(resolve, 100));

    await navigator.clipboard.write(startCB2);
  };
  DebateTools.shrink = function shrink() {
    return DebateTools.modifySelection(async (container) => {
      const spans = container.querySelectorAll("span");
      spans.forEach((span) => {
        const size = span.style.fontSize;
        const underline = span.style.textDecoration;
        if (!(underline && underline.includes("underline"))) {
          const newSize = parseFloat(size) - 1;
          span.style.fontSize = newSize + "px";
        }
      });
      return container.innerHTML;
    });
  };
  DebateTools.condense = function condense() {
    return DebateTools.modifySelection(async (container) => {
      const blocks = container.querySelectorAll("p, div, br");

      blocks.forEach((el) => {
        const pilcrow = document.createElement("span");
        pilcrow.innerText = " ¶ ";
        pilcrow.style.color = "#777";

        if (el.tagName !== "BR") {
          el.appendChild(pilcrow);
        } else {
          el.parentNode.insertBefore(pilcrow, el);
          el.remove();
        }
      });

      const allElements = container.querySelectorAll("*");
      allElements.forEach((el) => {
        el.style.display = "inline";
        el.style.margin = "0";
        el.style.padding = "0";
      });

      let html = container.innerHTML;
      html = html.replace(/[\n\r\t]+/g, " ");
      html = html.replace(/\s+/g, " ");
      html = html.replace(/Â¶\s*Â¶/g, "¶");
      html = html.replace(/¶{2,}/g, '¶');

      container.innerHTML = html.trim();
      container.style.display = "block";
      container.style.whiteSpace = "normal";
      container.style.lineHeight = "1.1";

      return container.innerHTML;
    });
  };

  DebateTools.readMode = async function readMode() {
    const startCB = await DebateTools.checkClipboard();
    const startCB2 = await navigator.clipboard.read();

    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "a", useShift: false, useAlt: false }, resolve);
    });
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "c", useShift: false, useAlt: false }, resolve);
    });

    if (startCB == await DebateTools.checkClipboard()) {
      return;
    }

    const newCB = await DebateTools.checkClipboard();
    const container = document.createElement("div");
    container.innerHTML = newCB;

    await navigator.clipboard.write(startCB2);

    let keepContent = "";
    const pgs = container.querySelector("b");

    for (const pg of pgs.children) {
      const innerText = pg.innerText;
      const isCite = innerText.includes("http") || innerText.includes("www");
      let isCard = false;
      let contingentKC = "";

      pg.querySelectorAll("span").forEach((span) => {
        if (span.style.fontSize && parseFloat(span.style.fontSize) >= 13 && span.style.fontWeight > 400) {
          contingentKC += span.outerHTML + " ";
          return;
        }
        if (isCite && span.style.fontWeight && span.style.fontWeight > 400) {
          contingentKC += span.outerHTML + " ";
        }
        const bg = span.style.backgroundColor;
        const size = span.style.fontSize;
        if (bg && bg !== "transparent") {
          isCard = true;
          contingentKC += span.outerHTML + " ";
        }
        if (size && parseFloat(size) <= 8) {
          isCard = true;
        }
      });

      if (isCard || isCite) {
        keepContent += contingentKC;
      } else {
        keepContent += pg.outerHTML;
      }
    }

    return keepContent;
  };

  DebateTools.ImportDocX = async function ImportDocX() {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [
          {
            description: "Word Document",
            accept: {
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
            },
          },
        ],
      });
      const file = await fileHandle.getFile();
      const docshift = await DebateTools.ensureDocshiftLoaded();
      const html = await docshift.toHtml(file);
      const blob = new Blob([html], { type: "text/html" });
      await navigator.clipboard.write([new ClipboardItem({ "text/html": blob })]);
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "tabThenPaste" }, resolve);
      });
    } catch (err) {
      console.log("Picker closed or failed", err);
    }
  };
  DebateTools.ImportDocXtoClipboard = async () => {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [
          {
            description: "Word Document",
            accept: {
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
            },
          },
        ],
      });
      const file = await fileHandle.getFile();
      const docshift = await DebateTools.ensureDocshiftLoaded();
      const html = await docshift.toHtml(file);
      const blob = new Blob([html], { type: "text/html" });
      await navigator.clipboard.write([new ClipboardItem({ "text/html": blob })]);
    } catch (err) {
      console.log("Picker closed or failed", err);
    }
  };
  DebateTools.ExportDocX = function ExportDocX() {
    const originalUrl = window.location.href;
    const editIndex = originalUrl.indexOf("/edit");
    const exportUrl = originalUrl.substring(0, editIndex) + "/export?format=docx";
    window.location.href = exportUrl;
  };
  DebateTools.ExportPDF = function ExportPDF() {
    const originalUrl = window.location.href;
    const editIndex = originalUrl.indexOf("/edit");
    const exportUrl = originalUrl.substring(0, editIndex) + "/export?format=pdf";
    window.location.href = exportUrl;
  };

  DebateTools.wikify = async function wikify() {
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "c", useShift: false, useAlt: false }, resolve);
    });
    let newCB = await DebateTools.checkClipboard();
    newCB = newCB.replace(/\bid=(["']).*?\1/g, 'id=""');
    const container = document.createElement("div");
    container.innerHTML = newCB;
    const pgs = container.querySelector("b");
    let final="";
    let cardText = "";
    for (const pg of pgs.children) {
      
      const innerText = pg.innerText;
      let isCard = false;
      const isCite = innerText.includes("http") || innerText.includes("www");
      const isHeader = pg.tagName === "H4" || pg.tagName === "H3" || pg.tagName === "H2" || pg.tagName === "H1"
      //set is card and append card text
      pg.querySelectorAll("*").forEach((span) => {
        const bg = span.style.backgroundColor;
        const size = span.style.fontSize;
        isCard = (bg && bg !== "transparent" || size && parseFloat(size) <= 8) && !isCite && !isHeader; 
        if(isCard) {
          cardText += innerText + " ";
        }
      });
      // if card, but last paragraph was card
      if(!isCard && cardText!="") {
        let pgTexts = cardText.trim().split(/\s+/)
        if(pgTexts.length<50) {
          final+=cardText + "\n";
        }
        else final+=`${pgTexts.slice(0,25).join(" ")} \n \n AND \n \n ${pgTexts.slice(-25).join(" ")}\n`;
        cardText = "";
      }
      if (isHeader) {
        final+=`\n====${innerText}====\n`;
      }else if(!isCard) {
        final+=innerText + "\n";
      }
    }
    if(cardText!="") {
        let pgTexts = cardText.trim().split(/\s+/)
        if(pgTexts.length<50) {
          final+=cardText + "\n";
        }
        else final+=`${pgTexts.slice(0,25).join(" ")} \n AND \n \n ${pgTexts.slice(-25).join(" ")}\n`;
    }
    alert("Wikified content copied to clipboard");
    navigator.clipboard.writeText(final);      
  };

  DebateTools.standardizeHighlights = async () => {
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "a"}, resolve);
    });
    return DebateTools.modifySelection(async (container) => {
      container.querySelectorAll("*").forEach((span) => {
        const bg = span.style.backgroundColor;
        span.style.lineHeight/=1.2;
        if (bg && bg !== "transparent") {
          span.style.backgroundColor = DebateTools.settings.highlightColor;
        }
      });
      return container.innerHTML.innerHTML;
    });
  }

  global.DebateTools = DebateTools;
})(window);
