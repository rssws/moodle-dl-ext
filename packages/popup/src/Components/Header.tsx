import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';

function Header() {
  const handleLinkOnClick = (url: string) => {
    chrome.tabs.create({ url });
  };

  return (
    <Grid container spacing={2}>
      <Grid xs={2}>
        <img src="images/moodle-dl-ext-48.png" alt="Moodle Downloader Logo" />
      </Grid>
      <Grid xs={8}>
        <Typography variant="h5" align="left">
          Moodle Downloader
        </Typography>
      </Grid>
      <Grid xs={2}>
        <Typography variant="body1" align="right">
          <Link
            component="button"
            onClick={() => handleLinkOnClick('https://github.com/rssws/moodle-dl-ext')}
            underline="hover"
          >
            GitHub
          </Link>
        </Typography>
        <Typography variant="body1" align="right">
          by{' '}
          <Link component="button" onClick={() => handleLinkOnClick('https://github.com/rssws')} underline="hover">
            rssws
          </Link>
        </Typography>
      </Grid>
    </Grid>
  );
}

export default Header;
