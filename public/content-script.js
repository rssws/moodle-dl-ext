function filterUrl(url) {
  const re = /.*(https:\/\/.*\/resource\/view.php\?id=[0-9]+).*/;
  const result = re.exec(url);
  return result && result[0];
}

function urlToFilename(url) {
  return decodeURIComponent(url.split('#').shift().split('?').shift().split('/').pop());
}

function log(content) {
  chrome.runtime.sendMessage({
    type: "popup-log",
    data: { content }
  });
}

async function getFiles() {
  log('Processing URLs...');
  const urls = document.getElementsByTagName('a');

  const contentList = [];
  const promiseList = [];
  for (const url of urls) {
    const filteredUrl = filterUrl(url);
    if (filteredUrl) {
      const promise = fetch(filteredUrl)
        .then((response) => {
          log(`(${contentList.length + 1} / ${promiseList.length}) [${response.statusText}] ${response.url}`);
          contentList.push({ url: response.url, content: response.arrayBuffer() });
        });
      promiseList.push(promise);
    }
  }

  log(`Downloading ${promiseList.length} files ...`);
  await Promise.all(promiseList);

  log("Preparing for zipping...");
  const zip = new JSZip();
  for (const element of contentList) {
    const { url, content } = element;
    
    const filename = urlToFilename(url);
    zip.file(filename, content); 
  }
  
  log("Generating zip file...")
  zip.generateAsync({
    type:"blob",
    compression: "STORE"
  }).then((blob) => {
    log("Saving the file...");
    chrome.runtime.sendMessage({
      type: "background-download",
      data: { url: URL.createObjectURL(blob) }
    }, (response) => {
      log("File saved: " + urlToFilename(response));
    });
  })
}

getFiles();