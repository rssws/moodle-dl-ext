import { TableContainer, Paper, Table, TableHead, TableRow, TableCell, TableBody, Typography } from '@mui/material';
import { MoodleFile } from '@moodle-dl-ext/content-script';

function formatBytes(bytes: number, decimals?: number): string {
  if (bytes === 0) return '0 Bytes';
  let k = 1024,
    dm = decimals || 2,
    sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
    i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

interface MoodleFileListProps {
  data: MoodleFile[];
  hidden: boolean;
}

function MoodleFileList(props: MoodleFileListProps) {
  return (
    <TableContainer hidden={props.hidden} style={{ maxHeight: 300 }} component={Paper}>
      <Table stickyHeader size="small" aria-label="moodle-file-list">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Size</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {props.data.map((row, idx) => (
            <TableRow key={idx} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
              <TableCell component="th" scope="row">
                <Typography variant="body2" align="left" style={{ wordWrap: "break-word" }} width={350}>{row.resourceName}</Typography>
              </TableCell>
              <TableCell component="th" scope="row">
                <Typography variant="body2" align="left">{row.extension.toLowerCase()}</Typography>
              </TableCell>
              <TableCell component="th" scope="row" align="right">
                <Typography variant="body2" align="right">{formatBytes(row.size)}</Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default MoodleFileList;
