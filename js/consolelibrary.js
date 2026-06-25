/* ── ENI Bexder — Console Library ─────────────────────────────────────── */

const ConsoleLibrary = (() => {

  // ── Static data ──────────────────────────────────────────────────────────

  const CONSOLE_NAMES = {
    nes: 'NES', snes: 'Super NES', n64: 'Nintendo 64',
    gamecube: 'GameCube', wii: 'Wii', wiiu: 'Wii U',
    switch: 'Nintendo Switch', gb: 'Game Boy', gbc: 'Game Boy Color',
    gba: 'Game Boy Advance', ds: 'Nintendo DS', '3ds': 'Nintendo 3DS',
    genesis: 'Sega Genesis', dreamcast: 'Dreamcast',
    ps1: 'PlayStation', ps2: 'PlayStation 2', ps3: 'PlayStation 3',
    psp: 'PSP', psvita: 'PS Vita', xbox: 'Xbox', arcade: 'Arcade',
  };

  const CONSOLE_ICONS = {
    nes: '🎮', snes: '🕹️', n64: '🕹️', gamecube: '💿', wii: '🎯', wiiu: '📺',
    switch: '🎮', gb: '📟', gbc: '🌈', gba: '📟', ds: '📱', '3ds': '📱',
    genesis: '🔵', dreamcast: '🌀', ps1: '💿', ps2: '💿', ps3: '🔵',
    psp: '📱', psvita: '📱', xbox: '🟢', arcade: '🕹️',
  };

  const CONSOLE_GRADIENTS = {
    nes:       'linear-gradient(145deg,#8B0000,#2d0a0a)',
    snes:      'linear-gradient(145deg,#5C2D91,#1a0a2e)',
    n64:       'linear-gradient(145deg,#003087,#000a1f)',
    gamecube:  'linear-gradient(145deg,#6A0DAD,#1a0030)',
    wii:       'linear-gradient(145deg,#555566,#1a1a28)',
    wiiu:      'linear-gradient(145deg,#009AC7,#002a35)',
    switch:    'linear-gradient(145deg,#E60012,#3a0005)',
    gb:        'linear-gradient(145deg,#6b7a4e,#1e221a)',
    gbc:       'linear-gradient(145deg,#9400D3,#1e0033)',
    gba:       'linear-gradient(145deg,#7B68EE,#1a1640)',
    ds:        'linear-gradient(145deg,#2a2a40,#0a0a14)',
    '3ds':     'linear-gradient(145deg,#CC0000,#2a0000)',
    genesis:   'linear-gradient(145deg,#0066CC,#001a33)',
    dreamcast: 'linear-gradient(145deg,#FF6600,#2a1400)',
    ps1:       'linear-gradient(145deg,#003087,#000a22)',
    ps2:       'linear-gradient(145deg,#000080,#00000f)',
    ps3:       'linear-gradient(145deg,#2a2a3e,#050510)',
    psp:       'linear-gradient(145deg,#003087,#000a22)',
    psvita:    'linear-gradient(145deg,#003791,#00102a)',
    xbox:      'linear-gradient(145deg,#107C10,#011501)',
    arcade:    'linear-gradient(145deg,#FF0066,#1a0010)',
  };

  // ── State ────────────────────────────────────────────────────────────────

  let _consoleMeta = {};
  let _currentConsole = null;   // key of console in game-view
  let _currentPage    = 0;

  const PAGE_SIZE = 7 * 5;     // 7 columns × 5 rows

  // ── Data helpers ─────────────────────────────────────────────────────────

  /** Returns all emulator entries (always shows full list, even with 0 games) */
  function _getEmulators() {
    const games   = Library.getAll();
    const playRec = {};
    for (const g of games) {
      const r = Library.getRecord(g.id);
      if (r.lastPlayed) {
        if (!playRec[g.console] || r.lastPlayed > playRec[g.console])
          playRec[g.console] = r.lastPlayed;
      }
    }

    const gamesByConsole = {};
    for (const g of games) {
      (gamesByConsole[g.console] = gamesByConsole[g.console] || []).push(g);
    }

    return EmulatorManager.getConsoleList().map(({ key, emulatorName }) => ({
      key,
      type:         'emulator',
      name:         (_consoleMeta[key]?.displayName) || CONSOLE_NAMES[key] || key.toUpperCase(),
      emulatorName,
      gameCount:    (gamesByConsole[key] || []).length,
      lastPlayed:   playRec[key] || null,
    }));
  }

  /** Returns user-created custom collections */
  function _getCustomCollections() {
    return Library.getCollections().map(col => ({
      key:          'col:' + col.name,
      type:         'custom',
      name:         (_consoleMeta['col:' + col.name]?.displayName) || col.name,
      originalName: col.name,
      emulatorName: 'Custom Collection',
      gameCount:    col.games?.length || 0,
      lastPlayed:   null,
    }));
  }

  // ── Open / Close ─────────────────────────────────────────────────────────

  function open() {
    const overlay = document.getElementById('console-library-overlay');
    if (!overlay) return;
    _currentConsole = null;
    _currentPage    = 0;
    overlay.classList.remove('hidden');
    _showMain();
    _renderGrid();
  }

  function close() {
    document.getElementById('console-library-overlay')?.classList.add('hidden');
    _currentConsole = null;
  }

  // ── View switching ───────────────────────────────────────────────────────

  function _showMain() {
    document.getElementById('cl-main')?.classList.remove('cl-hidden');
    document.getElementById('cl-game-view')?.classList.add('cl-hidden');
  }

  function _showGameView() {
    document.getElementById('cl-main')?.classList.add('cl-hidden');
    document.getElementById('cl-game-view')?.classList.remove('cl-hidden');
  }

  // ── Grid render ──────────────────────────────────────────────────────────

  function _renderGrid() {
    const grid = document.getElementById('cl-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const emulators = _getEmulators();
    const customs   = _getCustomCollections();

    const allItems = [...emulators, ...customs];

    if (!allItems.length) {
      grid.innerHTML = '<div class="cl-empty-msg">No emulators configured.</div>';
      return;
    }

    for (const item of allItems) {
      grid.appendChild(_buildCard(item));
    }

    // "+ New Collection" add card
    const addCard = document.createElement('div');
    addCard.className = 'cl-card cl-card-add';
    addCard.innerHTML = `
      <div class="cl-card-add-inner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <span>New Collection</span>
      </div>
    `;
    addCard.addEventListener('click', _openNewCollectionDialog);
    grid.appendChild(addCard);
  }

  function _buildCard(item) {
    const meta = _consoleMeta[item.key] || {};
    const card = document.createElement('div');
    card.className = 'cl-card' + (item.type === 'custom' ? ' cl-card-custom' : '');
    card.dataset.key = item.key;

    // Background
    const bg = meta.coverPath
      ? `url("file://${meta.coverPath}")`
      : (CONSOLE_GRADIENTS[item.key] || 'linear-gradient(145deg,#1a1a2e,#0a0a14)');
    card.style.background = bg;
    card.style.backgroundSize   = 'cover';
    card.style.backgroundPosition = 'center';

    // Accent glow
    if (meta.accentColor) {
      card.style.setProperty('--card-glow', meta.accentColor + '55');
      card.style.setProperty('--card-border', meta.accentColor);
    }

    const lastText = item.lastPlayed ? Library.formatLastPlayed(item.lastPlayed) : 'Never';
    const desc     = meta.description ? `<div class="cl-card-desc">${meta.description}</div>` : '';
    const icon     = meta.coverPath ? '' : (CONSOLE_ICONS[item.key] || '🎮');

    card.innerHTML = `
      <div class="cl-card-overlay"></div>
      <div class="cl-card-shine"></div>
      <div class="cl-card-content">
        ${icon ? `<div class="cl-card-icon">${icon}</div>` : ''}
        <div class="cl-card-info">
          <div class="cl-card-name">${item.name}</div>
          <div class="cl-card-emu">${item.emulatorName}</div>
          ${desc}
        </div>
        <div class="cl-card-footer">
          <span class="cl-card-count">${item.gameCount} game${item.gameCount !== 1 ? 's' : ''}</span>
          <span class="cl-card-last">Last: ${lastText}</span>
        </div>
      </div>
      <div class="cl-card-badge">${item.gameCount}</div>
    `;

    card.addEventListener('click', () => _openCollection(item));
    card.addEventListener('contextmenu', e => {
      e.preventDefault();
      _openCtxMenu(item, e.clientX, e.clientY);
    });

    return card;
  }

  // ── Open a collection (game grid) ────────────────────────────────────────

  function _openCollection(item) {
    _currentConsole = item.key;
    _currentPage    = 0;
    _showGameView();

    const titleEl = document.getElementById('cl-title');
    if (titleEl) titleEl.textContent = item.name;

    _renderGameGrid(item);
  }

  function _renderGameGrid(item) {
    const content = document.getElementById('cl-content');
    if (!content) return;

    let allGames;
    if (item.type === 'custom') {
      const col = Library.getCollections().find(c => c.name === item.originalName);
      const ids = col?.games || [];
      allGames  = ids.map(id => Library.getAll().find(g => g.id === id)).filter(Boolean);
    } else {
      allGames = Library.getAll().filter(g => g.console === item.key);
    }

    const totalPages = Math.max(1, Math.ceil(allGames.length / PAGE_SIZE));

    const paginEl = document.getElementById('cl-pagination');
    if (paginEl) {
      paginEl.classList.toggle('cl-hidden', totalPages <= 1);
      const label = document.getElementById('cl-page-label');
      if (label) label.textContent = `${_currentPage + 1} / ${totalPages}`;
      const prev = document.getElementById('cl-prev');
      const next = document.getElementById('cl-next');
      if (prev) prev.disabled = _currentPage === 0;
      if (next) next.disabled = _currentPage >= totalPages - 1;
    }

    const pageGames = allGames.slice(_currentPage * PAGE_SIZE, (_currentPage + 1) * PAGE_SIZE);
    const grid = document.createElement('div');
    grid.className = 'cl-game-grid';

    for (let i = 0; i < PAGE_SIZE; i++) {
      const game = pageGames[i];
      const tile = document.createElement('div');
      if (game) {
        tile.className = 'cl-game-tile';
        tile.title = game.title;
        if (game.coverPath) {
          tile.innerHTML = `<img src="file://${game.coverPath}" alt="${game.title}" loading="lazy" />`;
        } else {
          tile.innerHTML = `
            <div class="cl-tile-ph">
              <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28">
                <rect x="4" y="10" width="24" height="16" rx="2"/>
                <path d="M11 18h4m-2-2v4" fill="currentColor" stroke="none"/>
                <circle cx="21" cy="17" r="1" fill="currentColor" stroke="none"/>
                <circle cx="24" cy="20" r="1" fill="currentColor" stroke="none"/>
              </svg>
              <span>${game.consoleName || item.name}</span>
            </div>`;
        }
        tile.innerHTML += `<div class="cl-tile-overlay"><div class="cl-tile-name">${game.title}</div></div>`;
        tile.addEventListener('click', () => {
          close();
          const all = Library.filter('all');
          const idx = all.findIndex(g => g.id === game.id);
          if (idx !== -1) {
            document.querySelector('.category-tab[data-category="all"]')?.click();
            setTimeout(() => Pages.grid.selectByIndex(idx), 80);
          }
        });
        tile.addEventListener('dblclick', () => EmulatorManager.launch(game, Settings.getData()));
      } else {
        tile.className = 'cl-game-tile cl-tile-empty';
      }
      grid.appendChild(tile);
    }

    content.innerHTML = '';
    content.appendChild(grid);
  }

  // ── Context Menu ─────────────────────────────────────────────────────────

  let _ctxEl = null;

  function _openCtxMenu(item, x, y) {
    if (_ctxEl) _ctxEl.remove();
    const isCustom = item.type === 'custom';

    _ctxEl = document.createElement('div');
    _ctxEl.className = 'context-menu';
    _ctxEl.innerHTML = `
      <div class="ctx-label">Customize</div>
      <button class="ctx-item" data-a="cover">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="2" y="2" width="12" height="12" rx="2"/>
          <path d="M2 10l3-3 2 2 3-4 4 5H2z" fill="currentColor" stroke="none"/>
        </svg>Change Cover Art
      </button>
      <button class="ctx-item" data-a="color">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="8" cy="7" r="4"/><path d="M8 13v2M4 15h8" stroke-linecap="round"/>
        </svg>Change Accent Color
      </button>
      <div class="ctx-divider"></div>
      <div class="ctx-label">Edit</div>
      <button class="ctx-item" data-a="rename">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M11 2l3 3-8 8H3v-3L11 2z"/>
        </svg>Rename
      </button>
      <button class="ctx-item" data-a="desc">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M2 4h12M2 8h8M2 12h5"/>
        </svg>Edit Description
      </button>
      <div class="ctx-divider"></div>
      <button class="ctx-item" data-a="reset">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M3 8a5 5 0 1 1 1.5 3.5" stroke-linecap="round"/>
          <path d="M3 12V8h4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>Reset Customization
      </button>
      ${isCustom ? `
      <button class="ctx-item ctx-danger" data-a="delete">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M3 4h10M6 4V2h4v2M5 4l1 9h4l1-9" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>Delete Collection
      </button>` : ''}
    `;

    const vw = window.innerWidth, vh = window.innerHeight;
    const mw = 220, mh = isCustom ? 320 : 280;
    _ctxEl.style.cssText = `position:fixed;z-index:9999;
      left:${Math.min(x, vw - mw - 8)}px;
      top:${Math.min(y, vh - mh - 8)}px;`;
    document.body.appendChild(_ctxEl);

    _ctxEl.querySelectorAll('[data-a]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.a;
        _ctxEl?.remove(); _ctxEl = null;
        _handleAction(action, item);
      });
    });

    setTimeout(() => {
      document.addEventListener('click', () => { _ctxEl?.remove(); _ctxEl = null; }, { once: true });
    }, 0);
  }

  async function _handleAction(action, item) {
    const key = item.key;
    if (!_consoleMeta[key]) _consoleMeta[key] = {};

    switch (action) {
      case 'cover': {
        const fp = await window.api.dialog.openFile([
          { name: 'Images', extensions: ['png','jpg','jpeg','webp'] }
        ]);
        if (!fp) return;
        _consoleMeta[key].coverPath = fp;
        break;
      }
      case 'color': {
        const inp = document.createElement('input');
        inp.type = 'color';
        inp.value = _consoleMeta[key].accentColor || '#7c5cfc';
        inp.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
        document.body.appendChild(inp);
        inp.addEventListener('change', async () => {
          _consoleMeta[key].accentColor = inp.value;
          await _saveMeta(); _renderGrid(); inp.remove();
        });
        inp.addEventListener('blur', () => inp.remove());
        inp.click();
        return;
      }
      case 'rename': {
        const current = _consoleMeta[key]?.displayName || item.name;
        const val = prompt('Rename:', current);
        if (!val?.trim()) return;
        _consoleMeta[key].displayName = val.trim();
        break;
      }
      case 'desc': {
        const current = _consoleMeta[key]?.description || '';
        const val = prompt('Description:', current);
        if (val === null) return;
        _consoleMeta[key].description = val.trim();
        break;
      }
      case 'reset':
        delete _consoleMeta[key];
        break;
      case 'delete':
        if (!item.originalName) return;
        if (!confirm(`Delete collection "${item.originalName}"? This cannot be undone.`)) return;
        Library.removeCollection(item.originalName);
        await Storage.saveCollections({ collections: Library.getCollections() });
        delete _consoleMeta[key];
        break;
    }

    await _saveMeta();
    _renderGrid();
  }

  // ── New Collection dialog ─────────────────────────────────────────────────

  function _openNewCollectionDialog() {
    const overlay = document.getElementById('collection-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      document.getElementById('collection-name-input')?.focus();
    }
  }

  // ── Persistence ──────────────────────────────────────────────────────────

  async function _saveMeta() {
    await Storage.writeJSON(Storage.appdataPath('consolemeta.json'), _consoleMeta);
  }

  async function loadConsoleMeta() {
    _consoleMeta = await Storage.readJSON(Storage.appdataPath('consolemeta.json'), {});
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  function init() {
    document.getElementById('console-library-btn')?.addEventListener('click', open);
    document.getElementById('cl-close')?.addEventListener('click', close);
    document.getElementById('cl-game-close')?.addEventListener('click', close);
    document.getElementById('cl-new-btn')?.addEventListener('click', _openNewCollectionDialog);

    // Back to grid
    document.getElementById('cl-back')?.addEventListener('click', () => {
      _currentConsole = null;
      _showMain();
      _renderGrid();
    });

    // Pagination
    document.getElementById('cl-prev')?.addEventListener('click', () => {
      if (_currentPage > 0) {
        _currentPage--;
        const item = _findItemByKey(_currentConsole);
        if (item) _renderGameGrid(item);
      }
    });
    document.getElementById('cl-next')?.addEventListener('click', () => {
      const item = _findItemByKey(_currentConsole);
      if (!item) return;
      const games = _getGamesForItem(item);
      const total = Math.max(1, Math.ceil(games.length / PAGE_SIZE));
      if (_currentPage < total - 1) {
        _currentPage++;
        _renderGameGrid(item);
      }
    });

    // Close on backdrop click
    document.getElementById('console-library-overlay')?.addEventListener('click', e => {
      if (e.target.id === 'console-library-overlay') close();
    });

    // Keyboard
    document.addEventListener('keydown', e => {
      const ov = document.getElementById('console-library-overlay');
      if (!ov || ov.classList.contains('hidden')) return;
      if (e.key === 'Escape') {
        if (_currentConsole) { _currentConsole = null; _showMain(); _renderGrid(); }
        else close();
      }
    });

    // After creating a new collection, re-render grid
    document.getElementById('collection-create-btn')?.addEventListener('click', async () => {
      const name = document.getElementById('collection-name-input')?.value?.trim();
      if (!name) return;
      Library.addCollection(name);
      await Storage.saveCollections({ collections: Library.getCollections() });
      document.getElementById('collection-overlay')?.classList.add('hidden');
      document.getElementById('collection-name-input').value = '';
      App.showToast(`Collection "${name}" created`);
      _renderGrid();
    });
  }

  function _findItemByKey(key) {
    if (!key) return null;
    const emulators = _getEmulators();
    const customs   = _getCustomCollections();
    return [...emulators, ...customs].find(i => i.key === key) || null;
  }

  function _getGamesForItem(item) {
    if (item.type === 'custom') {
      const col = Library.getCollections().find(c => c.name === item.originalName);
      const ids = col?.games || [];
      return ids.map(id => Library.getAll().find(g => g.id === id)).filter(Boolean);
    }
    return Library.getAll().filter(g => g.console === item.key);
  }

  return { init, open, close, loadConsoleMeta };
})();
