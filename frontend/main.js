const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let pyProcess = null;

function startPython() {
  const backendPath = path.join(__dirname, '..', 'backend', 'app.py');
  const pyExec = process.platform === 'win32' ? 'python' : 'python3';
  pyProcess = spawn(pyExec, [backendPath], {
    cwd: path.join(__dirname, '..', 'backend'),
    stdio: 'inherit'
  });
}

async function waitForServer(url, attempts = 25, delayMs = 300) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch (_) {}
    await new Promise(r => setTimeout(r, delayMs));
  }
  return false;
}

async function createWindow() {
  startPython();
  const ok = await waitForServer('http://127.0.0.1:5000/health');
  if (!ok) {
    console.error('Python API não respondeu a tempo.');
  }

  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (pyProcess) {
    pyProcess.kill('SIGTERM');
    pyProcess = null;
  }
  if (process.platform !== 'darwin') app.quit();
});
