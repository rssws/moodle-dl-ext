import React, { useRef, useState } from 'react';
import './App.css';
import TextField, { TextFieldClasses, TextFieldClassKey, TextFieldProps } from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';

function App() {
  const [log, setLog] = useState(undefined);

  chrome.runtime.onMessage.addListener(async (payload) => {
    if (payload.type === 'popup-log') {
      setLog(payload.data.content);
    }
  });

  const handleDownload = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id! },
      files: ['content-script/main.js'],
    });
  };

  const handleGitHubLinkOnClick = () => {
    chrome.tabs.create({url: "https://github.com/rssws/moodle-dl-ext"});
  }

  const handleAuthorOnClick = () => {
    chrome.tabs.create({url: "https://github.com/rssws"});
  }

  return (
    <div className="App">
      <Stack spacing={2}>
        <Grid container spacing={2}>
          <Grid xs={2}>
            <img src='images/moodle-dl-ext-48.png' />
          </Grid>
          <Grid xs={8}>
            <Typography variant="h5" align="left">Moodle Downloader</Typography>
          </Grid>
          <Grid xs={2}>
            <Typography variant="body1" align="right">
              <Link component="button" onClick={handleGitHubLinkOnClick} underline="hover">GitHub</Link>
            </Typography>
            <Typography variant="body1" align="right">
              by <Link component="button" onClick={handleAuthorOnClick} underline="hover">rssws</Link>
            </Typography>
          </Grid>
        </Grid>
        <Typography variant="body2" align="left" hidden={!log} paddingX={2}>
          {log}
        </Typography>
        <Button variant="contained" onClick={handleDownload}>
          Download
        </Button>
      </Stack>
    </div>
  );
}

export default App;
