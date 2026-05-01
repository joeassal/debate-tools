(function (global) {
  const DebateTools = global.DebateTools || {};

  DebateTools.attachFolderTree = function attachFolderTree() {
    const host = document.getElementById("folder-tree-host");
    if (!host) return;

    host.innerHTML = /* html */ `
      <div class="vTub">
        <div id="tree"></div>
        <div class="exportbtns">
          <button id="export-tree-btn" class="treeBtn" title="Export Folder Tree">Export Tub</button>
          <button id="import-tree-btn" class="treeBtn" title="Import Folder Tree">Import Tub</button>
        </div>
      </div>
      <style>
        details {
          margin-left: 10px;
        }
        .vTub {
          position: relative;
          padding: 10px;
          border: 1px solid #a6bed1;
          margin-top: auto;
          height: 23vh;
          min-height: 180px;
          max-height: 420px;
          overflow: hidden;
        }
        #tree {
          height: 100%;
          padding-bottom: 28px;
          box-sizing: border-box;
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
          background-color: #5067ca;
        }
        .exportbtns {
          position: absolute;
          right: 8px;
          bottom: 8px;
          display: flex;
          gap: 2px;
          z-index: 1;
          font-size: 4px;
        }
      </style>
    `;

    const root = host.querySelector("#tree");
    const folderStorageKey = "debateTools.folderTree";

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
        const json = JSON.stringify(getFolderTree(), null, 2);
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
        const tree = typeof treeJson === "string" ? JSON.parse(treeJson) : treeJson;

        if (!Array.isArray(tree)) {
            throw new Error("Imported folder tree must be an array.");
        }

        root.replaceChildren();
        tree.forEach((node) => root.appendChild(createTreeNode(node)));
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
        fileLabel.addEventListener("mousedown", (e) => {
          e.preventDefault();
        });
        fileLabel.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          DebateTools.focusDocsEditor();
          await new Promise((resolve) => setTimeout(resolve, 100));
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

    DebateTools.exportFolderTree = exportFolderTree;
    DebateTools.importFolderTree = importFolderTree;

    document.getElementById("export-tree-btn").addEventListener("click", exportFolderTree);
    document.getElementById("import-tree-btn").addEventListener("click", importFolderTreeFromFile);

    if (!loadFolderTree()) {
      addFolder("Orgin");
    }
  };

  global.DebateTools = DebateTools;
})(window);
