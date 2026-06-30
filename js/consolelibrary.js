/* ── ENI Bexder — Console Library ─────────────────────────────────────── */

const ConsoleLibrary = (() => {

  // ── Static data ──────────────────────────────────────────────────────────

  const CONSOLE_NAMES = {
    nes: 'NES', snes: 'SNES', n64: 'Nintendo 64',
    gamecube: 'GameCube', wii: 'Wii', wiiu: 'Wii U',
    switch: 'Nintendo Switch', gb: 'Game Boy', gbc: 'Game Boy Color',
    gba: 'Game Boy Advance', ds: 'Nintendo DS', '3ds': 'Nintendo 3DS',
    genesis: 'Sega Genesis', dreamcast: 'Dreamcast',
    ps1: 'PlayStation', ps2: 'PlayStation 2', ps3: 'PlayStation 3',
    psp: 'PSP', psvita: 'PS Vita', xbox: 'Xbox', arcade: 'Arcade',
  };

  const CONSOLE_ICONS = {
    nes:       '🎮', snes:      '🕹️', n64:       '🎯',
    gamecube:  '💿', wii:       '🏓', wiiu:      '📺',
    switch:    '⚡', gb:        '🔋', gbc:       '🌈',
    gba:       '🔆', ds:        '📡', '3ds':     '🔺',
    genesis:   '⚡', dreamcast: '🌀',
    ps1:       '🔷', ps2:      '🔵', ps3:       '🔲',
    psp:       '🎲', psvita:    '💎',
    xbox:      '🟢', arcade:    '👾',
  };

  const CONSOLE_GRADIENTS = {
    'nintendo-dolphin': 'linear-gradient(145deg,#6A0DAD,#2d0030)',
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

  // ── Custom icon support ───────────────────────────────────────────────────
  // Populated by _loadCollectionIcons() from assets/collection-icons/

  let _availableIcons = []; // Array of { name, path, url }

  async function _loadCollectionIcons() {
    try {
      const appDir = await window.api.app.getDir();
      const iconDir = `${appDir}/assets/collection-icons`.replace(/\\/g, '/');
      const result = await window.api.fs.readDir(iconDir);
      // readDir returns { ok, files } — not a plain array
      const entries = result?.files || result;
      if (!Array.isArray(entries)) return;

      _availableIcons = entries
        .filter(e => /\.(png|jpg|jpeg|svg|webp|gif)$/i.test(e.name || e))
        .map(e => {
          const name = e.name || e;
          const filePath = `${iconDir}/${name}`;
          return {
            name: name.replace(/\.[^.]+$/, ''), // Strip extension for display
            path: filePath,
            url: _fileUrl(filePath),
          };
        });

      console.log(`[ConsoleLibrary] Loaded ${_availableIcons.length} collection icons`);
    } catch (e) {
      console.warn('[ConsoleLibrary] Could not load collection icons:', e.message);
      _availableIcons = [];
    }
  }

  // ── State ────────────────────────────────────────────────────────────────

  let _consoleMeta = {};
  let _currentConsole = null;
  let _currentItem = null;
  let _currentPage = 0;
  let _editItem = null;
  let _editTempCoverPath = undefined; // undefined = unchanged, null = cleared

  const PAGE_SIZE = 7 * 5;

  // ── Path helpers ─────────────────────────────────────────────────────────

  function _fileUrl(p) {
    if (!p) return '';
    const normalized = p.replace(/\\/g, '/');
    const base = normalized.startsWith('/') ? normalized : '/' + normalized;
    return 'file://' + base
      .replace(/ /g,  '%20')
      .replace(/#/g,  '%23')
      .replace(/\?/g, '%3F');
  }

  // ── Data helpers ─────────────────────────────────────────────────────────

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

    const mergedMap = {};
    const rawList = EmulatorManager.getConsoleList();
    for (const { key, emulatorName } of rawList) {
      if (key === 'wii') continue;
      if (key === 'gamecube') {
        const gcCount  = (gamesByConsole['gamecube'] || []).length;
        const wiiCount = (gamesByConsole['wii']      || []).length;
        const combinedKey = 'nintendo-dolphin';
        mergedMap[combinedKey] = {
          key: combinedKey,
          type: 'emulator',
          name: (_consoleMeta[combinedKey]?.displayName) || 'GameCube / Wii',
          emulatorName: 'Dolphin',
          gameCount: gcCount + wiiCount,
          lastPlayed: _latestDate(playRec['gamecube'], playRec['wii']),
          _subConsoles: ['gamecube', 'wii'],
        };
      } else {
        mergedMap[key] = {
          key,
          type: 'emulator',
          name: (_consoleMeta[key]?.displayName) || CONSOLE_NAMES[key] || key.toUpperCase(),
          emulatorName,
          gameCount: (gamesByConsole[key] || []).length,
          lastPlayed: playRec[key] || null,
        };
      }
    }

    return Object.values(mergedMap);
  }

  function _latestDate(...dates) {
    const valid = dates.filter(Boolean).sort().reverse();
    return valid.length ? valid[0] : null;
  }

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
    document.getElementById('main-content')?.classList.add('collections-open');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    _currentConsole = null;
    _currentPage    = 0;
    _showMain();
    _renderGrid();
  }

  function close() {
    document.getElementById('console-library-overlay')?.classList.add('hidden');
    document.getElementById('main-content')?.classList.remove('collections-open');
    _currentConsole = null;
    _currentItem = null;
  }

  function _showMain() {
    document.getElementById('cl-main')?.classList.remove('cl-hidden');
    document.getElementById('cl-game-view')?.classList.add('cl-hidden');
    _currentConsole = null;
    _currentItem = null;
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
    const allItems  = [...emulators, ...customs];

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

    // Background — cover image or gradient
    if (meta.coverPath) {
      card.style.backgroundImage    = `url("${_fileUrl(meta.coverPath)}")`;
      card.style.backgroundSize     = 'cover';
      card.style.backgroundPosition = 'center';
      card.style.backgroundRepeat   = 'no-repeat';
    } else {
      card.style.background = CONSOLE_GRADIENTS[item.key] || 'linear-gradient(145deg,#1a1a2e,#0a0a14)';
    }

    // Accent glow
    if (meta.accentColor) {
      card.style.setProperty('--card-glow', meta.accentColor + '55');
      card.style.setProperty('--card-border', meta.accentColor);
    }

    const lastText = item.lastPlayed ? Library.formatLastPlayed(item.lastPlayed) : 'Never';
    const desc     = meta.description ? `<div class="cl-card-desc">${meta.description}</div>` : '';

    // Icon: custom image icon > emoji > default
    let iconHtml = '';
    if (meta.iconPath) {
      iconHtml = `<div class="cl-card-icon cl-card-icon-img"><img src="${_fileUrl(meta.iconPath)}" alt="" /></div>`;
    } else if (!meta.coverPath) {
      const emoji = CONSOLE_ICONS[item.key] || '🎮';
      iconHtml = `<div class="cl-card-icon">${emoji}</div>`;
    }

    card.innerHTML = `
      <button class="cl-card-edit-btn" title="Edit collection" aria-label="Edit collection">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 2l3 3-8 8H3v-3L11 2z"/>
        </svg>
      </button>
      <div class="cl-card-overlay"></div>
      <div class="cl-card-shine"></div>
      <div class="cl-card-content">
        ${iconHtml}
        <div class="cl-card-info">
          <div class="cl-card-name">${item.name}</div>
          ${desc}
        </div>
        <div class="cl-card-footer">
          <span class="cl-card-count">${item.gameCount} game${item.gameCount !== 1 ? 's' : ''}</span>
          <span class="cl-card-last">Last: ${lastText}</span>
        </div>
      </div>
      <div class="cl-card-badge">${item.gameCount}</div>
    `;

    card.querySelector('.cl-card-edit-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      _openEditModal(item);
    });

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
    _currentItem = item;
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
    } else if (item._subConsoles) {
      allGames = [];
      for (const subKey of item._subConsoles) {
        allGames.push(...Library.getAll().filter(g => g.console === subKey));
      }
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
        const coverUrl = game.coverPath ? _fileUrl(game.coverPath) : '';
        if (coverUrl) {
          tile.innerHTML = `<img src="${coverUrl}" alt="${game.title}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><div class="cl-tile-ph" style="display:none;"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28"><rect x="4" y="10" width="24" height="16" rx="2"/><path d="M11 18h4m-2-2v4" fill="currentColor" stroke="none"/><circle cx="21" cy="17" r="1" fill="currentColor" stroke="none"/><circle cx="24" cy="20" r="1" fill="currentColor" stroke="none"/></svg><span>${game.consoleName || item.name}</span></div>`;
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
        tile.addEventListener('click', () => EmulatorManager.launch(game, Settings.getData()));
        tile.addEventListener('dblclick', () => EmulatorManager.launch(game, Settings.getData()));
        tile.addEventListener('contextmenu', e => {
          e.preventDefault();
          _openGameContextMenu(game, item, e.clientX, e.clientY);
        });
      } else {
        tile.className = 'cl-game-tile cl-tile-empty';
      }
      grid.appendChild(tile);
    }

    content.innerHTML = '';
    content.appendChild(grid);
  }

  // ── Game Context Menu (right-click on game tiles inside a collection) ────

  let _ctxGameEl = null;
  let _ctxGameData = null;

  function _openGameContextMenu(game, collectionItem, x, y) {
    _closeGameContextMenu();
    const isCustom = collectionItem.type === 'custom';

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.innerHTML = `
      <div class="ctx-label">${game.title}</div>
      <button class="ctx-item" data-a="launch">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="4,2 14,8 4,14" fill="currentColor" stroke="none"/><path d="M4 2l10 6-10 6V2z"/></svg>
        Launch
      </button>
      <button class="ctx-item" data-a="favorite">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2l1.8 3.6L14 6.3l-3 2.9.7 4.1L8 11.3l-3.7 2 .7-4.1-3-2.9 4.2-.7z"/></svg>
        Toggle Favourite
      </button>
      <button class="ctx-item" data-a="add-to-collection">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="12" height="4" rx="1"/><rect x="2" y="9" width="12" height="4" rx="1"/><path d="M8 6v3"/></svg>
        Add to Collection
      </button>
      <button class="ctx-item" data-a="edit-details">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 2l3 3-8 8H3v-3L11 2z"/></svg>
        Edit Details
      </button>
      <button class="ctx-item" data-a="open-location">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4h5l2 2h5v8H2z"/></svg>
        Open File Location
      </button>
      ${isCustom ? `
      <div class="ctx-divider"></div>
      <button class="ctx-item ctx-danger" data-a="remove-from-collection">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>
        Remove from Collection
      </button>` : ''}
    `;

    const vw = window.innerWidth, vh = window.innerHeight;
    const mw = 230, mh = isCustom ? 320 : 280;
    menu.style.cssText = `position:fixed;z-index:9999;
      left:${Math.min(x, vw - mw - 8)}px;
      top:${Math.min(y, vh - mh - 8)}px;`;
    document.body.appendChild(menu);

    _ctxGameEl = menu;
    _ctxGameData = { game, collectionItem };

    menu.querySelectorAll('[data-a]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.a;
        _closeGameContextMenu();
        _handleGameContextAction(action, game, collectionItem);
      });
    });

    setTimeout(() => {
      document.addEventListener('click', _closeGameContextMenu, { once: true });
    }, 0);
  }

  function _closeGameContextMenu() {
    if (_ctxGameEl) { _ctxGameEl.remove(); _ctxGameEl = null; }
    _ctxGameData = null;
  }

  async function _handleGameContextAction(action, game, collectionItem) {
    switch (action) {
      case 'launch':
        EmulatorManager.launch(game, Settings.getData());
        break;

      case 'favorite': {
        const isFav = Library.toggleFavorite(game.id);
        await Storage.savePlayData(Library.getPlayData());
        App.showToast(isFav ? '♥ Added to Favorites' : 'Removed from Favorites');
        break;
      }

      case 'add-to-collection': {
        const cols = Library.getCollections();
        if (!cols.length) {
          App.showToast('No collections yet — create one in Browse mode');
          break;
        }
        const list = document.createElement('div');
        list.className = 'ctx-col-picker-list';
        list.innerHTML = cols.map(c => {
          const inCol = c.games && c.games.includes(game.id);
          return `<button class="ctx-col-item${inCol ? ' in-col' : ''}" data-name="${c.name}">${inCol ? '✓ ' : ''}${c.name}</button>`;
        }).join('');
        const menu = _ctxGameEl;
        if (!menu) break;
        const existing = menu.querySelector('.ctx-col-picker-list');
        if (existing) existing.remove();
        const wrap = document.createElement('div');
        wrap.className = 'ctx-col-picker-list';
        cols.forEach(c => {
          const inCol = c.games && c.games.includes(game.id);
          const btn = document.createElement('button');
          btn.className = 'ctx-col-item' + (inCol ? ' in-col' : '');
          btn.textContent = (inCol ? '✓ ' : '') + c.name;
          btn.addEventListener('click', async () => {
            if (!c.games) c.games = [];
            if (inCol) c.games = c.games.filter(id => id !== game.id);
            else c.games.push(game.id);
            await Storage.saveCollections({ collections: Library.getCollections() });
            App.showToast(inCol ? `Removed from ${c.name}` : `Added to ${c.name}`);
            _closeGameContextMenu();
          });
          wrap.appendChild(btn);
        });
        const divider = menu.querySelector('.ctx-divider:last-of-type') || menu;
        divider.insertAdjacentElement('afterend', wrap);
        break;
      }

      case 'edit-details':
        if (Pages.openEditDetails) {
          Pages.openEditDetails(game);
        }
        break;

      case 'open-location': {
        const dir = game.path.replace(/[/\\][^/\\]+$/, '');
        try { await window.api.fs.openFolder(dir); } catch {}
        break;
      }

      case 'remove-from-collection': {
        if (collectionItem.type !== 'custom') return;
        const col = Library.getCollections().find(c => c.name === collectionItem.originalName);
        if (!col) return;
        col.games = (col.games || []).filter(id => id !== game.id);
        await Storage.saveCollections({ collections: Library.getCollections() });
        App.showToast(`Removed "${game.title}" from collection`);
        _renderGameGrid(collectionItem);
        break;
      }
    }
  }

  // ── Context Menu ─────────────────────────────────────────────────────────

  let _ctxEl = null;

  function _openCtxMenu(item, x, y) {
    if (_ctxEl) _ctxEl.remove();
    const isCustom = item.type === 'custom';
    const hasIcons = _availableIcons.length > 0;

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
      ${hasIcons ? `<button class="ctx-item" data-a="icon">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="8" cy="8" r="5"/><path d="M8 5v3l2 1" stroke-linecap="round"/>
        </svg>Choose Icon
      </button>` : ''}
      <button class="ctx-item" data-a="color">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="8" cy="7" r="4"/><path d="M8 13v2M4 15h8" stroke-linecap="round"/>
        </svg>Change Accent Color
      </button>
      <div class="ctx-divider"></div>
      <div class="ctx-label">Edit</div>
      <button class="ctx-item" data-a="edit">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M11 2l3 3-8 8H3v-3L11 2z"/>
        </svg>Edit Collection
      </button>
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
    const mw = 230, mh = (isCustom ? 340 : 300) + (hasIcons ? 34 : 0);
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

  // ── Collection Edit Modal ────────────────────────────────────────────────

  function _refreshEditCoverPreview() {
    const preview = document.getElementById('cl-edit-cover-preview');
    if (!preview) return;
    const meta = _editItem ? (_consoleMeta[_editItem.key] || {}) : {};
    const coverPath = _editTempCoverPath !== undefined ? _editTempCoverPath : meta.coverPath;
    if (coverPath) {
      preview.innerHTML = `<img src="${_fileUrl(coverPath)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:6px;" />`;
    } else {
      preview.innerHTML = `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48"><rect x="8" y="20" width="48" height="32" rx="4"/><path d="M22 36h8m-4-4v8" fill="currentColor" stroke="none"/></svg>`;
    }
  }

  function _openEditModal(item, focusField) {
    _editItem = item;
    const meta = _consoleMeta[item.key] || {};
    _editTempCoverPath = undefined;

    const titleEl = document.getElementById('cl-edit-title');
    if (titleEl) titleEl.textContent = `Edit: ${item.name}`;

    const nameInput = document.getElementById('cl-edit-name-input');
    const descInput = document.getElementById('cl-edit-desc-input');
    if (nameInput) nameInput.value = meta.displayName || item.name;
    if (descInput) descInput.value = meta.description || '';

    _refreshEditCoverPreview();
    document.getElementById('cl-edit-overlay')?.classList.remove('hidden');

    if (focusField === 'desc' && descInput) descInput.focus();
    else if (focusField === 'name' && nameInput) nameInput.focus();
  }

  function _closeEditModal() {
    document.getElementById('cl-edit-overlay')?.classList.add('hidden');
    _editItem = null;
    _editTempCoverPath = undefined;
  }

  async function _saveEditModal() {
    if (!_editItem) return;
    const key = _editItem.key;
    if (!_consoleMeta[key]) _consoleMeta[key] = {};

    const name = document.getElementById('cl-edit-name-input')?.value.trim();
    const desc = document.getElementById('cl-edit-desc-input')?.value.trim() || '';

    if (name) _consoleMeta[key].displayName = name;
    else delete _consoleMeta[key].displayName;

    if (desc) _consoleMeta[key].description = desc;
    else delete _consoleMeta[key].description;

    if (_editTempCoverPath !== undefined) {
      if (_editTempCoverPath) _consoleMeta[key].coverPath = _editTempCoverPath;
      else delete _consoleMeta[key].coverPath;
    }

    await _saveMeta();
    _closeEditModal();
    _renderGrid();
    App.showToast('Collection updated');
  }

  // ── Icon Picker ───────────────────────────────────────────────────────────

  function _openIconPicker(item) {
    // Remove any existing picker
    document.getElementById('cl-icon-picker')?.remove();

    const picker = document.createElement('div');
    picker.id = 'cl-icon-picker';
    picker.className = 'cl-icon-picker-overlay';
    picker.innerHTML = `
      <div class="cl-icon-picker-panel glass-panel">
        <div class="cl-icon-picker-header">
          <span>Choose Collection Icon</span>
          <button class="modal-close" id="cl-icon-picker-close">✕</button>
        </div>
        <div class="cl-icon-picker-grid">
          ${_availableIcons.map(icon => `
            <div class="cl-icon-option" data-path="${icon.path}" title="${icon.name}">
              <img src="${icon.url}" alt="${icon.name}" />
              <span>${icon.name}</span>
            </div>
          `).join('')}
        </div>
        <div class="cl-icon-picker-footer">
          <button class="btn-ghost btn-sm" id="cl-icon-picker-clear">Remove Icon</button>
          <button class="btn-secondary btn-sm" id="cl-icon-picker-close2">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(picker);

    const close = () => picker.remove();
    document.getElementById('cl-icon-picker-close')?.addEventListener('click', close);
    document.getElementById('cl-icon-picker-close2')?.addEventListener('click', close);

    document.getElementById('cl-icon-picker-clear')?.addEventListener('click', async () => {
      const key = item.key;
      if (!_consoleMeta[key]) _consoleMeta[key] = {};
      delete _consoleMeta[key].iconPath;
      await _saveMeta();
      _renderGrid();
      close();
    });

    picker.querySelectorAll('.cl-icon-option').forEach(opt => {
      opt.addEventListener('click', async () => {
        const key = item.key;
        if (!_consoleMeta[key]) _consoleMeta[key] = {};
        _consoleMeta[key].iconPath = opt.dataset.path;
        await _saveMeta();
        _renderGrid();
        close();
      });
    });

    // Close on backdrop click
    picker.addEventListener('click', e => { if (e.target === picker) close(); });
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
      case 'edit':
        _openEditModal(item);
        return;
      case 'icon': {
        _openIconPicker(item);
        return; // Early return — async picker handles save
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
      case 'rename':
        _openEditModal(item, 'name');
        return;
      case 'desc':
        _openEditModal(item, 'desc');
        return;
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
    // Load custom icons from assets/collection-icons/
    _loadCollectionIcons();

    document.getElementById('console-library-btn')?.addEventListener('click', open);
    document.getElementById('cl-close')?.addEventListener('click', close);
    document.getElementById('cl-game-close')?.addEventListener('click', close);
    document.getElementById('cl-new-btn')?.addEventListener('click', _openNewCollectionDialog);

    document.getElementById('cl-back')?.addEventListener('click', () => {
      _currentConsole = null;
      close();
      open(); // re-open the dropdown menu
    });

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

    document.getElementById('console-library-overlay')?.addEventListener('click', e => {
      if (e.target.id === 'console-library-overlay') close();
    });

    document.addEventListener('keydown', e => {
      const ov = document.getElementById('console-library-overlay');
      if (e.key === 'Escape') {
        if (!document.getElementById('cl-edit-overlay')?.classList.contains('hidden')) {
          _closeEditModal();
          return;
        }
      }
      if (!ov || ov.classList.contains('hidden')) return;
      if (e.key === 'Escape') {
        if (_currentConsole) { close(); }
        else close();
      }
    });

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

    document.getElementById('cl-edit-close')?.addEventListener('click', _closeEditModal);
    document.getElementById('cl-edit-cancel')?.addEventListener('click', _closeEditModal);
    document.getElementById('cl-edit-save')?.addEventListener('click', _saveEditModal);
    document.getElementById('cl-edit-overlay')?.addEventListener('click', e => {
      if (e.target.id === 'cl-edit-overlay') _closeEditModal();
    });
    document.getElementById('cl-edit-cover-browse')?.addEventListener('click', async () => {
      const fp = await window.api.dialog.openFile([
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }
      ]);
      if (!fp) return;
      _editTempCoverPath = fp;
      _refreshEditCoverPreview();
    });
    document.getElementById('cl-edit-cover-clear')?.addEventListener('click', () => {
      _editTempCoverPath = null;
      _refreshEditCoverPreview();
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

  function refreshCurrentGameGrid() {
    if (_currentItem) {
      _renderGameGrid(_currentItem);
    }
  }

  return { init, open, close, loadConsoleMeta, refreshCurrentGameGrid };
})();
