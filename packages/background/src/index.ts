chrome.runtime.onMessage.addListener(
    async (payload, sender, sendResponse) => {
      if (payload.type === 'background-download') {
        console.log(payload.data.url);
        chrome.downloads.download({
          url: payload.data.url
        });
        sendResponse(payload.data.url);
      }
    }
  );

export {};
