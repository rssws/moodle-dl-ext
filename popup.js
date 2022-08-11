let download = document.getElementById("download");

download.addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['lib/jszip.min.js', 'content-script.js']
  });
});
