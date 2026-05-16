const storageKey = "debateTools.flowSheet";
const speechOrderKey = "debateTools.speechOrder";
const defaultColumns = ["1AC", "1NC", "2AC", "2NC", "1AR", "1NR", "2AR", "2NR"];
let newFlowColumns = loadSpeechOrder();
const minRows = 18;
const sheet = document.getElementById("sheet");
const tabs = document.getElementById("tabs");
const speechOrderInput = document.getElementById("speechOrder");
const addRowButton = document.getElementById("add-row");
const addTabButton = document.getElementById("add-tab");
const deleteTabButton = document.getElementById("delete-tab");
const clearFlowsButton = document.getElementById("clear-flows");
const exportFlowButton = document.getElementById("export-flow");
const importFlowButton = document.getElementById("import-flow");
const importFlowFileInput = document.getElementById("import-flow-file");

let workbook = loadFlow();
let activeCell = { row: 0, col: 0, selectionStart: 0, selectionEnd: 0 };
let saveFlowTimer = null;

speechOrderInput.value = newFlowColumns.join(",");
saveFlowNow();

//handle runtime listeners
const flowPort = chrome.runtime.connect({ name: "flow-panel" });
flowPort.onMessage.addListener((message) => {
  if (message.action === "selectToFlow") {
    insertTextIntoActiveCell(message.text);
  } else if (message.action === "extrapolate") {
    addTabFromColumnName(message.name, message.cells, message.speech)
  }
});
function addTabFromColumnName(name, cells, columnName, columns = newFlowColumns) {
  const normalizedColumnName = String(columnName || "").trim().toUpperCase();
  const tabColumns = normalizeColumns(columns);
  let columnIndex = tabColumns.indexOf(normalizedColumnName);

  if (columnIndex === -1) {
    columnIndex = 0;
    alert(`Could not find "${columnName}" in the flow columns. Flowing into ${tabColumns[columnIndex]} instead.`);
  }

  addTabFromColumnCells(name, cells, columnIndex, tabColumns);
}
function addTabFromColumnCells(name, cells, columnIndex, columns = newFlowColumns) {
  const tabColumns = normalizeColumns(columns);
  const columnCells = Array.isArray(cells) ? cells : String(cells || "").split(/\r?\n/);

  const rows = columnCells.map((cellText) => {
    const row = Array(tabColumns.length).fill("");
    row[columnIndex] = cellText;
    return row;
  });

  workbook.tabs.push({
    name,
    columns: tabColumns,
    rows: normalizeRows(rows, tabColumns),
  });

  workbook.activeTabIndex = workbook.tabs.length - 1;
  render();
  saveFlowNow();
  focusCell(0, columnIndex);
}

function cloneTab(tab) {
  const columns = normalizeColumns(tab.columns || newFlowColumns);

  return {
    name: String(tab.name || "Imported Flow").trim() || "Imported Flow",
    columns,
    rows: normalizeRows(tab.rows, columns),
  };
}

function parseSpeechOrder(value) {
  const parsedColumns = String(value || "")
    .split(",")
    .map((column) => column.trim())
    .map((column) => column.toUpperCase())
    .filter(Boolean);

  return parsedColumns.length ? parsedColumns : defaultColumns;
}

function normalizeColumns(columns) {
  return parseSpeechOrder(Array.isArray(columns) ? columns.join(",") : columns);
}

function loadSpeechOrder() {
  return parseSpeechOrder(localStorage.getItem(speechOrderKey));
}

function updateSheetColumns(columns) {
  sheet.style.gridTemplateColumns = `24px repeat(${columns.length}, minmax(110px, 1fr))`;
}

function createBlankRows(columns) {
  return Array.from({ length: minRows }, () => Array(columns.length).fill(""));
}

function createTab(name) {
  const columns = newFlowColumns.slice();

  return {
    name,
    columns,
    rows: createBlankRows(columns),
  };
}

function normalizeRows(rows, columns) {
  const normalizedRows = Array.isArray(rows) ? rows : [];

  return normalizedRows.map((row) => {
    const normalizedRow = Array.isArray(row) ? row.slice(0, columns.length) : [];

    while (normalizedRow.length < columns.length) {
      normalizedRow.push("");
    }

    return normalizedRow;
  });
}

function getActiveTab() {
  return workbook.tabs[workbook.activeTabIndex];
}

function getActiveColumns() {
  return getActiveTab().columns;
}

function getActiveRows() {
  return getActiveTab().rows;
}

function loadFlow() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));

    if (Array.isArray(saved) && saved.length) {
      const columns = newFlowColumns.slice();

      return {
        activeTabIndex: 0,
        tabs: [{ name: "Main", columns, rows: normalizeRows(saved, columns) }],
      };
    }

    if (saved && Array.isArray(saved.tabs) && saved.tabs.length) {
      return {
        activeTabIndex: Math.min(saved.activeTabIndex || 0, saved.tabs.length - 1),
        tabs: saved.tabs.map((tab, index) => {
          const columns = parseSpeechOrder(tab.columns || newFlowColumns);

          return {
            name: tab.name || `Flow ${index + 1}`,
            columns,
            rows: Array.isArray(tab.rows) ? normalizeRows(tab.rows, columns) : createBlankRows(columns),
          };
        }),
      };
    }
  } catch (error) {
    console.warn("Could not load saved flow", error);
  }

  return {
    activeTabIndex: 0,
    tabs: [createTab("Main")],
  };
}

function saveFlowNow() {
  if (saveFlowTimer) {
    clearTimeout(saveFlowTimer);
    saveFlowTimer = null;
  }

  localStorage.setItem(storageKey, JSON.stringify(workbook));
}

function scheduleSaveFlow() {
  if (saveFlowTimer) clearTimeout(saveFlowTimer);
  saveFlowTimer = setTimeout(saveFlowNow, 350);
}

window.addEventListener("beforeunload", saveFlowNow);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") saveFlowNow();
});

function getFlowExportFileName(tab) {
  const safeName = String(tab.name || "flow")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `${safeName || "flow"}.flow.json`;
}

function exportActiveFlow() {
  const activeTab = cloneTab(getActiveTab());
  const json = JSON.stringify({
    type: "debate-tools-flow-tab",
    version: 1,
    exportedAt: new Date().toISOString(),
    tab: activeTab,
  }, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = getFlowExportFileName(activeTab);
  link.click();
  URL.revokeObjectURL(url);

  return json;
}

function parseImportedFlowTab(flowJson) {
  const imported = typeof flowJson === "string" ? JSON.parse(flowJson) : flowJson;
  const tab = imported && imported.tab ? imported.tab : imported;

  if (!tab || typeof tab !== "object") {
    throw new Error("Imported flow must be an object.");
  }

  if (!Array.isArray(tab.columns) || !tab.columns.length) {
    throw new Error("Imported flow must include columns.");
  }

  if (!Array.isArray(tab.rows)) {
    throw new Error("Imported flow must include rows.");
  }

  return cloneTab(tab);
}

function importFlowTab(flowJson, fallbackName) {
  const tab = parseImportedFlowTab(flowJson);

  if ((!tab.name || tab.name === "Imported Flow") && fallbackName) {
    tab.name = fallbackName.replace(/\.flow\.json$/i, "").replace(/\.json$/i, "") || tab.name;
  }

  workbook.tabs.push(tab);
  workbook.activeTabIndex = workbook.tabs.length - 1;
  render();
  saveFlowNow();
  focusCell(0, 0);
}

async function importFlowFromFile() {
  const file = importFlowFileInput.files && importFlowFileInput.files[0];
  if (!file) return;

  try {
    importFlowTab(await file.text(), file.name);
  } catch (error) {
    console.error("Could not import flow", error);
    alert("Could not import flow. Make sure it is a valid exported flow JSON file.");
  } finally {
    importFlowFileInput.value = "";
  }
}

function resetWorkbook() {
  workbook = {
    activeTabIndex: 0,
    tabs: [createTab("Main")],
  };
}

function ensureCell(row, col) {
  const columns = getActiveColumns();
  const data = getActiveRows();

  while (row >= data.length) {
    data.push(Array(columns.length).fill(""));
  }

  if (!data[row]) data[row] = Array(columns.length).fill("");
  if (data[row][col] === undefined) data[row][col] = "";
}

function addRow(index = getActiveRows().length) {
  getActiveRows().splice(index, 0, Array(getActiveColumns().length).fill(""));
  renderSheet();
  saveFlowNow();
}

function addTab() {
  const name = prompt("Flow tab name:");
  if (!name) return;

  workbook.tabs.push(createTab(name));
  workbook.activeTabIndex = workbook.tabs.length - 1;
  render();
  saveFlowNow();
  focusCell(0, 0);
}

function deleteActiveTab() {
  const activeTab = getActiveTab();
  if (workbook.tabs.length === 1) {
    alert("You need at least one flow tab.");
    return;
  }

  if (!confirm(`Delete "${activeTab.name}"?`)) return;

  workbook.tabs.splice(workbook.activeTabIndex, 1);
  workbook.activeTabIndex = Math.max(0, workbook.activeTabIndex - 1);
  render();
  saveFlowNow();
}

function clearAllFlows() {
  if (!confirm("Clear all flow tabs? This deletes saved flow data from local storage.")) return;

  localStorage.removeItem(storageKey);
  resetWorkbook();
  render();
  focusCell(0, 0);
}

function focusCell(row, col, cursorPosition) {
  ensureCell(row, col);
  if (!focusExistingCell(row, col, cursorPosition)) {
    renderSheet();
    focusExistingCell(row, col, cursorPosition);
  }
}

function focusExistingCell(row, col, cursorPosition) {
  const cell = getCellElement(row, col);
  if (!cell) return false;

  const value = getActiveRows()[row] && getActiveRows()[row][col] || "";
  const nextCursor = cursorPosition ?? value.length;
  activeCell = {
    row,
    col,
    selectionStart: nextCursor,
    selectionEnd: nextCursor,
  };

  cell.focus();
  if (cursorPosition === undefined) {
    moveCursorToEnd(cell);
  } else {
    cell.setSelectionRange(cursorPosition, cursorPosition);
  }
  resizeCell(cell);

  return true;
}

function getCellElement(row, col) {
  return sheet.querySelector(`[data-row="${row}"][data-col="${col}"]`);
}

function updateActiveCellFromElement(cell) {
  activeCell = {
    row: Number(cell.dataset.row),
    col: Number(cell.dataset.col),
    selectionStart: cell.selectionStart,
    selectionEnd: cell.selectionEnd,
  };
}

function insertTextIntoActiveCell(text) {
  const insertion = String(text || "");
  if (!insertion) return;

  const { row, col, selectionStart, selectionEnd } = activeCell;
  ensureCell(row, col);

  const currentValue = getActiveRows()[row][col] || "";
  const start = Math.max(0, Math.min(selectionStart, currentValue.length));
  const end = Math.max(start, Math.min(selectionEnd, currentValue.length));
  const nextValue = currentValue.slice(0, start) + insertion + currentValue.slice(end);
  const nextCursor = start + insertion.length;

  getActiveRows()[row][col] = nextValue;
  const cell = getCellElement(row, col);
  if (cell) {
    cell.value = nextValue;
    resizeCell(cell);
  }
  scheduleSaveFlow();
  focusCell(row, col, nextCursor);
}

function render() {
  renderTabs();
  renderSheet();
}

function renderTabs() {
  tabs.innerHTML = "";

  workbook.tabs.forEach((tab, index) => {
    const tabButton = document.createElement("button");
    tabButton.className = index === workbook.activeTabIndex ? "tab active" : "tab";
    tabButton.type = "button";
    tabButton.textContent = tab.name;

    tabButton.addEventListener("click", () => {
      workbook.activeTabIndex = index;
      render();
      saveFlowNow();
    });

    tabs.appendChild(tabButton);
  });
}

function renderSheet() {
  const columns = getActiveColumns();
  const data = getActiveRows();

  updateSheetColumns(columns);
  sheet.innerHTML = "";
  sheet.appendChild(makeHeaderCell("", "corner"));

  columns.forEach((label) => {
    sheet.appendChild(makeHeaderCell(label, "col-head"));
  });

  data.forEach((row, rowIndex) => {
    sheet.appendChild(makeHeaderCell(String(rowIndex + 1), "row-head"));

    columns.forEach((column, colIndex) => {
      const cell = document.createElement("textarea");
      cell.className = colIndex % 2 === 0 ? "cell col-even" : "cell col-odd";
      cell.value = row[colIndex] || "";
      cell.wrap = "soft";
      cell.spellcheck = false;
      cell.dataset.row = rowIndex;
      cell.dataset.col = colIndex;

      cell.addEventListener("input", () => {
        getActiveRows()[rowIndex][colIndex] = cell.value;
        updateActiveCellFromElement(cell);
        resizeCell(cell);
        scheduleSaveFlow();
      });

      cell.addEventListener("focus", () => {
        updateActiveCellFromElement(cell);
        resizeCell(cell);
      });
      cell.addEventListener("click", () => updateActiveCellFromElement(cell));
      cell.addEventListener("select", () => updateActiveCellFromElement(cell));
      cell.addEventListener("keyup", () => updateActiveCellFromElement(cell));
      cell.addEventListener("keydown", handleCellKeydown);
      sheet.appendChild(cell);
    });
  });
}

function resizeCell(cell) {
  cell.style.height = "44px";
  cell.style.height = `${Math.max(44, cell.scrollHeight)}px`;
}

function makeHeaderCell(text, className) {
  const cell = document.createElement("div");
  cell.className = className;
  cell.textContent = text;
  return cell;
}

function moveCursorToEnd(cell) {
  const end = cell.value.length;
  cell.setSelectionRange(end, end);
}

function handleCellKeydown(event) {
  const row = Number(event.currentTarget.dataset.row);
  const col = Number(event.currentTarget.dataset.col);

  if (event.key === "Enter") {
    event.preventDefault();

    if (event.shiftKey) {
      addRow(row + 1);
    } else if (row + 1 >= getActiveRows().length) {
      addRow(getActiveRows().length);
    }

    focusCell(row + 1, col);
    return;
  }

  if (event.key === "Tab") {
    event.preventDefault();
    addRow(row + 1);
    focusCell(row + 1, col);
    return;
  }

  const movement = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  }[event.key];

  if (!movement) return;

  event.preventDefault();
  const columns = getActiveColumns();
  const nextRow = Math.max(0, row + movement[0]);
  const nextCol = Math.max(0, Math.min(columns.length - 1, col + movement[1]));

  if (nextRow >= getActiveRows().length) addRow(getActiveRows().length);
  focusExistingCell(nextRow, nextCol);
}

speechOrderInput.addEventListener("change", (e) => {
  newFlowColumns = parseSpeechOrder(e.target.value);
  speechOrderInput.value = newFlowColumns.join(",");
  localStorage.setItem(speechOrderKey, newFlowColumns.join(","));
});

addRowButton.addEventListener("click", () => {
  addRow();
  focusCell(getActiveRows().length - 1, 0);
});

addTabButton.addEventListener("click", addTab);
deleteTabButton.addEventListener("click", deleteActiveTab);
clearFlowsButton.addEventListener("click", clearAllFlows);
exportFlowButton.addEventListener("click", exportActiveFlow);
importFlowButton.addEventListener("click", () => importFlowFileInput.click());
importFlowFileInput.addEventListener("change", importFlowFromFile);
render();
