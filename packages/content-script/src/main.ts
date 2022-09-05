import { message } from './message';
import { convertUrlToResource, generateZipFile, getMoodleFiles, init } from './moodle-files';

async function main(): Promise<void> {
  init();
  const initialResource = convertUrlToResource(window.location.href);
  if (initialResource) {
    message('status', 'Downloading files...');
    const moodleFiles = await getMoodleFiles(initialResource);

    message('status', 'Generating zip file...');
    await generateZipFile(moodleFiles);
  } else {
    message('status', `Unsupported url: ${window.location.href}.`);
  }
}

main();
