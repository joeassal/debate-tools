(function (global) {
  const DebateTools = global.DebateTools || {};

  DebateTools.attachFolderTree = function attachFolderTree() {
    const host = document.getElementById("folder-tree-host");
    if (!host) return;

    host.innerHTML = /* html */ `
      <div class="vTub">
        <div id="tree"></div>
        <div class="exportbtns">
          <input id="searchBar" placeholder='Search...'>
          <button id="export-tree-btn" class="treeBtn" title="Export Folder Tree">Export</button>
          <button id="import-tree-btn" class="treeBtn" title="Import Folder Tree">Import</button>
        </div>
      </div>
      <style>
        .vTub details {
          margin-left: 10px;
        }
        .vTub {
          position: relative;
          padding-top: 6px;
          border: 1px solid #cfd6e4;
          border-radius: 6px;
          background: #ffffff;
          margin-top: auto;
          height: 23vh;
          min-height: 180px;
          max-height: 420px;
          overflow: hidden;
        }
        #tree {
          height: 100%;
          padding-bottom: 28px;
          padding-left: 6px;
          padding-right: 6px;
          box-sizing: border-box;
          overflow-y: auto;
          overflow-x: hidden;
          color: #172033;
          font-size: 11px;
        }
        .treeBtn {
          min-height: 20px;
          border: 1px solid #cfd6e4;
          border-radius: 4px;
          background: #f8fafc;
          color: #172033;
          cursor: pointer;
          font-size: 10px;
          padding: 1px 5px;
        }
        .treeBtn:hover {
          background-color: #eef2ff;
          border-color: #95a3d6;
        }
        .treeBtn:focus-visible,
        #searchBar:focus {
          outline: none;
          border-color: #2d3c80;
          box-shadow: 0 0 0 2px rgba(45, 60, 128, 0.16);
        }
        .tree-drag-handle {
          border: 1px solid transparent;
          background: none;
          color: #6b7280;
          cursor: grab;
          font-size: 10px;
          margin-right: 3px;
          padding: 0 3px;
        }
        .tree-drag-handle:hover {
          border-color: #dadce0;
          background: #f8f9fa;
          color: #202124;
        }
        .tree-drag-handle:active {
          cursor: grabbing;
        }
        .tree-dragging {
          opacity: 0.45;
        }
        .tree-drop-target {
          outline: 1px dashed #5067ca;
          outline-offset: 2px;
        }
        .exportbtns {
          position: absolute;
          left: 8px;
          right: 8px;
          bottom: 8px;
          display: flex;
          gap: 4px;
          align-items: center;
          z-index: 1;
          width: auto;
        }
        #searchBar {
          box-sizing: border-box;
          flex: 1 1 auto;
          min-width: 0;
          min-height: 22px;
          border: 1px solid #cfd6e4;
          border-radius: 4px;
          font-size: 10px;
          padding: 2px 6px;
          color: #172033;
        }
        .tree-file,
        .vTub summary {
          min-height: 22px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .tree-file-label {
          max-width: 132px;
          overflow: hidden;
          text-overflow: ellipsis;
          border: none;
          background: transparent;
          color: #172033;
          cursor: pointer;
          font-size: 10px;
          text-align: left;
        }
      </style>
    `;

    const root = host.querySelector("#tree");
    const folderStorageKey = "debateTools.folderTree";
    const cardStorageKey = "debateTools.folderCards";
    let draggedNode = null;

    function getCards() {
        return JSON.parse(localStorage.getItem(cardStorageKey) || "{}");
    }

    function saveCards(cards) {
        localStorage.setItem(cardStorageKey, JSON.stringify(cards));
    }

    function createBlockId() {
        if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
        return "block-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    }

    function saveCard(blockData) {
        const blockId = createBlockId();
        const cards = getCards();
        cards[blockId] = blockData;
        saveCards(cards);
        return blockId;
    }

    function getCard(blockId) {
        return getCards()[blockId] || "";
    }

    function deleteCard(blockId) {
        const cards = getCards();
        delete cards[blockId];
        saveCards(cards);
    }

    function updateCard(blockId, blockData) {
        const cards = getCards();
        cards[blockId] = blockData;
        saveCards(cards);
    }

    function deleteCardsInFolder(folder) {
        folder.querySelectorAll('[data-type="file"]').forEach((file) => {
            deleteCard(file.dataset.blockId);
        });
    }

    function isTreeNode(node) {
        return node && (node.tagName === "DETAILS" || node.dataset.type === "file");
    }

    function getClosestTreeNode(target) {
        const node = target.closest("details, [data-type='file']");
        return node && root.contains(node) ? node : null;
    }

    function canDropInto(parent) {
        return draggedNode &&
            parent &&
            parent !== root &&
            parent !== draggedNode &&
            !(draggedNode.tagName === "DETAILS" && draggedNode.contains(parent));
    }

    function clearDropTarget() {
        root.querySelectorAll(".tree-drop-target").forEach((node) => {
            node.classList.remove("tree-drop-target");
        });
    }

    function moveDraggedNode(target, event) {
        if (!draggedNode) return false;

        if (!target || target === root) return false;

        const targetSummary = event.target.closest("summary");
        if (target.tagName === "DETAILS" && targetSummary && targetSummary.parentElement === target) {
            if (!canDropInto(target)) return false;
            target.open = true;
            target.appendChild(draggedNode);
            return true;
        }

        const parent = target.parentElement;
        if (!canDropInto(parent)) return false;

        const rect = target.getBoundingClientRect();
        const insertAfter = event.clientY > rect.top + rect.height / 2;
        parent.insertBefore(draggedNode, insertAfter ? target.nextSibling : target);
        return true;
    }

    function createDragHandle() {
        const handle = document.createElement("button");
        handle.textContent = "↕";
        handle.type = "button";
        handle.className = "tree-drag-handle";
        handle.title = "Drag to move";
        return handle;
    }

    function makeDraggable(node, handle) {
        handle.draggable = true;

        handle.addEventListener("mousedown", (event) => {
            event.stopPropagation();
        });

        handle.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
        });

        handle.addEventListener("dragstart", (event) => {
            event.stopPropagation();

            draggedNode = node;
            node.classList.add("tree-dragging");
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", node.dataset.name || "");
        });

        handle.addEventListener("dragend", (event) => {
            event.stopPropagation();
            node.classList.remove("tree-dragging");
            draggedNode = null;
            clearDropTarget();
        });
    }

    root.addEventListener("dragover", (event) => {
        if (!draggedNode) return;

        const target = getClosestTreeNode(event.target);
        if (!target || target === draggedNode) {
            event.preventDefault();
            clearDropTarget();
            return;
        }

        if (target.tagName === "DETAILS" && draggedNode.tagName === "DETAILS" && draggedNode.contains(target)) return;

        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        clearDropTarget();
        if (isTreeNode(target)) target.classList.add("tree-drop-target");
    });

    root.addEventListener("dragleave", (event) => {
        if (!root.contains(event.relatedTarget)) clearDropTarget();
    });

    root.addEventListener("drop", (event) => {
        if (!draggedNode) return;

        event.preventDefault();
        const target = getClosestTreeNode(event.target);
        if (moveDraggedNode(target, event)) saveFolderTree();
        clearDropTarget();
    });

    function getSearchText(file) {
        const cardHtml = getCard(file.dataset.blockId);
        const cardContainer = document.createElement("div");
        cardContainer.innerHTML = cardHtml;

        return [
            file.dataset.name || "",
            cardContainer.innerText || cardContainer.textContent || "",
        ].join(" ").toLowerCase();
    }

    function resetSearch() {
        root.querySelectorAll("details, [data-type='file']").forEach((node) => {
            node.style.display = "";
        });
    }

    function applySearch(query) {
        const normalizedQuery = query.trim().toLowerCase();
        resetSearch();

        if (!normalizedQuery) return;

        root.querySelectorAll("details").forEach((folder) => {
            folder.style.display = "none";
        });

        root.querySelectorAll("[data-type='file']").forEach((file) => {
            const isMatch = getSearchText(file).includes(normalizedQuery);
            file.style.display = isMatch ? "" : "none";

            if (!isMatch) return;

            let folder = file.parentElement.closest("details");
            while (folder) {
                folder.style.display = "";
                folder.open = true;
                folder = folder.parentElement.closest("details");
            }
        });
    }

    function getFolderTree() {
        return [...root.children]
            .filter((child) => child.tagName === "DETAILS")
            .map(serializeFolder);
    }

    function saveFolderTree() {
        const tree = getFolderTree();
        localStorage.setItem(folderStorageKey, JSON.stringify(tree));
    }

    function exportFolderTree() {
        const json = JSON.stringify({
            tree: getFolderTree(),
            cards: getCards()
        }, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "debate-tools-folder-tree.json";
        link.click();
        URL.revokeObjectURL(url);

        return json;
    }

    function importFolderTree(treeJson) {
        const tub = typeof treeJson === "string" ? JSON.parse(treeJson) : treeJson;
        const tree = tub.tree;

        if (!Array.isArray(tree)) {
            throw new Error("Imported folder tree must be an array.");
        }

        root.replaceChildren();
        tree.forEach((node) => root.appendChild(createTreeNode(node)));
        saveCards(tub.cards || {});
        saveFolderTree();
    }

    async function importFolderTreeFromFile() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json,application/json";

        input.addEventListener("change", async () => {
            const file = input.files && input.files[0];
            if (!file) return;

            try {
                await importFolderTree(await file.text());
            } catch (error) {
                console.error("Could not import folder tree", error);
                alert("Could not import folder tree. Make sure it is a valid exported JSON file.");
            }
        });

        input.click();
    }

    function serializeFolder(folder) {
        const children = [...folder.children]
            .filter((child) => child.tagName !== "SUMMARY")
            .map((child) => {
                if (child.tagName === "DETAILS") return serializeFolder(child);

                return {
                    type: "file",
                    name: child.dataset.name || child.textContent,
                    blockId: child.dataset.blockId
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

        return createFile(node.name, node.blockId);
    }

    function createFolder(name) {
        const folder = document.createElement("details");
        folder.dataset.name = name;
        folder.open = true;

        const summary = document.createElement("summary");
        const dragHandle = createDragHandle();
        if (name !== "Orgin") makeDraggable(folder, dragHandle);
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
            DebateTools.focusDocsEditor();
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
                  deleteCardsInFolder(folder);
                  folder.remove();
                  saveFolderTree();
                }
            });
        }

        if (name !== "Orgin") summary.appendChild(dragHandle);
        summary.appendChild(folderLabel);
        summary.appendChild(addBtn);
        summary.appendChild(insertBtn);
        if (deleteBtn) summary.appendChild(deleteBtn);
        folder.appendChild(summary);

        return folder;
    }

    function createFile(name, blockId) {
        const file = document.createElement("div");
        file.dataset.type = "file";
        file.dataset.name = name;
        file.dataset.blockId = blockId;
        file.className = "tree-file";
        file.style.marginLeft = "20px";
        const dragHandle = createDragHandle();
        makeDraggable(file, dragHandle);

        const fileLabel = document.createElement("button");
        fileLabel.textContent = name + " ";
        fileLabel.type = "button";
        fileLabel.className = "tree-file-label";
        fileLabel.addEventListener("mousedown", (e) => {
          e.preventDefault();
        });
        fileLabel.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          DebateTools.focusDocsEditor();
          await new Promise((resolve) => setTimeout(resolve, 100));
          await DebateTools.pasteHTML(getCard(file.dataset.blockId));
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "x";
        deleteBtn.type = "button";
        deleteBtn.className = "treeBtn";
        deleteBtn.title = "Delete File";
        const changeBtn = document.createElement("button");
        changeBtn.textContent = "↻";
        changeBtn.type = "button";
        changeBtn.className = "treeBtn";
        changeBtn.title = "Replace File With Selection";

        changeBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            DebateTools.focusDocsEditor();
            if(DebateTools.getSetting("confirmOnRewrite") && !confirm("Doing this will overrwrite the file's current data")) return
            await new Promise((resolve) => setTimeout(resolve, 50));
            const blockData = await DebateTools.getSelection();
            if (!blockData) return;
            updateCard(file.dataset.blockId, blockData);
        });

        deleteBtn.addEventListener("click", (e) => {
            if(confirm("Are you sure you want to delete this folder and all its contents?")) {
                e.preventDefault();
                e.stopPropagation();
                deleteCard(file.dataset.blockId);
                file.remove();
                saveFolderTree();
            }
        });

        file.appendChild(dragHandle);
        file.appendChild(fileLabel);
        file.appendChild(changeBtn);
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
      const blockId = saveCard(blockData);

      const folder = getOrCreateFolder(parts);

      folder.appendChild(createFile(fileName, blockId));
      saveFolderTree();
    }

    DebateTools.exportFolderTree = exportFolderTree;
    DebateTools.importFolderTree = importFolderTree;

    document.getElementById("searchBar").addEventListener("input", (e) => applySearch(e.target.value));
    document.getElementById("export-tree-btn").addEventListener("click", exportFolderTree);
    document.getElementById("import-tree-btn").addEventListener("click", importFolderTreeFromFile);

    if (!loadFolderTree()) {
      addFolder("Orgin");
    }
  };

  global.DebateTools = DebateTools;
})(window);
