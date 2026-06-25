const { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const isDev = process.argv.includes('--dev');
const APPDATA = path.join(app.getPath('appData'), 'ENIBexder');

const APPDATA_PATHS = {
  root: APPDATA,
  settings: path.join(APPDATA, 'settings.json'),
  profiles: path.join(APPDATA, 'profiles'),
  themes: path.join(APPDATA, 'themes'),
  cache: path.join(APPDATA, 'cache'),
};

function ensureAppDataDirs() {
  Object.values(APPDATA_PATHS).forEach(p => {
    if (!p.endsWith('.json') && !fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
    }
  });
}

let mainWindow;

function createWindow() {
  ensureAppDataDirs();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1280,
    minHeight: 720,
    resizable: false,
    frame: false,
    transparent: false,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: path.join(__dirname, 'assets', 'icons', 'icon.png'),
    show: false,
    titleBarStyle: 'hidden',
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-state-changed', 'maximized');
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-state-changed', 'normal');
  });

  mainWindow.on('enter-full-screen', () => {
    mainWindow.webContents.send('window-state-changed', 'fullscreen');
  });

  mainWindow.on('leave-full-screen', () => {
    mainWindow.webContents.send('window-state-changed', 'windowed');
  });

  // F11 toggles fullscreen (Electron doesn't do this automatically)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ── Window Controls ──────────────────────────────────────────────────────────

ipcMain.handle('window-minimize', () => mainWindow.minimize());

ipcMain.handle('window-maximize-toggle', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    mainWindow.setResizable(false);
  } else {
    mainWindow.setResizable(true);
    mainWindow.maximize();
  }
});

ipcMain.handle('window-close', () => mainWindow.close());

ipcMain.handle('window-fullscreen-toggle', () => {
  mainWindow.setFullScreen(!mainWindow.isFullScreen());
});

ipcMain.handle('window-get-state', () => {
  if (mainWindow.isFullScreen()) return 'fullscreen';
  if (mainWindow.isMaximized()) return 'maximized';
  return 'normal';
});

// ── File System ──────────────────────────────────────────────────────────────

ipcMain.handle('fs-read-file', async (_, filePath) => {
  try {
    return { ok: true, data: fs.readFileSync(filePath, 'utf-8') };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('fs-write-file', async (_, filePath, content) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('fs-read-dir', async (_, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) return { ok: true, files: [] };
    const files = fs.readdirSync(dirPath).map(name => {
      const full = path.join(dirPath, name);
      const stat = fs.statSync(full);
      return { name, fullPath: full, isDirectory: stat.isDirectory(), size: stat.size };
    });
    return { ok: true, files };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('fs-exists', async (_, filePath) => fs.existsSync(filePath));

ipcMain.handle('fs-write-binary', async (_, filePath, base64Data) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('fs-open-folder', async (_, dirPath) => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  shell.openPath(dirPath);
});

ipcMain.handle('dialog-open-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('dialog-open-file', async (_, filters) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || [],
  });
  return result.canceled ? null : result.filePaths[0];
});

// ── AppData Paths ────────────────────────────────────────────────────────────

ipcMain.handle('appdata-get-paths', () => APPDATA_PATHS);

ipcMain.handle('appdata-get-root', () => APPDATA);

// ── App Directory ────────────────────────────────────────────────────────────

ipcMain.handle('app-get-dir', () => {
  return app.isPackaged ? path.dirname(app.getPath('exe')) : __dirname;
});

// ── Emulator Launch ──────────────────────────────────────────────────────────

ipcMain.handle('emulator-launch', async (_, emulatorPath, romPath, args) => {
  const { spawn } = require('child_process');
  try {
    const allArgs = [...(args || []), romPath].filter(Boolean);
    const child = spawn(emulatorPath, allArgs, { detached: true, stdio: 'ignore' });
    child.on('exit', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('emulator-exited');
      }
    });
    child.unref();
    return { ok: true, pid: child.pid };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ── Shell ────────────────────────────────────────────────────────────────────

ipcMain.handle('shell-open-path', async (_, p) => shell.openPath(p));
ipcMain.handle('shell-open-external', async (_, url) => shell.openExternal(url));

// ── System Info ──────────────────────────────────────────────────────────────

ipcMain.handle('system-info', () => ({
  platform: process.platform,
  arch: process.arch,
  version: app.getVersion(),
  electron: process.versions.electron,
  node: process.versions.node,
  home: os.homedir(),
  appdata: app.getPath('appData'),
}));
