/* ── ENI Bexder — Main Application Bootstrap ──────────────────────────── */

/* ── Nav Focus — LB/RB + Q/E cycle through nav buttons ─────────────────── */
const NavFocus = (() => {
  let _idx = -1;
  let _active = false;

  function _getEls() {
    return Array.from(document.querySelectorAll(
      '#profile-btn, .category-tab, #console-library-btn, #add-collection-btn, #home-btn, #settings-btn'
    )).filter(el => !el.disabled && el.offsetParent !== null);
  }

  function prev() {
    const els = _getEls();
    if (!els.length) return;
    _active = true;
    _idx = _idx <= 0 ? els.length - 1 : _idx - 1;
    _applyFocus(els);
  }

  function next() {
    const els = _getEls();
    if (!els.length) return;
    _active = true;
    _idx = (_idx + 1) % els.length;
    _applyFocus(els);
  }

  function activate() {
    if (!_active) return false;
    const els = _getEls();
    if (_idx >= 0 && els[_idx]) { els[_idx].click(); clear(); return true; }
    return false;
  }

  function clear() {
    _active = false; _idx = -1;
    document.querySelectorAll('.nav-focused').forEach(e => e.classList.remove('nav-focused'));
    return false;
  }

  function _applyFocus(els) {
    document.querySelectorAll('.nav-focused').forEach(e => e.classList.remove('nav-focused'));
    els[_idx]?.classList.add('nav-focused');
    els[_idx]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  document.addEventListener('keydown', (e) => {
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) clear();
  });

  return { prev, next, activate, clear };
})();

const App = (() => {
  let _appDir = null;
  let _settings = {};
  let _autoSaveTimer = null;

  // ── Toast ──────────────────────────────────────────────────────────────

  let _toastTimer = null;

  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('hidden');
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => toast.classList.add('hidden'), 2500);
  }

  // ── Clock ──────────────────────────────────────────────────────────────

  function _updateClock() {
    const timeEl = document.getElementById('clock-time');
    const ampmEl = document.getElementById('clock-ampm');
    if (!timeEl) return;

    const s = _settings;
    let d;

    if (s.timeMode === 'custom') {
      d = new Date();
      const base = new Date();
      base.setHours(s.customHour || 0);
      base.setMinutes(s.customMinute || 0);
      const diffFromBase = d - new Date(d.getFullYear(), d.getMonth(), d.getDate(),
        s.customHour || 0, s.customMinute || 0, 0);
      d = new Date(base.getTime() + diffFromBase);
    } else {
      d = new Date();
    }

    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;

    timeEl.textContent = `${h}:${m}`;
    if (ampmEl) ampmEl.textContent = ampm;
  }

  // ── Window state ──────────────────────────────────────────────────────

  function _setupWindowControls() {
    document.getElementById('btn-minimize')?.addEventListener('click', () => window.api.window.minimize());
    document.getElementById('btn-maximize')?.addEventListener('click', () => window.api.window.maximizeToggle());
    document.getElementById('btn-close')?.addEventListener('click', () => window.api.window.close());

    const _applyMaximizeIcon = (state) => {
      const icon = document.getElementById('maximize-icon');
      if (!icon) return;
      if (state === 'maximized') {
        icon.innerHTML = '<path d="M3.5 5.5h6v6h-6zM6.5 2.5h6v6h-6z" fill="none" stroke="currentColor" stroke-width="1.2"/>';
      } else {
        icon.innerHTML = '<rect x="1.5" y="1.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.2" rx="1"/>';
      }
    };

    window.api.window.onStateChanged(_applyMaximizeIcon);

    // Set correct icon for initial window state on boot
    window.api.window.getState().then(_applyMaximizeIcon).catch(() => {});

    // F11 fullscreen
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F11') { e.preventDefault(); window.api.window.fullscreenToggle(); }
    });
  }

  // ── Auto Save ─────────────────────────────────────────────────────────

  function startAutoSave(intervalSetting) {
    if (_autoSaveTimer) { clearInterval(_autoSaveTimer); _autoSaveTimer = null; }
    const minutes = Number(intervalSetting);
    if (!minutes || isNaN(minutes)) return;
    _autoSaveTimer = setInterval(async () => {
      await Storage.savePlayData(Library.getPlayData());
      console.log('[AutoSave] Play data saved at', new Date().toLocaleTimeString());
    }, minutes * 60 * 1000);
  }

  // ── Library Reload ────────────────────────────────────────────────────

  async function reloadLibrary() {
    await Library.scan(_appDir);
    Pages.switchCategory('all');
    Pages.renderCollectionTabs();
  }

  // ── Boot ──────────────────────────────────────────────────────────────

  async function boot() {
    // 1. Init storage
    await Storage.init();
    _appDir = await window.api.app.getDir();

    // 2. Load settings
    _settings = await Storage.loadSettings();

    // 3. Apply theme + language immediately
    Themes.apply(_settings);
    I18n.apply(_settings.language || 'en');
    Music.setVolume(_settings.volume ?? 75);

    // 3b. Init SFX (loads custom files from assets/sounds/)
    Sfx.setEnabled(_settings.sfxEnabled !== false);
    Sfx.setVolume((_settings.sfxVolume ?? 60) / 100);
    Sfx.init();

    // 4. Window controls
    _setupWindowControls();

    // 5. Init modules
    EmulatorManager.init(_appDir);

    // 6. Load profile
    await Profile.load();
    Profile.init();

    // 7. Load play data + collections
    const playData = await Storage.loadPlayData();
    Library.loadPlayData(playData);
    const collections = await Storage.loadCollections();
    Library.loadCollections(collections);

    // 8. Scan ROM library
    await Library.scan(_appDir);

    // 8b. Apply saved game metadata (must be after scan so _games exist)
    const gameMeta = await Storage.loadGameMeta();
    Library.loadGameMeta(gameMeta);

    // 9. Init pages + render
    Pages.init();
    Pages.renderCollectionTabs();
    Pages.switchCategory('all');

    // 10. Init music
    await Music.scan(_appDir + '/music');
    NowPlaying.init();
    Music.startIfNotPlaying();

    // 11. Init settings UI
    await Settings.load(_appDir);
    Settings.init();

    // 12. Init controls
    Controls.init();
    Controls.setDeadzone(_settings.controllerDeadzone ?? 15);
    Controls.applyProfile(_settings.controllerProfile || 'default');

    // 12b. Console Library
    await ConsoleLibrary.loadConsoleMeta();
    ConsoleLibrary.init();

    // 13. Updater + Auto Save
    Updater.runIfEnabled(_settings);
    startAutoSave(_settings.autosave);

    // 14. Clock
    _updateClock();
    setInterval(_updateClock, 10000);

    // 15. If open last setting is enabled, try to select last played
    if (_settings.openLast) {
      const playDataRec = await Storage.loadPlayData();
      const records = playDataRec.records || {};
      let latestId = null, latestDate = 0;
      for (const [id, rec] of Object.entries(records)) {
        if (rec.lastPlayed) {
          const t = new Date(rec.lastPlayed).getTime();
          if (t > latestDate) { latestDate = t; latestId = id; }
        }
      }
      if (latestId) {
        const allGames = Library.filter('all');
        const idx = allGames.findIndex(g => g.id === latestId);
        if (idx !== -1) {
          setTimeout(() => Pages.switchCategory('all'), 200);
        }
      }
    }

    console.log('[ENI Bexder] Booted successfully.');
  }

  // ── Entry Point ───────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {
    boot().catch(err => {
      console.error('[ENI Bexder] Boot error:', err);
      document.body.innerHTML = `<div style="color:#fff;padding:40px;font-family:sans-serif;">
        <h1 style="color:#e05c5c">Boot Error</h1>
        <pre style="font-size:13px;color:#aaa">${err?.stack || err}</pre>
      </div>`;
    });
  });

  return { showToast, reloadLibrary, startAutoSave, getSettings: () => _settings, getAppDir: () => _appDir };
})();
