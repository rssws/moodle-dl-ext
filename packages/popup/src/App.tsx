import { useState } from 'react';
import './App.css';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import MoodleFileList from './Components/MoodleFileList';
import { MoodleFile, Status, DownloadProgress } from '@moodle-dl-ext/content-script';
import LinearProgress from '@mui/material/LinearProgress';

function App() {
  const [status, setStatus] = useState<Status>('initialized');
  const [statusLog, setStatusLog] = useState<string | undefined>(undefined);
  const [downloadList, setDownloadedList] = useState<MoodleFile[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | undefined>(undefined);

  chrome.runtime.onMessage.addListener(async message => {
    if (message.topic === 'status') {
      setStatus(message.payload);
    }
    if (message.topic === 'status-log') {
      setStatusLog(message.payload);
    }
    if (message.topic === 'downloaded') {
      setDownloadedList([message.payload, ...downloadList]);
    }
    if (message.topic === 'download-progress') {
      setDownloadProgress(message.payload);
    }
  });

  const handleDownload = async () => {
    setStatusLog(undefined);
    setDownloadedList([]);
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id! },
      files: ['content-script/main.js']
    });
  };

  const handleGitHubLinkOnClick = () => {
    chrome.tabs.create({ url: 'https://github.com/rssws/moodle-dl-ext' });
  };

  const handleAuthorOnClick = () => {
    chrome.tabs.create({ url: 'https://github.com/rssws' });
  };

  return (
    <div className="App">
      <Stack spacing={2}>
        <Grid container spacing={2}>
          <Grid xs={2}>
            <img src="images/moodle-dl-ext-48.png" />
          </Grid>
          <Grid xs={8}>
            <Typography variant="h5" align="left">
              Moodle Downloader
            </Typography>
          </Grid>
          <Grid xs={2}>
            <Typography variant="body1" align="right">
              <Link component="button" onClick={handleGitHubLinkOnClick} underline="hover">
                GitHub
              </Link>
            </Typography>
            <Typography variant="body1" align="right">
              by{' '}
              <Link component="button" onClick={handleAuthorOnClick} underline="hover">
                rssws
              </Link>
            </Typography>
          </Grid>
        </Grid>
        <Typography variant="body2" align="left" hidden={status === 'initialized'} paddingX={2}>
          {statusLog}
        </Typography>
        <Grid hidden={status !== 'processing'}>
          {downloadProgress && (
            <LinearProgress variant="determinate" value={(downloadProgress.current / downloadProgress.total) * 100} />
          )}
        </Grid>
        <MoodleFileList hidden={status === 'initialized'} data={downloadList} />
        <Button variant="contained" disabled={status === 'processing'} onClick={handleDownload}>
          {status === 'processing' ? 'Downloading...' : 'Download'}
        </Button>
      </Stack>
    </div>
  );
}

export default App;
