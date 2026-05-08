(function (global) {
  const DebateTools = global.DebateTools || {};


  DebateTools.clickElement = function clickElement(element) {
    if (!element) return false;

    element.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        view: window,
      })
    );

    element.dispatchEvent(
      new MouseEvent("mouseup", {
        bubbles: true,
        cancelable: true,
        view: window,
      })
    );

    element.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      })
    );

    return true;
  };

  DebateTools.hoverElement = function hoverElement(element) {
    if (!element) return false;

    ["mouseover", "mouseenter", "mousemove"].forEach((eventType) => {
      element.dispatchEvent(
        new MouseEvent(eventType, {
          bubbles: true,
          cancelable: true,
          view: window,
        })
      );
    });

    return true;
  };

  DebateTools.sleep = function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  DebateTools.clickDocButton = function clickDocButton(buttonId) {
    const buttonEl = document.getElementById(buttonId);
    DebateTools.clickElement(buttonEl)
  }
  DebateTools.waitForElement = function waitForElement(selector, timeout = 500) {
    const existing = document.querySelector(selector);
    if (existing) return Promise.resolve(existing);

    return new Promise((resolve) => {
      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (!element) return;

        clearTimeout(timer);
        observer.disconnect();
        resolve(element);
      });

      const timer = setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);

      observer.observe(document.body, { childList: true, subtree: true });
    });
  };

  function convertToMac(shortcutLabel) {
    temp = shortcutLabel
    if(navigator.userAgent.includes("Mac")) {
      if(temp.includes("Shift") || temp.includes("Alt")) {
        temp=temp.replace("Alt", "Option")
        temp=temp.replace("Ctrl", "⌘")
      } else {
        temp=temp.replace("Ctrl+", "⌘")
      }
    }
    return temp
  }
  DebateTools.clickDocsMenuShortcut = async function clickDocsMenuShortcut(shortcutLabel) {
    shortcutLabel=convertToMac(shortcutLabel)
    const shortcutSelector = `span[aria-label="${shortcutLabel}"]`;
    let shortcutSpan = document.querySelector(shortcutSelector);

    if (!shortcutSpan) {
      DebateTools.clickDocButton("docs-edit-menu");
      shortcutSpan = await DebateTools.waitForElement(shortcutSelector);
    }

    const menuButton = shortcutSpan && shortcutSpan.parentElement && shortcutSpan.parentElement.parentElement;

    return DebateTools.clickElement(menuButton);
  };

  DebateTools.clickHeader = async function clickHeader(shortcutLabel) { 
    shortcutLabel=convertToMac(shortcutLabel)

    DebateTools.clickDocButton("headingStyleSelect");

    const headingMenuItemSelector = ".goog-menuitem.goog-option.goog-submenu.docs-submenuitem.apps-menuitem";
    const firstMenuItem = await DebateTools.waitForElement(headingMenuItemSelector);
    if (!firstMenuItem) return false;

    const menuItems = document.querySelectorAll(headingMenuItemSelector);

    for (const item of menuItems) {
      if(item.innerHTML.includes("Heading") || item.innerText.includes("Normal") && item.style.whiteSpace==="pre") {
        DebateTools.hoverElement(item);
        await DebateTools.sleep(10);
      }
    }

    const shortcutSpan = await DebateTools.waitForElement(
      `span[aria-label="${shortcutLabel}"]`
    );
    const menuButton = shortcutSpan && shortcutSpan.parentElement && shortcutSpan.parentElement.parentElement;

    return DebateTools.clickElement(menuButton);
  };
  DebateTools.formatHeaderStyles = async () => {
    const startCB2 = await navigator.clipboard.read();
    const h1 = `<span id=""><h1 style="text-align: center;border-left:solid #000000 3pt;border-right:solid #000000 3pt;border-top:solid #000000 3pt;border-bottom:solid #000000 3pt;margin-top:20pt;margin-bottom:6pt;padding:2pt 2pt 2pt 2pt;"><span style="font-size: ${DebateTools.getSetting("h1Size")}pt; font-family: ${DebateTools.getSetting("formatFont")}; color: rgb(0, 0, 0); background-color: transparent; font-variant: normal; vertical-align: baseline; white-space: pre-wrap;">Done, you can delete this doc tab now</span></h1><div><span style="font-size: 11pt; font-family: Calibri, sans-serif; color: rgb(0, 0, 0); background-color: transparent; font-variant: normal; vertical-align: baseline; white-space: pre-wrap;"><br></span></div></span>`
    const h2 = `<span id=""><span style="text-align: center; font-size: ${DebateTools.getSetting("h2Size")}pt; font-family: ${DebateTools.getSetting("formatFont")}, serif; color: rgb(0, 0, 0); background-color: transparent; font-weight: 700; font-variant: normal; text-decoration: underline; text-decoration-skip-ink: none; vertical-align: baseline; white-space: pre-wrap;">Heading 2 (hat)</span></span><br>`
    const h3 = `<span id=""><span style="text-align: center; font-size: ${DebateTools.getSetting("h3Size")}pt; font-family: ${DebateTools.getSetting("formatFont")}, serif; color: rgb(0, 0, 0); background-color: transparent; font-weight: 700; font-variant: normal; text-decoration: underline; text-decoration-skip-ink: none; vertical-align: baseline; white-space: pre-wrap;">Heading 3 (block)</span></span><br>`
    const h4 = `<span id=""><span style="font-size: ${DebateTools.getSetting("h4Size")}pt; font-family: ${DebateTools.getSetting("formatFont")}, serif; color: rgb(0, 0, 0); background-color: transparent; font-weight: 700; font-variant: normal; vertical-align: baseline; white-space: pre-wrap;">Heading 4 (tag)</span></span><br>`
    //const nt = `<span id=""><span style="font-size: ${DebateTools.getSetting("ntextSize")}pt; font-family: ${DebateTools.getSetting("formatFont")}, serif; color: rgb(0, 0, 0); background-color: transparent; font-variant: normal; vertical-align: baseline; white-space: pre-wrap;"></span></span><br>`
    const styles=[h1,h2,h3,h4/*,nt*/]
    await DebateTools.clickDocsMenuShortcut("Shift+F11")

    for (let i=styles.length-1;i>=0;i--) {
      let style=styles[i];
      // if(i==4) {
      //   await DebateTools.pasteHTML(style)
      //   await DebateTools.clickDocsMenuShortcut("Ctrl+A")
      //   await DebateTools.clickHeader("Update 'Normal text' to match u")
      //   await DebateTools.clickDocsMenuShortcut("Ctrl+A")
      //   continue;
      // }
      if(i<3) await DebateTools.clickDocButton('alignCenterButton')
      await DebateTools.pasteHTML(style)
      await DebateTools.clickDocsMenuShortcut("Ctrl+A")
      await DebateTools.clickHeader(`Update 'Heading ${i+1}' to match u`)
      await DebateTools.clickDocsMenuShortcut("Ctrl+A")
    }
    await DebateTools.clickHeader(`Save as my default styles s`)
    await DebateTools.clickDocButton("headingStyleSelect")
    await DebateTools.clickDocButton("headingStyleSelect")
    await navigator.clipboard.write(startCB2);
  }

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

  //deprecated
  DebateTools.sendShortcut = async function sendShortcut(action, useShift = false, useAlt = false) {
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action, useShift, useAlt }, resolve);
    });
  };
  
  DebateTools.getSelection = async function getSelection() {
    await DebateTools.clickDocsMenuShortcut("Ctrl+C")
    const CB = await DebateTools.checkClipboard();
    return CB;
  };
  DebateTools.pasteHTML = async function pasteHTML(html) {
    const startCB2 = await navigator.clipboard.read()
    if (html) {
      const blob = new Blob([html], { type: "text/html" });
      await navigator.clipboard.write([new ClipboardItem({ "text/html": blob })]);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    await DebateTools.clickDocsMenuShortcut("Ctrl+V");
    await navigator.clipboard.write(startCB2);
  }



  DebateTools.modifySelection = async function modifySelection(callback) {
    const startCB = await DebateTools.checkClipboard();
    const startCB2 = await navigator.clipboard.read();

    await DebateTools.clickDocsMenuShortcut("Ctrl+C")

    let newCB = await DebateTools.checkClipboard();
    if (startCB === newCB) {
      return;
    }

    newCB = newCB.replace(/\bid=(["']).*?\1/g, 'id=""');

    const container = document.createElement("span");
    container.innerHTML = newCB;

    const modifiedHtml = await callback(container);
    const blob = new Blob([modifiedHtml ?? container.innerHTML], { type: "text/html" });
    await navigator.clipboard.write([new ClipboardItem({ "text/html": blob })]);

    await DebateTools.clickDocsMenuShortcut("Ctrl+V")
    
    await new Promise((resolve) => setTimeout(resolve, 100));

    await navigator.clipboard.write(startCB2);
  };
  DebateTools.shrink = function shrink() {
    return DebateTools.modifySelection(async (container) => {
      const spans = container.querySelectorAll("*");
      spans.forEach((span) => {
        const size = span.style.fontSize;
        const underline = span.style.textDecoration;
        const bg = span.style.backgroundColor;
        span.style.lineHeight=1.1;
        if (!(underline && underline.includes("underline") || bg && bg!=="transparent")) {
          let newSize = parseFloat(size) - 1;
          if(newSize<=5) newSize=11
          span.style.fontSize = newSize + "pt";
        }
      });
      return container.innerHTML;
    });
  };
  DebateTools.condense = function condense() {
    return DebateTools.modifySelection(async (container) => {
      const blocks = container.querySelectorAll("p, div, br");

      if(DebateTools.getSetting("usePilcrows")) blocks.forEach((el) => {
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
  DebateTools.emphasis = async () => {
    const ubtn=document.getElementById("underlineButton")
    const bbtn=document.getElementById("boldButton")
    if(ubtn.ariaPressed == "true" && bbtn.ariaPressed == "true") {
      DebateTools.clickElement(ubtn);
      DebateTools.clickElement(bbtn);
      return;
    }
    if(ubtn.ariaPressed != "true") {
      DebateTools.clickElement(ubtn);
    }
    if(bbtn.ariaPressed != "true") {
      DebateTools.clickElement(bbtn);
    }
  }

 
  DebateTools.highlight = async () => {
    const bgBtn = document.getElementById("bgColorButton")
    DebateTools.clickElement(bgBtn)
    DebateTools.clickElement(bgBtn)
    if(bgBtn.querySelector(".goog-color-menu-button-indicator").outerHTML.includes("border-bottom-color")) {
      DebateTools.clickElement(document.querySelector(".colormenuitems-no-color"));
    } else {
      await DebateTools.clickDocButton(highlightLookup[DebateTools.getSetting("highlightColor")]);
    }
  }
  function getTrimmedReadModeParagraph(pg) {
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
    if(isCite && contingentKC==="") contingentKC+=pg.innerHTML

    return isCard || isCite ? contingentKC : pg.outerHTML;
  }

  DebateTools.readMode = async function readMode() {
    const startCB = await DebateTools.checkClipboard();
    const startCB2 = await navigator.clipboard.read();

    await DebateTools.clickDocsMenuShortcut("Ctrl+A")
    await DebateTools.clickDocsMenuShortcut("Ctrl+C")

    const newCB = await DebateTools.checkClipboard();
    if (startCB == newCB) {
      return;
    }

    const container = document.createElement("div");
    container.innerHTML = newCB;

    await navigator.clipboard.write(startCB2);

    if(!DebateTools.getSetting("cutTextReadMode")) return container.innerHTML

    const pgs = container.querySelector("b");
    return [...pgs.children].map(getTrimmedReadModeParagraph).join("");
  };
  DebateTools.ensureDocshiftLoaded = async function ensureDocshiftLoaded() {
    if (global.docshift) return global.docshift;

    const response = await chrome.runtime.sendMessage({ action: "loadDocshift" });
    if (!response || !response.success || !global.docshift) {
      throw new Error("Could not load docshift.");
    }

    return global.docshift;
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
    await DebateTools.clickDocsMenuShortcut("Ctrl+C")
    let newCB = await DebateTools.checkClipboard();
    newCB = newCB.replace(/\bid=(["']).*?\1/g, 'id=""');
    const container = document.createElement("div");
    container.innerHTML = newCB;
    const pgs = container.querySelector("b");
    let final="";
    let cardText = "";
    if(!pgs) {alert("Please select content to wikify!"); return;}
    for (const pg of pgs.children) {
      
      let innerText = pg.innerText;
      let isCard = false;
      const isCite = innerText.includes("http") || innerText.includes("www");
      const isHeader = pg.tagName === "H4" || pg.tagName === "H3" || pg.tagName === "H2" || pg.tagName === "H1"
      //set is card and append card text
      pg.querySelectorAll("*").forEach((span) => {
        const bg = span.style.backgroundColor;
        const size = span.style.fontSize;
        if((bg && bg !== "transparent" || size && parseFloat(size) <= 8) && !isCite && !isHeader) isCard=true;
      });
      if(isCard) {
        cardText += innerText + " ";
      }
      // if not card, but last paragraph was card
      if(!isCard && cardText!="") {
        let pgTexts = cardText.trim().split(/\s+/)
        if(pgTexts.length<50) {
          final+=cardText + "\n";
        }
        else final+=`${pgTexts.slice(0,25).join(" ")} \n \n AND \n \n ${pgTexts.slice(-25).join(" ")}\n`;
        cardText = "";
      }
      if (isHeader) {
        const headingLevel = parseInt(pg.tagName.slice(1), 10);
        final += "\n" + "#".repeat(headingLevel) + innerText + "\n";
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
    await DebateTools.clickDocsMenuShortcut("Ctrl+A")
    return DebateTools.modifySelection(async (container) => {
      container.querySelectorAll("*").forEach((span) => {
        const bg = span.style.backgroundColor;
        span.style.lineHeight/=1.2;
        if (bg && bg !== "transparent") {
          span.style.backgroundColor = DebateTools.getSetting("highlightColor");
        }
      });
      return container.innerHTML.innerHTML;
    });
  }

  DebateTools.openCaselist = async () => {
    const parts=DebateTools.getSetting("userName").trim().split(" ")
    const caseListUrl = `https://opencaselist.com/${DebateTools.getSetting("userFormat") + "25"}/${DebateTools.getSetting("userSchool")}/${parts[0].slice(0, 2)+parts[parts.length - 1].slice(0, 2)}/add`;
    await chrome.runtime.sendMessage({ action: "openCleanCaseList", url: caseListUrl });
  }

  DebateTools.selectSpeechDoc = async () => {
    const response = await chrome.runtime.sendMessage({ action: "getGoogleDocTabs" });
    if (!response || !response.success || !response.tabs || response.tabs.length === 0) {
      alert("No open Google Doc tabs found.");
      return;
    }

    const currentUrl = window.location.href;
    const tabs = response.tabs.filter((tab) => tab.url !== currentUrl);
    if (tabs.length === 0) {
      alert("Open another Google Doc tab first, then select it as a speech doc.");
      return;
    }

    const promptText = tabs.map((tab, index) => {
      const activeMarker = tab.id === response.activeSpeechDocID ? " *" : "";
      return `${index + 1}. ${tab.title}${activeMarker}`;
    }).join("\n");

    const choice = prompt(`Select a speech doc:\n\n${promptText}`);
    if (!choice) return;

    const selectedTab = tabs[parseInt(choice, 10) - 1];
    if (!selectedTab) {
      alert("That was not a valid speech doc selection.");
      return;
    }

    const selectResponse = await chrome.runtime.sendMessage({
      action: "registerSpeechDoc",
      tabId: selectedTab.id
    });

    if (!selectResponse || !selectResponse.success) {
      alert(selectResponse && selectResponse.message || "Could not select that speech doc.");
      return;
    }

    alert(`Selected speech doc: ${selectedTab.title}`);
  }

  global.DebateTools = DebateTools;
})(window);
