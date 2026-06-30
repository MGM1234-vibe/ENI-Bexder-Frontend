/* ── ENI Bexder — Settings Module ─────────────────────────────────────── */

const Settings = (() => {
  let _data = {};
  let _appDir = null;

  async function load(appDir) {
    _appDir = appDir;
    _data = await Storage.loadSettings();
    _applyToDOM();
  }

  function _applyToDOM() {
    _setVal('setting-theme',             _data.theme             || 'dark');
    _setVal('setting-live-bg',           _data.liveBg            || 'off');
    _setVal('setting-bg-color',          _data.customBg          || '#0a0a0f');
    _setVal('setting-accent-color',      _data.customAccent      || '#7c5cfc');
    _setVal('setting-text-color',        _data.customText        || '#ffffff');
    _setVal('setting-time-mode',         _data.timeMode          || 'system');
    _setVal('setting-time-format',       _data.timeFormat        || '24');
    _setVal('setting-hour',              _data.customHour        ?? 12);
    _setVal('setting-minute',            _data.customMinute      ?? 0);
    _setVal('setting-timezone',          _data.customTimezone    || '');
    _setVal('setting-language',          _data.language          || 'en');
    _setVal('setting-volume',            _data.volume            ?? 75);
    _setVal('setting-autosave',          _data.autosave          || 'off');
    _setVal('emu-window-scale',          _data.emuWindowScale    || 2);
    _setVal('emu-audio-latency',         _data.emuAudioLatency   || 64);
    _setVal('emu-frame-limit',           _data.emuFrameLimit     || 60);
    _setVal('emu-ff-speed',              _data.emuFfSpeed        || 4);
    _setVal('setting-deadzone',          _data.controllerDeadzone ?? 15);
    _setVal('setting-controller-profile',_data.controllerProfile || 'default');
    _setVal('setting-smart-launch',      _data.smartLaunchMode   || 'update-dlc-main');

    _setChecked('setting-open-last',     !!_data.openLast);
    _setChecked('setting-check-updates', _data.checkUpdates !== false);
    _setChecked('emu-fullscreen',        !!_data.emuFullscreen);
    _setChecked('emu-integer-scale',     !!_data.emuIntegerScale);
    _setChecked('emu-vsync',             _data.emuVsync !== false);
    _setChecked('emu-mute-unfocused',    !!_data.emuMuteUnfocused);
    _setChecked('emu-rewind',            !!_data.emuRewind);
    _setChecked('emu-pause-unfocused',   _data.emuPauseUnfocused !== false);

    Themes.apply(_data);
    I18n.apply(_data.language || 'en');
    Music.setVolume(_data.volume);
    Controls.setDeadzone(_data.controllerDeadzone ?? 15);
    Controls.applyProfile(_data.controllerProfile || 'default');
    App.reloadSettings(_data);
    const volDisplay = document.getElementById('volume-display');
    if (volDisplay) volDisplay.textContent = _data.volume ?? 75;
    const deadzoneDisplay = document.getElementById('deadzone-display');
    if (deadzoneDisplay) deadzoneDisplay.textContent = (_data.controllerDeadzone ?? 15) + '%';
    const bgName = document.getElementById('bg-image-name');
    if (bgName) {
      if (_data.bgImagePath) {
        const parts = _data.bgImagePath.replace(/\\/g, '/').split('/');
        bgName.textContent = parts[parts.length - 1];
      } else {
        bgName.textContent = 'None';
      }
    }
    const bgVideoName = document.getElementById('bg-video-name');
    if (bgVideoName) {
      if (_data.bgVideoPath) {
        const parts = _data.bgVideoPath.replace(/\\/g, '/').split('/');
        bgVideoName.textContent = parts[parts.length - 1];
      } else {
        bgVideoName.textContent = 'None';
      }
    }
    Themes.toggleCustomColors((_data.theme || 'dark') === 'custom');
    const customTimeFields = document.getElementById('custom-time-fields');
    if (customTimeFields) customTimeFields.classList.toggle('hidden', _data.timeMode !== 'custom');
  }

  function _setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  function _setChecked(id, val) {
    const el = document.getElementById(id);
    if (el) el.checked = val;
  }

  const ACTION_LABELS = {
    'prev':      'Previous',
    'next':      'Next',
    'up':        'Up',
    'down':      'Down',
    'confirm':   'Confirm / Launch',
    'back':      'Back / Close',
    'favorite':  'Toggle Favourite',
    'search':    'Search',
    'nav-prev':  'Nav Previous',
    'nav-next':  'Nav Next',
    'fullscreen':'Fullscreen',
  };

  const BTN_LABELS = {
    0: 'A',
    1: 'B',
    2: 'X',
    3: 'Y',
    4: 'LB',
    5: 'RB',
    9: 'Start',
    12: 'D-Pad Up',
    13: 'D-Pad Down',
    14: 'D-Pad Left',
    15: 'D-Pad Right',
  };

  function _readFromDOM() {
    const g = (id) => document.getElementById(id);
    const val = (id) => g(id)?.value ?? '';
    const chk = (id) => g(id)?.checked ?? false;

    _data = {
      bgImagePath:        _data.bgImagePath  || '',
      bgVideoPath:        _data.bgVideoPath  || '',
      theme:              val('setting-theme'),
      liveBg:             val('setting-live-bg'),
      customBg:           val('setting-bg-color'),
      customAccent:       val('setting-accent-color'),
      customText:         val('setting-text-color'),
      timeMode:           val('setting-time-mode'),
      timeFormat:         val('setting-time-format') || '24',
      customHour:         parseInt(val('setting-hour'), 10) || 12,
      customMinute:       parseInt(val('setting-minute'), 10) || 0,
      customTimezone:     val('setting-timezone'),
      language:           val('setting-language'),
      volume:             parseInt(val('setting-volume'), 10) || 75,
      openLast:           chk('setting-open-last'),
      checkUpdates:       chk('setting-check-updates'),
      autosave:           val('setting-autosave'),
      emuFullscreen:      chk('emu-fullscreen'),
      emuIntegerScale:    chk('emu-integer-scale'),
      emuVsync:           chk('emu-vsync'),
      emuWindowScale:     parseInt(val('emu-window-scale'), 10) || 2,
      emuAudioLatency:    parseInt(val('emu-audio-latency'), 10) || 64,
      emuMuteUnfocused:   chk('emu-mute-unfocused'),
      emuFrameLimit:      parseInt(val('emu-frame-limit'), 10) || 60,
      emuFfSpeed:         parseInt(val('emu-ff-speed'), 10) || 4,
      emuRewind:          chk('emu-rewind'),
      emuPauseUnfocused:  chk('emu-pause-unfocused'),
      controllerDeadzone: parseInt(document.getElementById('setting-deadzone')?.value || '15', 10),
      controllerProfile:  val('setting-controller-profile'),
      smartLaunchMode:    val('setting-smart-launch') || 'update-dlc-main',
    };
    _saveCustomMaps();
  }

  function applyCurrentSettings() {
    _readFromDOM();
    Themes.apply(_data);
    I18n.apply(_data.language || 'en');
    Music.setVolume(_data.volume);
    Controls.setDeadzone(_data.controllerDeadzone ?? 15);
    Controls.applyProfile(_data.controllerProfile || 'default');
    App.reloadSettings(_data);
    const volDisplay = document.getElementById('volume-display');
    if (volDisplay) volDisplay.textContent = _data.volume;
  }

  async function save() {
    _readFromDOM();
    await Storage.saveSettings(_data);
    Themes.apply(_data);
    I18n.apply(_data.language || 'en');
    Music.setVolume(_data.volume);
    Controls.setDeadzone(_data.controllerDeadzone ?? 15);
    Controls.applyProfile(_data.controllerProfile || 'default');
    App.reloadSettings(_data);
    App.startAutoSave(_data.autosave);
    close();
    App.showToast('Settings Saved');
  }

  async function apply() {
    applyCurrentSettings();
    const msg = document.getElementById('settings-saved-msg');
    if (msg) { msg.classList.remove('hidden'); setTimeout(() => msg.classList.add('hidden'), 1200); }
  }

  function open() {
    _applyToDOM();
    document.getElementById('settings-overlay').classList.remove('hidden');
  }

  function close() {
    document.getElementById('settings-overlay').classList.add('hidden');
  }

  const _CONSOLE_LABELS = {
    nes: 'NES', snes: 'SNES', n64: 'N64', gamecube: 'GameCube',
    wii: 'Wii', wiiu: 'Wii U', switch: 'Switch',
    gb: 'Game Boy', gbc: 'Game Boy Color', gba: 'Game Boy Advance',
    ds: 'DS', '3ds': '3DS', genesis: 'Genesis',
    dreamcast: 'Dreamcast', ps1: 'PS1', ps2: 'PS2',
    ps3: 'PS3', psp: 'PSP', psvita: 'PS Vita',
    xbox: 'Xbox', arcade: 'Arcade',
  };

  function _detectController() {
    const el = document.getElementById('detected-controller-name');
    if (!el) return;
    const gamepads = navigator.getGamepads();
    let found = null;
    for (const gp of gamepads) {
      if (gp) { found = gp; break; }
    }
    if (found) {
      el.textContent = found.id || 'Controller';
      el.classList.remove('hidden');
    } else {
      el.textContent = 'No controller detected';
      el.classList.add('hidden');
    }
  }

  async function _refreshEmuStatus() {
    const grid = document.getElementById('emu-status-grid');
    if (!grid) return;

    grid.innerHTML = '<div class="emu-status-loading">Checking…</div>';

    const consoles = EmulatorManager.getConsoleList();

    const results = await Promise.all(
      consoles.map(async ({ key, emulatorName }) => {
        const found = await EmulatorManager.getEmulatorPath(key);
        return { key, emulatorName, found: !!found };
      })
    );

    grid.innerHTML = results.map(({ key, emulatorName, found }) => `
      <div class="emu-status-row">
        <span class="emu-status-dot ${found ? 'ok' : 'missing'}"></span>
        <div class="emu-status-info">
          <span class="emu-status-console">${_CONSOLE_LABELS[key] || key.toUpperCase()}</span>
          <span class="emu-status-emu">${emulatorName}</span>
        </div>
      </div>
    `).join('');
  }

  function _setupTabSwitching() {
    const tabs = document.querySelectorAll('.settings-tab');
    const sections = document.querySelectorAll('.settings-section');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.section;
        tabs.forEach(t => t.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        tab.classList.add('active');
        document.querySelector(`.settings-section[data-section="${target}"]`)
          ?.classList.add('active');
        if (target === 'emulator') _refreshEmuStatus();
        if (target === 'controls') {
          _detectController();
          _loadCustomMaps();
          _buildKeyMapRows();
          _buildBtnMapRows();
        }
      });
    });
  }

  function init() {
    _loadCustomMaps();
    _buildKeyMapRows();
    _buildBtnMapRows();
    _setupTabSwitching();

    document.getElementById('settings-btn')?.addEventListener('click', open);
    document.getElementById('settings-close')?.addEventListener('click', close);
    document.getElementById('settings-save')?.addEventListener('click', save);
    document.getElementById('settings-apply')?.addEventListener('click', apply);
    document.getElementById('settings-cancel')?.addEventListener('click', close);

    document.getElementById('settings-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'settings-overlay') close();
    });

    // Background image picker
    document.getElementById('setting-bg-image-btn')?.addEventListener('click', async () => {
      const filePath = await window.api.dialog.openFile([
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }
      ]);
      if (!filePath) return;
      _data.bgImagePath = filePath;
      const bgName = document.getElementById('bg-image-name');
      if (bgName) {
        const parts = filePath.replace(/\\/g, '/').split('/');
        bgName.textContent = parts[parts.length - 1];
      }
      Themes.apply(_data);
    });

    document.getElementById('setting-bg-image-clear')?.addEventListener('click', () => {
      _data.bgImagePath = '';
      const bgName = document.getElementById('bg-image-name');
      if (bgName) bgName.textContent = 'None';
      Themes.apply(_data);
    });

    // Background video picker
    document.getElementById('setting-bg-video-btn')?.addEventListener('click', async () => {
      const filePath = await window.api.dialog.openFile([
        { name: 'Videos', extensions: ['mp4', 'webm', 'mov', 'mkv'] }
      ]);
      if (!filePath) return;
      _data.bgVideoPath = filePath;
      const bgVideoName = document.getElementById('bg-video-name');
      if (bgVideoName) {
        const parts = filePath.replace(/\\/g, '/').split('/');
        bgVideoName.textContent = parts[parts.length - 1];
      }
      Themes.apply(_data);
    });

    document.getElementById('setting-bg-video-clear')?.addEventListener('click', () => {
      _data.bgVideoPath = '';
      const bgVideoName = document.getElementById('bg-video-name');
      if (bgVideoName) bgVideoName.textContent = 'None';
      Themes.apply(_data);
    });

    // Theme selector
    document.getElementById('setting-theme')?.addEventListener('change', (e) => {
      Themes.toggleCustomColors(e.target.value === 'custom');
    });

    // Time mode selector
    document.getElementById('setting-time-mode')?.addEventListener('change', (e) => {
      const customFields = document.getElementById('custom-time-fields');
      if (customFields) customFields.classList.toggle('hidden', e.target.value !== 'custom');
    });

    // Volume display + live preview
    document.getElementById('setting-volume')?.addEventListener('input', (e) => {
      const d = document.getElementById('volume-display');
      if (d) d.textContent = e.target.value;
      Music.setVolume(parseInt(e.target.value, 10));
    });

    // Deadzone display
    document.getElementById('setting-deadzone')?.addEventListener('input', (e) => {
      const d = document.getElementById('deadzone-display');
      if (d) d.textContent = e.target.value + '%';
    });

    // Library buttons
    document.getElementById('open-roms-folder')?.addEventListener('click', async () => {
      await window.api.fs.openFolder(_appDir + '/roms');
    });
    document.getElementById('open-emulators-folder')?.addEventListener('click', async () => {
      await window.api.fs.openFolder(_appDir + '/emulators');
    });
    document.getElementById('open-music-folder')?.addEventListener('click', async () => {
      await window.api.fs.openFolder(_appDir + '/music');
    });
    document.getElementById('open-sfx-folder')?.addEventListener('click', async () => {
      await window.api.fs.openFolder(_appDir + '/sfx');
    });
    document.getElementById('open-roms-btn-empty')?.addEventListener('click', async () => {
      await window.api.fs.openFolder(_appDir + '/roms');
    });
    document.getElementById('reload-library-btn')?.addEventListener('click', async () => {
      await App.reloadLibrary();
      App.showToast('Library reloaded');
    });

    document.getElementById('reload-music-btn')?.addEventListener('click', async () => {
      await Music.scan(_appDir + '/music');
      if (Music.getTracks().length > 0) {
        const randomIdx = Math.floor(Math.random() * Music.getTracks().length);
        Music.play(randomIdx);
      }
      App.showToast('Music reloaded');
    });

    document.getElementById('reload-sfx-btn')?.addEventListener('click', async () => {
      Sfx.reload();
      App.showToast('SFX reloaded');
    });

    // ── Input Remap ───────────────────────────────────────────────────────
    function _buildKeyMapRows() {
      const list = document.getElementById('keymap-list');
      if (!list) return;
      list.innerHTML = '';
      const map = Controls.getKeyMap();
      for (const [code, action] of Object.entries(map)) {
        if (!ACTION_LABELS[action]) continue;
        const row = document.createElement('div');
        row.className = 'remap-row';
        const label = document.createElement('span');
        label.className = 'remap-label';
        label.textContent = ACTION_LABELS[action];
        const btn = document.createElement('button');
        btn.className = 'remap-btn';
        btn.textContent = _formatCode(code);
        btn.addEventListener('click', async () => {
          btn.classList.add('recording');
          btn.textContent = 'Press key...';
          Controls.cancelRebind();
          await new Promise(resolve => {
            Controls.startKeyRebind(action, (newCode) => {
              btn.classList.remove('recording');
              btn.textContent = _formatCode(newCode);
              _saveCustomMaps();
              resolve();
            });
          });
        });
        row.appendChild(label);
        row.appendChild(btn);
        list.appendChild(row);
      }
    }

    function _buildBtnMapRows() {
      const list = document.getElementById('btnmap-list');
      if (!list) return;
      list.innerHTML = '';
      const map = Controls.getBtnMap();
      for (const [idxStr, action] of Object.entries(map)) {
        if (!ACTION_LABELS[action]) continue;
        const idx = parseInt(idxStr, 10);
        const row = document.createElement('div');
        row.className = 'remap-row';
        const label = document.createElement('span');
        label.className = 'remap-label';
        label.textContent = ACTION_LABELS[action];
        const btn = document.createElement('button');
        btn.className = 'remap-btn';
        btn.textContent = BTN_LABELS[idx] || ('Btn ' + idx);
        btn.addEventListener('click', async () => {
          btn.classList.add('recording');
          btn.textContent = 'Press button...';
          Controls.cancelRebind();
          await new Promise(resolve => {
            Controls.startBtnRebind(action, (newIdx) => {
              btn.classList.remove('recording');
              btn.textContent = BTN_LABELS[newIdx] || ('Btn ' + newIdx);
              _saveCustomMaps();
              resolve();
            });
          });
        });
        row.appendChild(label);
        row.appendChild(btn);
        list.appendChild(row);
      }
    }

    function _formatCode(code) {
      if (code.startsWith('Arrow')) {
        const m = { Left: '←', Right: '→', Up: '↑', Down: '↓' };
        return m[code.slice(5)] || code;
      }
      if (code.startsWith('Key')) return code.slice(3);
      if (code.startsWith('Digit')) return code.slice(5);
      if (code === ' ') return 'Space';
      return code;
    }

    function _saveCustomMaps() {
      const keyMap = Controls.getKeyMap();
      const btnMap = Controls.getBtnMap();
      const defaults = {
        'ArrowLeft':'prev','ArrowRight':'next','ArrowUp':'up','ArrowDown':'down',
        'Enter':'confirm','Escape':'back','KeyF':'favorite','F11':'fullscreen',
        'KeyS':'search','KeyQ':'nav-prev','KeyE':'nav-next',
      };
      const customKeyMap = {};
      for (const [k, v] of Object.entries(keyMap)) {
        if (defaults[k] !== v) customKeyMap[k] = v;
      }
      const defaultBtnMap = {
        0:'confirm',1:'back',2:'search',3:'favorite',4:'nav-prev',5:'nav-next',
        9:'back',12:'up',13:'down',14:'prev',15:'next',
      };
      const customBtnMap = {};
      for (const [k, v] of Object.entries(btnMap)) {
        if (defaultBtnMap[k] !== v) customBtnMap[k] = v;
      }
      _data.customKeyMap = customKeyMap;
      _data.customBtnMap = customBtnMap;
    }

    function _loadCustomMaps() {
      const defaults = {
        'ArrowLeft':'prev','ArrowRight':'next','ArrowUp':'up','ArrowDown':'down',
        'Enter':'confirm','Escape':'back','KeyF':'favorite','F11':'fullscreen',
        'KeyS':'search','KeyQ':'nav-prev','KeyE':'nav-next',
      };
      const keyMap = { ...defaults, ...(_data.customKeyMap || {}) };
      Controls.setKeyMap(keyMap);

      const defaultBtnMap = {
        0:'confirm',1:'back',2:'search',3:'favorite',4:'nav-prev',5:'nav-next',
        9:'back',12:'up',13:'down',14:'prev',15:'next',
      };
      const btnMap = { ...defaultBtnMap, ...(_data.customBtnMap || {}) };
      Controls.setBtnMap(btnMap);
    }

    document.getElementById('reset-keymap-btn')?.addEventListener('click', () => {
      Controls.setKeyMap({
        'ArrowLeft':'prev','ArrowRight':'next','ArrowUp':'up','ArrowDown':'down',
        'Enter':'confirm','Escape':'back','KeyF':'favorite','F11':'fullscreen',
        'KeyS':'search','KeyQ':'nav-prev','KeyE':'nav-next',
      });
      _buildKeyMapRows();
      _saveCustomMaps();
      App.showToast('Keyboard map reset');
    });

    document.getElementById('reset-btnmap-btn')?.addEventListener('click', () => {
      Controls.setBtnMap({
        0:'confirm',1:'back',2:'search',3:'favorite',4:'nav-prev',5:'nav-next',
        9:'back',12:'up',13:'down',14:'prev',15:'next',
      });
      _buildBtnMapRows();
      _saveCustomMaps();
      App.showToast('Controller map reset');
    });

    // Emulator status refresh
    document.getElementById('emu-status-refresh')?.addEventListener('click', _refreshEmuStatus);
  }

  function getData() { return _data; }

  return { load, init, open, close, save, apply, getData, applyCurrentSettings };
})();
