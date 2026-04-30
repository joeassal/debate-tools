(function (global) {
  const DebateTools = global.DebateTools || {};

  DebateTools.settings = {
    highlightColor: "yellow",
  };

  DebateTools.clickDocButton = function clickDocButton(buttonId) {
    const buttonEl = document.getElementById(buttonId);
    console.log(buttonEl);

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
      const plainTextEl = document.createElement("div");
      plainTextEl.innerHTML = html;

      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plainTextEl.textContent || ""], { type: "text/plain" }),
        }),
      ]);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "v", useShift: false, useAlt: false }, resolve);
    });
  }

  DebateTools.modifySelection = async function modifySelection(callback) {
    const startCB = await DebateTools.checkClipboard();
    const startCB2 = await navigator.clipboard.read();

    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "c", useShift: false, useAlt: false }, resolve);
    });

    if (startCB == await DebateTools.checkClipboard()) {
      return;
    }

    let newCB = await DebateTools.checkClipboard();
    newCB = newCB.replace(/\bid=(["']).*?\1/g, 'id=""');

    const container = document.createElement("div");
    container.innerHTML = newCB;

    const blob = new Blob([await callback(container)], { type: "text/html" });
    await navigator.clipboard.write([new ClipboardItem({ "text/html": blob })]);

    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "v", useShift: false, useAlt: false }, resolve);
    });
    await new Promise((resolve) => setTimeout(resolve, 100));

    await navigator.clipboard.write(startCB2);
  };

  DebateTools.changeProperty = function changeProperty(property, value) {
    return DebateTools.modifySelection(async (container) => {
      const spans = container.querySelectorAll("*");
      spans.forEach((span) => {
        span.setAttribute(property, value);
      });
      return container.innerHTML;
    });
  };

  DebateTools.highlight = function highlight() {
    return DebateTools.modifySelection(async (container) => {
      let hText = "";

      container.querySelectorAll("span").forEach((span) => {
        const bg = span.style.backgroundColor;

        if (bg && bg !== "transparent") {
          hText += span.textContent;
        }
      });

      if (hText.trim() === container.textContent.trim()) {
        container.querySelectorAll("span").forEach((span) => {
          span.style.backgroundColor = "transparent";
        });
      } else {
        container.querySelectorAll("span").forEach((span) => {
          span.style.backgroundColor = DebateTools.settings.highlightColor;
        });
      }

      return container.innerHTML;
    });
  };

  DebateTools.condense = function condense() {
    return DebateTools.modifySelection(async (container) => {
      const blocks = container.querySelectorAll("p, div, br");

      blocks.forEach((el) => {
        const pilcrow = document.createElement("span");
        pilcrow.innerText = " Â¶ ";
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
      html = html.replace(/Â¶\s*Â¶/g, "Â¶");

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
    console.log("ImportDocX called");
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

  DebateTools.ExportDocX = function ExportDocX() {
    const originalUrl = window.location.href;
    const editIndex = originalUrl.indexOf("/edit");
    const exportUrl = originalUrl.substring(0, editIndex) + "/export?format=docx";
    window.location.href = exportUrl;
  };

  global.DebateTools = DebateTools;
})(window);
