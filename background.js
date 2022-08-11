chrome.runtime.onMessage.addListener(
  async (url) => {
    console.log(url);
    chrome.downloads.download({
      url
    });
  }
);
