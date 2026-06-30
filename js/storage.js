/* ── ENI Bexder — Storage Module ──────────────────────────────────────── */
/* Handles reading/writing JSON to %APPDATA%/ENIBexder/ via Electron IPC.   */

const Storage = (() => {
  let _appdataRoot = null;
  let _appDir = null;

  async function init() {
    _appdataRoot = await window.api.appdata.getRoot();
    _appDir = await window.api.app.getDir();
  }

  function appdataPath(...parts) {
    return [_appdataRoot, ...parts].join('/');
  }

  function appPath(...parts) {
    return [_appDir, ...parts].join('/');
  }

  async function readJSON(filePath, fallback = {}) {
    const result = await window.api.fs.readFile(filePath);
    if (!result.ok) return fallback;
    try { return JSON.parse(result.data); }
    catch { return fallback; }
  }

  async function writeJSON(filePath, data) {
    return window.api.fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  async function loadSettings() {
    return readJSON(appdataPath('settings.json'), {
      bgImagePath: '',
      bgVideoPath: '',
      theme: 'dark',
      liveBg: 'off',
      customBg: '#0a0a0f',
      customAccent: '#7c5cfc',
      customText: '#ffffff',
      timeMode: 'system',
      timeFormat: '24',
      customHour: 12,
      customMinute: 0,
      customTimezone: 'UTC',
      language: 'en',
      volume: 75,
      openLast: false,
      checkUpdates: true,
      autosave: 'off',
      emuFullscreen: false,
      emuIntegerScale: false,
      emuVsync: true,
      emuWindowScale: 2,
      emuAudioLatency: 64,
      emuMuteUnfocused: false,
      emuFrameLimit: 60,
      emuFfSpeed: 4,
      emuRewind: false,
      emuPauseUnfocused: true,
      controllerDeadzone: 15,
      controllerProfile: 'default',
      sfxEnabled: true,
      sfxVolume: 60,
      customKeyMap: {},
      customBtnMap: {},
    });
  }

  async function saveSettings(data) {
    return writeJSON(appdataPath('settings.json'), data);
  }

  async function loadProfile() {
    return readJSON(appdataPath('profiles', 'default.json'), {
      username: 'Player',
      birthday: '',
      bio: '',
      youtube: '',
      discord: '',
      twitch: '',
      instagram: '',
      avatarPath: '',
    });
  }

  async function saveProfile(data) {
    return writeJSON(appdataPath('profiles', 'default.json'), data);
  }

  async function loadLibraryData() {
    return readJSON(appdataPath('cache', 'library.json'), {
      games: [],
      lastSelected: null,
    });
  }

  async function saveLibraryData(data) {
    return writeJSON(appdataPath('cache', 'library.json'), data);
  }

  async function loadCollections() {
    return readJSON(appdataPath('cache', 'collections.json'), { collections: [] });
  }

  async function saveCollections(data) {
    return writeJSON(appdataPath('cache', 'collections.json'), data);
  }

  async function loadPlayData() {
    return readJSON(appdataPath('cache', 'playdata.json'), { records: {} });
  }

  async function savePlayData(data) {
    return writeJSON(appdataPath('cache', 'playdata.json'), data);
  }

  async function loadGameMeta() {
    return readJSON(appdataPath('cache', 'gamemeta.json'), { meta: {} });
  }

  async function saveGameMeta(data) {
    return writeJSON(appdataPath('cache', 'gamemeta.json'), data);
  }

  async function loadTileLayout() {
    return readJSON(appdataPath('cache', 'tilelayout.json'), {
      tileSizes: {},
      customTiles: [],
    });
  }

  async function saveTileLayout(data) {
    return writeJSON(appdataPath('cache', 'tilelayout.json'), data);
  }

  return {
    init,
    appdataPath,
    appPath,
    readJSON,
    writeJSON,
    loadSettings,
    saveSettings,
    loadProfile,
    saveProfile,
    loadLibraryData,
    saveLibraryData,
    loadCollections,
    saveCollections,
    loadPlayData,
    savePlayData,
    loadGameMeta,
    saveGameMeta,
    loadTileLayout,
    saveTileLayout,
  };
})();
