import { message } from './message';
import { convertUrlToResource, downloadMoodleFiles, generateZipFile, getMoodleFiles, init } from './moodle-files';

export type Status = 'initialized' | 'processing' | 'finished';

async function main(): Promise<void> {
  message<Status>('status', 'processing');
  init();
  const initialResource = convertUrlToResource(window.location.href);
  if (initialResource) {
    message<string>('status-log', 'Processing links...');
    const partialMoodleFiles = await getMoodleFiles(initialResource);

    message<string>('status-log', 'Downloading files...');
    const moodleFiles = await downloadMoodleFiles(partialMoodleFiles);

    message<string>('status-log', 'Generating zip file...');
    await generateZipFile(moodleFiles);
  } else {
    message<string>('status-log', `Unsupported url: ${window.location.href}.`);
  }
  message<Status>('status', 'finished');
}

main();
