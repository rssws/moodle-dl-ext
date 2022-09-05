import JSZip from 'jszip';
import { message } from './message';
import { randStr } from './util';

type ResourceType = 'courseView' | 'courseResources' | 'modFolderView' | 'modResourceView' | 'pluginfile';
interface Resource {
  type: ResourceType;
  url: string;
}

export interface MoodleFile {
  path: string;
  content: ArrayBuffer;
}

const filters = new Map<ResourceType, RegExp>();
filters.set('courseView', /(.*\/course\/view\.php\?id=[0-9]+).*/);
filters.set('courseResources', /(.*\/course\/resources\.php\?id=[0-9]+).*/);
filters.set('modResourceView', /(.*\/resource\/view\.php\?id=[0-9]+).*/);
filters.set('modFolderView', /(.*\/folder\/view\.php\?id=[0-9]+).*/);
filters.set('pluginfile', /(.*\/pluginfile\.php.*)/);

export function convertUrlToResource(url: string): Resource | undefined {
  for (const [resourceType, regExp] of filters.entries()) {
    const result = url.match(regExp)?.[1];
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
  return getValidFilename(decodeURIComponent(url.split('#').shift()!.split('?').shift()!.split('/').pop()!));
}

function getValidFilename(name: string): string {
  name = name
    .trim()
    .replaceAll(' ', '_')
    .replaceAll(/[^-\w.]/gu, '');
  if (['', '.', '..'].includes(name)) {
    console.warn(`filename '${name}' is invalid!`);
    return `invalid-filename_${randStr(8)}`;
  }
  return name;
}

export const processedResourceUrls = new Set<string>();

export async function getMoodleFiles(resource: Resource, filenamePrefix = ''): Promise<MoodleFile[]> {
  const { url, type } = resource;

  if (processedResourceUrls.has(url)) {
    return [];
  }
  processedResourceUrls.add(url);

  if (['courseView'].includes(type)) {
    return getMoodleFiles({ type: 'courseResources', url: resource.url.replace('view', 'resources') });
  } else if (['courseResources', 'modFolderView'].includes(type)) {
    message('status', `Processing ${url}`);

    const response = await fetch(url);
    const domParser = new DOMParser();
    const document = domParser.parseFromString(await response.text(), 'text/html').documentElement;
    const urls = document.getElementsByTagName('a');
    let moodleFiles: MoodleFile[] = [];

    let pagePrefix = filenamePrefix;
    if (['courseResources'].includes(type)) {
      const title = document.getElementsByTagName('title')[0].innerText;
      const processedTitle = title ? getValidFilename(title) : '';
      pagePrefix += processedTitle + '/';
    }

    const localProcessedResourceUrls = new Set<string>();
    for (const url of urls) {
      const targetResource = convertUrlToResource(url.href);
      // The second condition prevents from crawling back to other courses.
      if (targetResource && targetResource.type !== 'courseView') {
        if (localProcessedResourceUrls.has(targetResource.url) || processedResourceUrls.has(targetResource.url)) {
          continue;
        }
        localProcessedResourceUrls.add(targetResource.url);

        let finalPrefix = pagePrefix;
        if (targetResource.type === 'modFolderView') {
          finalPrefix += urlToFilename(url.innerText) + '/';
        }
        moodleFiles = moodleFiles.concat(await getMoodleFiles(targetResource, finalPrefix));
      }
    }
    return moodleFiles;
  } else if (['modResourceView', 'pluginfile'].includes(type)) {
    message('status', `Downloading ${url}`);
    const response = await fetch(url);
    return [{ path: filenamePrefix + urlToFilename(response.url), content: await response.arrayBuffer() }];
  } else {
    throw new Error(`Unknown resource type '${type}'!`);
  }
}

export async function generateZipFile(moodleFiles: MoodleFile[]): Promise<void> {
  const zip = new JSZip();
  for (const moodleFile of moodleFiles) {
    const { path, content } = moodleFile;
    zip.file(path, content);
  }

  zip
    .generateAsync({
      type: 'blob',
      compression: 'STORE',
    })
    .then((blob) => {
      message('status', 'Saving the file...');

      const fileLink = document.createElement('a');
      fileLink.href = URL.createObjectURL(blob);
      fileLink.download = moodleFiles[0].path.split('/')[0] + '.zip';
      fileLink.click();
      message('status', 'File saved: ' + fileLink.download);
    });
}

export function init() {
  processedResourceUrls.clear();
}
