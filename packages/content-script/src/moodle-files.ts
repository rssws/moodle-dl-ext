import JSZip, { filter } from 'jszip';
import { log } from './message';

type ResourceType = 'courseView' | 'courseResources' | 'modFolderView' | 'modResourceView' | 'pluginfile' | 'plainhtml';
interface Resource {
  type: ResourceType;
  url: string;
}

interface MoodleFile {
  name: string;
  content: ArrayBuffer;
}

const filters = new Map<ResourceType, RegExp>();
filters.set('courseView', /(.*\/course\/view\.php\?id=[0-9]+).*/);
filters.set('courseResources', /(.*\/course\/resources\.php\?id=[0-9]+).*/);
filters.set('modResourceView', /(.*\/resource\/view\.php\?id=[0-9]+).*/);
filters.set('modFolderView', /(.*\/folder\/view\.php\?id=[0-9]+).*/);
filters.set('pluginfile', /(.*\/pluginfile\.php.*)/);

function convertUrlToResource(url: string): Resource | undefined {
  for (const [resourceType, regExp] of filters.entries()) {
    const result = url.match(regExp)?.[1];
    console.log(result);
    if (result) {
      return {
        type: resourceType,
        url: result,
      };
    }
  }
  return undefined;
}

function urlToFilename(url: string): string {
  return decodeURIComponent(url.split('#').shift()!.split('?').shift()!.split('/').pop()!);
}

const processedResourceUrls = new Set<string>();

async function getMoodleFiles(resource: Resource): Promise<MoodleFile[]> {
  const { url, type } = resource;

  if (processedResourceUrls.has(url)) {
    return [];
  }
  processedResourceUrls.add(url);
  console.log(processedResourceUrls);

  if (['courseView', 'courseResources', 'modFolderView', 'plainhtml'].includes(type)) {
    log(`Processing ${url}`);

    const response = await fetch(url);
    const domParser = new DOMParser();
    const document = domParser.parseFromString(await response.text(), 'text/html').documentElement;
    const urls = document.getElementsByTagName('a');
    let moodleFiles: MoodleFile[] = [];

    for (const url of urls) {
      const resource = convertUrlToResource(url.href);
      if (resource) {
        moodleFiles = moodleFiles.concat(await getMoodleFiles(resource));
      }
    }
    return moodleFiles;
  } else if (['modResourceView', 'pluginfile'].includes(type)) {
    log(`Downloading ${url}`);
    const response = await fetch(url);
    return [{ name: urlToFilename(response.url), content: await response.arrayBuffer() }];
  } else {
    throw new Error(`Unknown resource type '${type}'!`);
  }
}

async function generateZipFile(moodleFiles: MoodleFile[]) {
  const zip = new JSZip();
  for (const moodleFile of moodleFiles) {
    const { name, content } = moodleFile;
    zip.file(name, content);
  }

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

export async function main() {
  const initialResource = convertUrlToResource(window.location.href);
  if (initialResource) {
    log('Downloading files...');
    const moodleFiles = await getMoodleFiles(initialResource);

    log('Generating zip file...');
    await generateZipFile(moodleFiles);
  } else {
    log(`Unsupported url: ${window.location.href}.`);
  }
  processedResourceUrls.clear();
}
