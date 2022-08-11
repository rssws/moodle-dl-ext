function filterUrl(url) {
  const re = /.*(https:\/\/.*\/resource\/view.php\?id=[0-9]+).*/;
  const result = re.exec(url);
  return result && result[0];
}

async function getFiles() {
  const urls = document.getElementsByTagName('a');

  const contentList = [];
  for (const url of urls) {
    const filteredUrl = filterUrl(url);
    if (filteredUrl) {
      const response = await fetch(filteredUrl);
      console.log(response);
      contentList.push({ url: response.url, content: await response.text() });
    }
  }

  console.log("Zipping...");
  const zip = new JSZip();
  for (const element of contentList) {
    const { url, content } = element;
    console.log("Processing " + url);
    const filename = decodeURIComponent(url.split('#').shift().split('?').shift().split('/').pop());
    zip.file(filename, content); 
  }
  
  console.log("Generating...")
  zip.generateAsync({
    type:"blob",
    compression: "STORE"
  }).then((blob) => {
    console.log("Transmitting...");
    chrome.runtime.sendMessage(URL.createObjectURL(blob));
  })
}

getFiles();