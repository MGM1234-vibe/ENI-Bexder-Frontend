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
    const s = _data;
    // Background image label
    const bgName = document.getElementById('bg-image-name');
    if (bgName) {
      if (s.bgImagePath) {
        const parts = s.bgImagePath.replace(/\\/g, '/').split('/');
        bgName.textContent = parts[parts.length - 1];
      } else {
        bgName.textContent = 'None';
      }
    }

    // Background video label
    const bgVideoName = document.getElementById('bg-video-name');
    if (bgVideoName) {
      if (s.bgVideoPath) {
        const parts = s.bgVideoPath.replace(/\\/g, '/').split('/');
        bgVideoName.textContent = parts[parts.length - 1];
      } else {
        bgVideoName.textContent = 'None';
      }
    }

    _setVal('setting-theme',             s.theme             || 'dark');
    _setVal('setting-live-bg',           s.liveBg            || 'off');
    _setVal('setting-bg-color',          s.customBg          || '#0a0a0f');
    _setVal('setting-accent-color',      s.customAccent      || '#7c5cfc');
    _setVal('setting-text-color',        s.customText        || '#ffffff');
    _setVal('setting-time-mode',         s.timeMode          || 'system');
    _setVal('setting-hour',              s.customHour        ?? 12);
    _setVal('setting-minute',            s.customMinute      ?? 0);
    _setVal('setting-timezone',          s.customTimezone    || '');
    _setVal('setting-language',          s.language          || 'en');
    _setVal('setting-volume',            s.volume            ?? 75);
    _setVal('setting-autosave',          s.autosave          || 'off');
    _setVal('emu-window-scale',          s.emuWindowScale    || 2);
    _setVal('emu-audio-latency',         s.emuAudioLatency   || 64);
    _setVal('emu-frame-limit',           s.emuFrameLimit     || 60);
    _setVal('emu-ff-speed',              s.emuFfSpeed        || 4);
    _setVal('setting-deadzone',          s.controllerDeadzone ?? 15);
    _setVal('setting-controller-profile',s.controllerProfile || 'default');

    _setChecked('setting-open-last',     !!s.openLast);
    _setChecked('setting-check-updates', s.checkUpdates !== false);
    _setChecked('emu-fullscreen',        !!s.emuFullscreen);
    _setChecked('emu-integer-scale',     !!s.emuIntegerScale);
    _setChecked('emu-vsync',             s.emuVsync !== false);
    _setChecked('emu-mute-unfocused',    !!s.emuMuteUnfocused);
    _setChecked('emu-rewind',            !!s.emuRewind);
    _setChecked('emu-pause-unfocused',   s.emuPauseUnfocused !== false);

    const volDisplay = document.getElementById('volume-display');
    if (volDisplay) volDisplay.textContent = s.volume ?? 75;

    const deadzoneDisplay = document.getElementById('deadzone-display');
    if (deadzoneDisplay) deadzoneDisplay.textContent = (s.controllerDeadzone ?? 15) + '%';

    Themes.toggleCustomColors((s.theme || 'dark') === 'custom');
    const customTimeFields = document.getElementById('custom-time-fields');
    if (customTimeFields) customTimeFields.classList.toggle('hidden', s.timeMode !== 'custom');
  }

  function _setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  function _setChecked(id, val) {
    const el = document.getElementById(id);
    if (el) el.checked = val;
  }

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
    };
  }

  function applyCurrentSettings() {
    _readFromDOM();
    Themes.apply(_data);
    I18n.apply(_data.language || 'en');
    Music.setVolume(_data.volume);
    Controls.setDeadzone(_data.controllerDeadzone ?? 15);
    Controls.applyProfile(_data.controllerProfile || 'default');
    App.startAutoSave(_data.autosave);
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
    App.startAutoSave(_data.autosave);
    close();
    App.showToast('Settings Saved');
  }

  async function apply() {
    applyCurrentSettings();
    const msg = document.getElementById('settings-saved-msg');
    if (msg) {
      msg.classList.remove('hidden');
      setTimeout(() => msg.classList.add('hidden'), 2000);
    }
  }

  function open() {
    _applyToDOM();
    document.getElementById('settings-overlay').classList.remove('hidden');
  }

  function close() {
    document.getElementById('settings-overlay').classList.add('hidden');
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
      });
    });
  }

  function init() {
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

    // Volume display
    document.getElementById('setting-volume')?.addEventListener('input', (e) => {
      const d = document.getElementById('volume-display');
      if (d) d.textContent = e.target.value;
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
    document.getElementById('open-roms-btn-empty')?.addEventListener('click', async () => {
      await window.api.fs.openFolder(_appDir + '/roms');
    });
    document.getElementById('reload-library-btn')?.addEventListener('click', async () => {
      await App.reloadLibrary();
      App.showToast('Library reloaded');
    });

    // Cover art scraper
    document.getElementById('fetch-covers-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('fetch-covers-btn');
      const status = document.getElementById('cover-scrape-status');
      if (!btn || !status) return;

      btn.disabled = true;
      btn.textContent = 'Fetching…';
      status.classList.remove('hidden');
      status.textContent = 'Starting…';

      const { found, total } = await CoverScraper.scrapeAll(_appDir, (i, t, title) => {
        status.textContent = `(${i}/${t}) ${title}`;
      });

      btn.disabled = false;
      btn.textContent = 'Fetch Covers';
      status.textContent = total === 0
        ? 'All games already have covers.'
        : `Done — found ${found} of ${total} covers.`;

      if (found > 0) {
        App.showToast(`${found} cover${found !== 1 ? 's' : ''} downloaded`);
        Pages.renderCurrentPage();
      }
    });
  }

  function getData() { return _data; }

  return { load, init, open, close, save, apply, getData, applyCurrentSettings };
})();
