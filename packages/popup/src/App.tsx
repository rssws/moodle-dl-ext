import { useState } from 'react';
import './App.css';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import MoodleFileList from './Components/MoodleFileList';
import { MoodleFile, Status, DownloadProgress } from '@moodle-dl-ext/content-script';
import LinearProgress from '@mui/material/LinearProgress';
import Header from './Components/Header';

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

  return (
    <div className="App">
      <Stack spacing={2}>
        <Header />
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
