import JSZip, { file } from 'jszip';
import { message } from './message';
import { randStr } from './util';

type ResourceType = 'courseView' | 'courseResources' | 'modFolderView' | 'modResourceView' | 'pluginfile';
interface Resource {
  name: string;
  type: ResourceType;
  url: string;
}

export interface PartialMoodleFile {
  resourceName: string;
  sourceUrl: string;
  filenamePrefix: string;
}

export type MoodleFile = PartialMoodleFile & {
  targetUrl: string;
  filename: string;
  extension: string;
  content: ArrayBuffer;
  size: number;
};

export interface DownloadProgress {
  current: number;
  total: number;
}

const filters = new Map<ResourceType, RegExp>();
filters.set('courseView', /(.*\/course\/view\.php\?id=[0-9]+).*/);
filters.set('courseResources', /(.*\/course\/resources\.php\?id=[0-9]+).*/);
filters.set('modResourceView', /(.*\/resource\/view\.php\?id=[0-9]+).*/);
filters.set('modFolderView', /(.*\/folder\/view\.php\?id=[0-9]+).*/);
filters.set('pluginfile', /(.*\/pluginfile\.php.*)/);

export function convertUrlToResource(url: HTMLAnchorElement | string): Resource | undefined {
  if (url instanceof HTMLAnchorElement) {
    for (const [resourceType, regExp] of filters.entries()) {
      const result = url.href.match(regExp)?.[1];
      if (result) {
        return {
          name: getValidFilename(url.innerText),
          type: resourceType,
          url: result
        };
      }
    }
  } else {
    for (const [resourceType, regExp] of filters.entries()) {
      const result = url.match(regExp)?.[1];
      if (result) {
        return {
          name: getValidFilename(url),
          type: resourceType,
          url: result
        };
      }
    }
  }

  return undefined;
}

function urlToFilename(url: string): string {
  return getValidFilename(decodeURIComponent(url.split('#').shift()!.split('?').shift()!.split('/').pop()!));
}

function getValidFilename(name: string): string {
  const newName = name
    .trim()
    .replaceAll(' ', '_')
    .replaceAll(/[^-\w.]/gu, '');
  if (['', '.', '..'].includes(newName)) {
    console.warn(`filename '${name}' is invalid!`);
    return `invalid-filename_${randStr(8)}`;
  }
  return newName;
}

function getFileExtension(name: string): string {
  return name.split('.').slice(1).pop() ?? '';
}

function getUrlWithoutHashtag(url: string): string {
  return url.split('#')[0];
}

export const processedResourceUrls = new Set<string>();

export async function getMoodleFiles(resource: Resource, filenamePrefix = ''): Promise<PartialMoodleFile[]> {
  const url = getUrlWithoutHashtag(resource.url);
  const { name, type } = resource;
  if (processedResourceUrls.has(url)) {
    return [];
  }
  processedResourceUrls.add(url);

  if (['courseView'].includes(type)) {
    return getMoodleFiles({
      name: 'course view',
      type: 'courseResources',
      url: url.replace('view', 'resources')
    });
  } else if (['courseResources', 'modFolderView'].includes(type)) {
    message<string>('status-log', `Processing ${url}`);

    const response = await fetch(url);
    const domParser = new DOMParser();
    const document = domParser.parseFromString(await response.text(), 'text/html').documentElement;
    const urls = document.getElementsByTagName('a');
    let moodleFiles: PartialMoodleFile[] = [];

    let pagePrefix = filenamePrefix;
    if (['courseResources'].includes(type)) {
      const title = document.getElementsByTagName('title')[0].innerText;
      const processedTitle = title ? getValidFilename(title) : '';
      pagePrefix += processedTitle + '/';
    }

    const localProcessedResourceUrls = new Set<string>();
    for (const url of urls) {
      const urlWithoutHashtag = getUrlWithoutHashtag(url.href);
      if (localProcessedResourceUrls.has(urlWithoutHashtag) || processedResourceUrls.has(urlWithoutHashtag)) {
        continue;
      }
      localProcessedResourceUrls.add(urlWithoutHashtag);

      const targetResource = convertUrlToResource(url);
      // The second condition prevents from crawling back to other courses.
      if (targetResource && targetResource.type !== 'courseView') {
        let finalPrefix = pagePrefix;
        if (targetResource.type === 'modFolderView') {
          finalPrefix += urlToFilename(url.innerText) + '/';
        }
        moodleFiles = moodleFiles.concat(await getMoodleFiles(targetResource, finalPrefix));
      }
    }
    return moodleFiles;
  } else if (['modResourceView', 'pluginfile'].includes(type)) {
    message<string>('status-log', `Processing ${url}`);
    const partialMoodleFile: PartialMoodleFile = {
      resourceName: name,
      sourceUrl: url,
      filenamePrefix
    };

    return [partialMoodleFile];
  } else {
    throw new Error(`Unknown resource type '${type}'!`);
  }
}

export async function downloadMoodleFiles(partialMoodleFiles: PartialMoodleFile[]): Promise<MoodleFile[]> {
  message('download-progress', {
    current: 0,
    total: partialMoodleFiles.length
  });
  const moodleFiles: MoodleFile[] = [];
  for (const [idx, partialMoodleFile] of partialMoodleFiles.entries()) {
    message<string>('status-log', `Downloading ${partialMoodleFile.resourceName}`);
    const response = await fetch(partialMoodleFile.sourceUrl);
    const filename = urlToFilename(response.url);
    const extension = getFileExtension(filename);
    const content = await response.arrayBuffer();
    const moodleFile: MoodleFile = {
      ...partialMoodleFile,
      targetUrl: response.url,
      filename,
      extension,
      content,
      size: content.byteLength
    };

    // Remove duplicated file extension
    if (extension !== '') {
      if (moodleFile.resourceName.endsWith('extension')) {
        moodleFile.resourceName = moodleFile.resourceName.split('.').slice(0, -1).join();
      }
    }

    message<MoodleFile>('downloaded', moodleFile);
    message('download-progress', {
      current: idx + 1,
      total: partialMoodleFiles.length
    });
    moodleFiles.push(moodleFile);
  }
  return moodleFiles;
}

export async function generateZipFile(moodleFiles: MoodleFile[]): Promise<void> {
  const zip = new JSZip();
  for (const moodleFile of moodleFiles) {
    const { filenamePrefix, extension, content, resourceName } = moodleFile;

    let path = filenamePrefix + resourceName + '.' + extension;
    if (zip.file(path)) {
      // If the path already exists, appending random string
      path = filenamePrefix + resourceName + '_' + randStr(8) + '.' + extension;
    }

    zip.file(path, content);
  }

  zip
    .generateAsync({
      type: 'blob',
      compression: 'STORE'
    })
    .then(blob => {
      message<string>('status-log', 'Saving the file...');

      const fileLink = document.createElement('a');
      fileLink.href = URL.createObjectURL(blob);
      fileLink.download = moodleFiles[0].filenamePrefix.slice(0, -1) + '.zip';
      fileLink.click();
      message<string>('status-log', 'File saved: ' + fileLink.download);
    });
}

export function init() {
  processedResourceUrls.clear();
  message('download-progress', {
    current: 0,
    total: 1
  });
}
