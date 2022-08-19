import React, { useRef, useState } from 'react';
import './App.css';
import TextField, { TextFieldClasses, TextFieldClassKey, TextFieldProps } from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

function App() {
  const [log, setLog] = useState(undefined);

  chrome.runtime.onMessage.addListener(
    async (payload) => {
      if (payload.type === 'popup-log') {
        setLog(payload.data.content);
      }
    }
  );
  
  const handleDownload = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id! },
      files: ['content-script/main.js']
    });
  };

  return (
    <div className="App">
      <Stack spacing={2}>
        <Typography variant="body2" align="left" noWrap>{log}</Typography>
        <Button variant="contained" onClick={handleDownload}>Download</Button>
      </Stack>
    </div>
  );
}

export default App;
