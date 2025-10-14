const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let pyProcess = null;

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
  try {
    await waitForServer('http://127.0.0.1:5000/health', 10, 300);
  } catch (e) { /* ignore */ }

  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await win.loadFile(path.join(__dirname, 'renderer', 'login.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (pyProcess) {
    try { pyProcess.kill('SIGTERM'); } catch (_) {}
    pyProcess = null;
  }
  if (process.platform !== 'darwin') app.quit();
});
