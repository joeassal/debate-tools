(function (global) {
  const DebateTools = global.DebateTools || {};

  function focusDocsEditor() {
    const editorIframe = document.querySelector(".docs-texteventtarget-iframe");

    if (editorIframe) {
      editorIframe.contentWindow.focus();
      editorIframe.focus();
    }
  }

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
        focusDocsEditor();
        await new Promise((resolve) => setTimeout(resolve, 50));

        const actionName = btn.getAttribute("data-action");

        if (actionName === "Readmode") {
          await openReadModeWindow();
        } else {
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
      font-family: times new roman, serif;
      box-shadow: -2px 0 10px rgba(0,0,0,0.1);
    `;

    sidebar.innerHTML = /* html */ `
      <div style="padding: 15px; background: #e28000; color: white; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
        <span>Debate Tools</span>
        <button id="close-sidebar" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px;">x</button>
      </div>
      <div style="padding: 10px; display: flex; flex-direction: column; gap: 8px; flex: 1; min-height: 0;">

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
        <button class="side-btn" data-action="Importdocx">Open DocX</button>
        <button class="side-btn" data-action="Exportdocx">Export DocX</button>
        <button class="side-btn" data-action="Readmode">Read Mode</button>
        <hr style="width: 100%; border: 0; border-top: 1px solid #eee;">
        <div class="vTub">
          <div id="tree"></div>
        </div>
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
        details {
          margin-left: 10px;
        }
        .vTub {
          padding: 10px;
          border: 1px solid #8b8b8b;
          margin-top: auto;
          height: 30vh;
          min-height: 180px;
          max-height: 420px;
          overflow: hidden;
        }
        #tree {
          height: calc(100%);
          overflow-y: auto;
        }
        .treeBtn {
          border: 1px solid #dadce0;
          background: none;
          cursor: pointer;
          font-size: 10px;
          margin-left: 4px;
        }
        .treeBtn:hover {
          background-color: #e28000;
        }
      </style>
    `;
    document.body.appendChild(sidebar);

    //start folder system
    const root = document.getElementById("tree");
    const folderStorageKey = "debateTools.folderTree";

    function saveFolderTree() {
        const tree = [...root.children]
            .filter((child) => child.tagName === "DETAILS")
            .map(serializeFolder);

        localStorage.setItem(folderStorageKey, JSON.stringify(tree));
    }

    function serializeFolder(folder) {
        const children = [...folder.children]
            .filter((child) => child.tagName !== "SUMMARY")
            .map((child) => {
                if (child.tagName === "DETAILS") return serializeFolder(child);

                return {
                    type: "file",
                    name: child.dataset.name || child.textContent,
                    block: child.dataset.block
                };
            });

        return {
            type: "folder",
            name: folder.dataset.name,
            open: folder.open,
            children,
        };
    }

    function loadFolderTree() {
        const savedTree = localStorage.getItem(folderStorageKey);
        if (!savedTree) return false;

        try {
            const tree = JSON.parse(savedTree);
            root.replaceChildren();
            tree.forEach((node) => root.appendChild(createTreeNode(node)));
            return true;
        } catch (error) {
            console.warn("Could not load saved folder tree", error);
            return false;
        }
    }

    function createTreeNode(node) {
        if (node.type === "folder") {
            const folder = createFolder(node.name);
            folder.open = node.open !== false;
            (node.children || []).forEach((child) => {
                folder.appendChild(createTreeNode(child));
            });
            return folder;
        }

        return createFile(node.name, node.block);
    }

    function createFolder(name) {
        const folder = document.createElement("details");
        folder.dataset.name = name;
        folder.open = true;

        const summary = document.createElement("summary");
        const folderLabel = document.createElement("span");
        folderLabel.textContent = name + " ";

        const addBtn = document.createElement("button");
        addBtn.textContent = "+";
        addBtn.type = "button";
        addBtn.className = "treeBtn";
        addBtn.title = "Add Subfolder"
        const insertBtn = document.createElement("button");
        insertBtn.textContent = "↵";
        insertBtn.type = "button";
        insertBtn.className = "treeBtn";
        insertBtn.title = "Insert Selected Card as file"
        let deleteBtn = null;
        if (name !== "Orgin") {
          deleteBtn = document.createElement("button");
          deleteBtn.textContent = "x";
          deleteBtn.type = "button";
          deleteBtn.title = "Delete Folder";
          deleteBtn.className = "treeBtn";
        }
        addBtn.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();

            const folderName = prompt("Folder name:");
            if (!folderName) return;

            addFolder(getFolderPath(folder) + "/" + folderName);
        };

        insertBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            focusDocsEditor();
            await new Promise((resolve) => setTimeout(resolve, 50));
            const blockData = await DebateTools.getSelection();
            console.log("Got block data for insertion:", blockData);
            const fileName = prompt("Card/Block name:");
            if (!fileName) return;
            addFile(getFolderPath(folder) + "/" + fileName, blockData);
        });

        if (deleteBtn) {
            deleteBtn.addEventListener("click", (e) => {
                if(confirm("Are you sure you want to delete this folder and all its contents?")) {
                  e.preventDefault();
                  e.stopPropagation();
                  folder.remove();
                  saveFolderTree();
                }
            });
        }

        summary.appendChild(folderLabel);
        summary.appendChild(addBtn);
        summary.appendChild(insertBtn);
        if (deleteBtn) summary.appendChild(deleteBtn);
        folder.appendChild(summary);

        return folder;
    }

    function createFile(name, blockData) {
        const file = document.createElement("div");
        file.dataset.type = "file";
        file.dataset.name = name;
        file.dataset.block = blockData;
        file.style.marginLeft = "20px";

        const fileLabel = document.createElement("button");
        fileLabel.textContent = name + " ";
        fileLabel.type = "button";
        fileLabel.style.cssText = `border:none; cursor:pointer; font-size: 10px;`;
        fileLabel.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          focusDocsEditor();
          await new Promise((resolve) => setTimeout(resolve, 50));
          console.log("Inserting block data for file:", file.dataset.block);
          await DebateTools.pasteHTML(file.dataset.block);
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "x";
        deleteBtn.type = "button";
        deleteBtn.className = "treeBtn";
        deleteBtn.title = "Delete File";

        deleteBtn.addEventListener("click", (e) => {
            if(confirm("Are you sure you want to delete this folder and all its contents?")) {
                e.preventDefault();
                e.stopPropagation();
                file.remove();
                saveFolderTree();
            }
        });

        file.appendChild(fileLabel);
        file.appendChild(deleteBtn);
        return file;
    }

    function getFolderPath(folder) {
        const parts = [];

        while (folder && folder !== root) {
            parts.unshift(folder.dataset.name);
            folder = folder.parentElement.closest("details");
        }

        return parts.join("/");
    }

    function getOrCreateFolder(parts) {
        let current = root;

        for (const part of parts) {
            let folder = [...current.children].find(el =>
                el.tagName === "DETAILS" &&
                el.dataset.name === part
            );

            if (!folder) {
                folder = createFolder(part);
                current.appendChild(folder);
            }

            current = folder;
        }

        return current;
    }
    function addFolder(path) {
      const parts = path.split("/").filter(Boolean);
      getOrCreateFolder(parts);
      saveFolderTree();
    }
    function addFile(path, blockData) {
      const parts = path.split("/").filter(Boolean);
      const fileName = parts.pop();

      const folder = getOrCreateFolder(parts);

      folder.appendChild(createFile(fileName, blockData));
      saveFolderTree();
    }
    if (!loadFolderTree()) {
      addFolder("Orgin");
    }
    // end folder system
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
      DebateTools.injectSidebar();
    });

    document.body.appendChild(toggleBtn);
  };

  global.DebateTools = DebateTools;
})(window);
