import JSZip from 'jszip';

function filterUrl(url: string) {
  const re = /.*(https:\/\/.*\/resource\/view.php\?id=[0-9]+).*/;
  const result = re.exec(url);
  return result && result[0];
}

function urlToFilename(url: string) {
  return decodeURIComponent(url.split('#').shift()!.split('?').shift()!.split('/').pop()!);
}

function log(content: string) {
  chrome.runtime.sendMessage({
    type: 'popup-log',
    data: { content },
  });
}

export async function getFiles() {
  log('Processing URLs...');
  const urls = document.getElementsByTagName('a');

  const contentList: any[] = [];
  const promiseList: Promise<void>[] = [];
  for (const url of urls) {
    const filteredUrl = filterUrl(url.toString());
    if (filteredUrl) {
      const promise = fetch(filteredUrl).then((response) => {
        log(`(${contentList.length + 1} / ${promiseList.length}) [${response.statusText}] ${response.url}`);
        contentList.push({ url: response.url, content: response.arrayBuffer() });
      });
      promiseList.push(promise);
    }
  }

  log(`Downloading ${promiseList.length} files ...`);
  await Promise.all(promiseList);

  log('Preparing for zipping...');
  const zip = new JSZip();
  for (const element of contentList) {
    const { url, content } = element;

    const filename = urlToFilename(url);
    zip.file(filename, content);
  }

  log('Generating zip file...');
  zip
    .generateAsync({
      type: 'blob',
      compression: 'STORE',
    })
    .then((blob) => {
      log('Saving the file...');
      chrome.runtime.sendMessage(
        {
          type: 'background-download',
          data: { url: URL.createObjectURL(blob) },
        },
        (response) => {
          log('File saved: ' + urlToFilename(response));
        }
      );
    });
}
