async function callContentFunction(fooName) {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  chrome.tabs.sendMessage(tab.id, {
    action: fooName,
    data: null
  });
}

document.getElementById("myButton").addEventListener("click", () => callContentFunction("Pocket"));