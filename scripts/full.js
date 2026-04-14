const { spawn } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ quiet: true, path: path.resolve(__dirname, '..', '.env') });

const root = path.resolve(__dirname, '..');
const nodeCmd = process.execPath;
const port = process.env.PORT || '3000';
const url = process.env.APP_URL || `http://localhost:${port}`;

function runSetup() {
  const result = spawn(nodeCmd, ['src/setup.js'], {
    cwd: root,
    stdio: 'inherit'
  });

  return new Promise((resolve, reject) => {
    result.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`setup falhou com codigo ${code}`));
    });
  });
}

function openBrowser() {
  spawn(nodeCmd, [path.join('scripts', 'open-browser.js')], {
    cwd: root,
    stdio: 'inherit'
  });
}

async function main() {
  await runSetup();

  const server = spawn(nodeCmd, ['src/index.js'], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      APP_MODE: 'offline'
    }
  });

  const openTimer = setTimeout(() => openBrowser(url), 1200);

  const shutdown = () => {
    clearTimeout(openTimer);
    server.kill('SIGINT');
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  server.on('exit', (code) => process.exit(code ?? 0));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
