const storageKey = "debateTools.flowSheet";
const columns = ["1AC", "1NC", "2AC", "2NC", "1AR", "1NR", "2AR", "2NR"];
const minRows = 18;
const sheet = document.getElementById("sheet");
const tabs = document.getElementById("tabs");
const addRowButton = document.getElementById("add-row");
const addTabButton = document.getElementById("add-tab");
const deleteTabButton = document.getElementById("delete-tab");
const clearFlowsButton = document.getElementById("clear-flows");

let workbook = loadFlow();

sheet.style.gridTemplateColumns = `24px repeat(${columns.length}, minmax(110px, 1fr))`;

function createBlankRows() {
  return Array.from({ length: minRows }, () => Array(columns.length).fill(""));
}

function createTab(name) {
  return {
    name,
    rows: createBlankRows(),
  };
}

function normalizeRows(rows) {
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

function getActiveRows() {
  return getActiveTab().rows;
}

function loadFlow() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));

    if (Array.isArray(saved) && saved.length) {
      return {
        activeTabIndex: 0,
        tabs: [{ name: "Main", rows: normalizeRows(saved) }],
      };
    }

    if (saved && Array.isArray(saved.tabs) && saved.tabs.length) {
      return {
        activeTabIndex: Math.min(saved.activeTabIndex || 0, saved.tabs.length - 1),
        tabs: saved.tabs.map((tab, index) => ({
          name: tab.name || `Flow ${index + 1}`,
          rows: Array.isArray(tab.rows) ? normalizeRows(tab.rows) : createBlankRows(),
        })),
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

function saveFlow() {
  localStorage.setItem(storageKey, JSON.stringify(workbook));
}

function resetWorkbook() {
  workbook = {
    activeTabIndex: 0,
    tabs: [createTab("Main")],
  };
}

function ensureCell(row, col) {
  const data = getActiveRows();

  while (row >= data.length) {
    data.push(Array(columns.length).fill(""));
  }

  if (!data[row]) data[row] = Array(columns.length).fill("");
  if (data[row][col] === undefined) data[row][col] = "";
}

function addRow(index = getActiveRows().length) {
  getActiveRows().splice(index, 0, Array(columns.length).fill(""));
  render();
  saveFlow();
}

function addTab() {
  const name = prompt("Flow tab name:");
  if (!name) return;

  workbook.tabs.push(createTab(name));
  workbook.activeTabIndex = workbook.tabs.length - 1;
  render();
  saveFlow();
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
  saveFlow();
}

function clearAllFlows() {
  if (!confirm("Clear all flow tabs? This deletes saved flow data from local storage.")) return;

  localStorage.removeItem(storageKey);
  resetWorkbook();
  render();
  focusCell(0, 0);
}

function focusCell(row, col) {
  ensureCell(row, col);
  render();

  const cell = sheet.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  if (cell) {
    cell.focus();
    cell.select();
  }
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
      saveFlow();
    });

    tabs.appendChild(tabButton);
  });
}

function renderSheet() {
  const data = getActiveRows();

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
      cell.spellcheck = false;
      cell.dataset.row = rowIndex;
      cell.dataset.col = colIndex;

      cell.addEventListener("input", () => {
        getActiveRows()[rowIndex][colIndex] = cell.value;
        resizeCell(cell);
        saveFlow();
      });

      cell.addEventListener("keydown", handleCellKeydown);
      sheet.appendChild(cell);
      resizeCell(cell);
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

function handleCellKeydown(event) {
  const row = Number(event.currentTarget.dataset.row);
  const col = Number(event.currentTarget.dataset.col);

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
  const nextRow = Math.max(0, row + movement[0]);
  const nextCol = Math.max(0, Math.min(columns.length - 1, col + movement[1]));

  if (nextRow >= getActiveRows().length) addRow(getActiveRows().length);
  focusCell(nextRow, nextCol);
}

addRowButton.addEventListener("click", () => {
  addRow();
  focusCell(getActiveRows().length - 1, 0);
});

addTabButton.addEventListener("click", addTab);
deleteTabButton.addEventListener("click", deleteActiveTab);
clearFlowsButton.addEventListener("click", clearAllFlows);

render();
