const { spawn } = require('child_process');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ quiet: true, path: path.resolve(__dirname, '..', '.env') });

const port = process.env.PORT || '3000';
const url = process.env.APP_URL || `http://localhost:${port}`;

function openUrl(targetUrl) {
  const platform = process.platform;

  if (platform === 'win32') {
    return spawn('cmd', ['/c', 'start', '', targetUrl], { stdio: 'ignore', detached: true });
  }

  if (platform === 'darwin') {
    return spawn('open', [targetUrl], { stdio: 'ignore', detached: true });
  }

  return spawn('xdg-open', [targetUrl], { stdio: 'ignore', detached: true });
}

openUrl(url).unref();
console.log(`Abrindo ${url}`);
