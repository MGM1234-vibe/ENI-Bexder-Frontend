const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximizeToggle: () => ipcRenderer.invoke('window-maximize-toggle'),
    close: () => ipcRenderer.invoke('window-close'),
    fullscreenToggle: () => ipcRenderer.invoke('window-fullscreen-toggle'),
    getState: () => ipcRenderer.invoke('window-get-state'),
    onStateChanged: (cb) => ipcRenderer.on('window-state-changed', (_, state) => cb(state)),
  },

  // Filesystem
  fs: {
    readFile: (p) => ipcRenderer.invoke('fs-read-file', p),
    writeFile: (p, c) => ipcRenderer.invoke('fs-write-file', p, c),
    writeBinary: (p, b64) => ipcRenderer.invoke('fs-write-binary', p, b64),
    readDir: (p) => ipcRenderer.invoke('fs-read-dir', p),
    exists: (p) => ipcRenderer.invoke('fs-exists', p),
    openFolder: (p) => ipcRenderer.invoke('fs-open-folder', p),
  },

  // Dialogs
  dialog: {
    openFolder: () => ipcRenderer.invoke('dialog-open-folder'),
    openFile: (filters) => ipcRenderer.invoke('dialog-open-file', filters),
  },

  // AppData
  appdata: {
    getPaths: () => ipcRenderer.invoke('appdata-get-paths'),
    getRoot: () => ipcRenderer.invoke('appdata-get-root'),
  },

  // App directory
  app: {
    getDir: () => ipcRenderer.invoke('app-get-dir'),
  },

  // Emulator
  emulator: {
    launch: (emulatorPath, romPath, args) =>
      ipcRenderer.invoke('emulator-launch', emulatorPath, romPath, args),
    onExited: (cb) => ipcRenderer.on('emulator-exited', cb),
  },

  // Shell
  shell: {
    openPath: (p) => ipcRenderer.invoke('shell-open-path', p),
    openExternal: (url) => ipcRenderer.invoke('shell-open-external', url),
  },

  // System info
  system: {
    info: () => ipcRenderer.invoke('system-info'),
  },
});
