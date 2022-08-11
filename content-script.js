function filterUrl(url) {
  const re = /.*(https:\/\/.*\/resource\/view.php\?id=[0-9]+).*/;
  const result = re.exec(url);
  return result && result[0];
}

async function getFiles() {
  console.log('Processing URLs...');
  const urls = document.getElementsByTagName('a');

  const contentList = [];
  const promiseList = [];
  for (const url of urls) {
    const filteredUrl = filterUrl(url);
    if (filteredUrl) {
      const promise = fetch(filteredUrl)
        .then((response) => {
          console.log(`(${contentList.length + 1} / ${promiseList.length}) [${response.statusText}] ${response.url}`);
          contentList.push({ url: response.url, content: response.arrayBuffer() });
        });
      promiseList.push(promise);
    }
  }

  console.log(`Downloading ${promiseList.length} files ...`);
  await Promise.all(promiseList);

  console.log("Preparing for zipping...");
  const zip = new JSZip();
  for (const element of contentList) {
    const { url, content } = element;
    
    const filename = decodeURIComponent(url.split('#').shift().split('?').shift().split('/').pop());
    zip.file(filename, content); 
  }
  
  console.log("Generating zip file...")
  zip.generateAsync({
    type:"blob",
    compression: "STORE"
  }).then((blob) => {
    console.log("Saving the file...");
    chrome.runtime.sendMessage(URL.createObjectURL(blob));
  })
}

getFiles();