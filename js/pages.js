/* ── ENI Bexder — Grid & Page State ──────────────────────────────────── */

const Pages = (() => {
  const COLS = 7;

  let _currentGames = [];
  let _selectedIndex = 0;
  let _currentCategory = 'all';
  let _currentCollection = null;
  let _ctxGame = null;
  let _searchQuery = '';
  let _sortOrder = 'az';

  // ── Grid ───────────────────────────────────────────────────────────────

  const track    = document.getElementById('game-grid');
  const emptyMsg = document.getElementById('carousel-empty');

  function _buildTile(game) {
    const tile = document.createElement('div');
    tile.className = 'game-tile';
    tile.dataset.id = game.id;
    _applyTileSize(tile, game.id);

    const cover = game.coverPath
      ? `<img class="tile-cover" src="file://${game.coverPath}" alt="${game.title}" loading="lazy" />`
      : `<div class="tile-placeholder">
           <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2">
             <rect x="8" y="20" width="48" height="32" rx="4"/>
             <path d="M22 36h8m-4-4v8M42 34a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm6 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" fill="currentColor" stroke="none"/>
           </svg>
           <span>${game.consoleName}</span>
         </div>`;

    tile.innerHTML = `
      ${cover}
      <div class="tile-overlay">
        <div class="tile-title">${game.title}</div>
        <div class="tile-console">${game.consoleName}</div>
      </div>
    `;

    tile.addEventListener('click', () => {
      const idx = _currentGames.findIndex(g => g.id === game.id);
      if (idx === _selectedIndex) {
        launchSelected();
      } else {
        _select(idx, true);
      }
    });

    tile.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const idx = _currentGames.findIndex(g => g.id === game.id);
      if (idx !== _selectedIndex) _select(idx, true);
      _openContextMenu(game, e.clientX, e.clientY);
    });

    return tile;
  }

  const ROWS = 3;
  const MIN_TILES = COLS * ROWS; // 21

  // Tile sizes: 'w2' | 'h2' | 'w2h2' | '' (normal)
  const _tileSizes = {};

  function _buildPlaceholder(slotIndex) {
    const t = document.createElement('div');
    t.className = 'game-tile placeholder';
    t.innerHTML = '<div class="empty-tile-inner"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>';
    t.dataset.slot = slotIndex;
    t.style.pointerEvents = 'all';
    t.style.cursor = 'pointer';
    t.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      _openEmptyTileMenu(t, e.clientX, e.clientY);
    });
    return t;
  }

  function _applyTileSize(tile, gameId) {
    tile.classList.remove('tile-w2', 'tile-h2', 'tile-w2h2');
    const sz = _tileSizes[gameId];
    if (sz === 'w2')   tile.classList.add('tile-w2');
    else if (sz === 'h2')   tile.classList.add('tile-h2');
    else if (sz === 'w2h2') tile.classList.add('tile-w2h2');
  }

  function renderGames(games) {
    _currentGames = games;
    _selectedIndex = Math.min(_selectedIndex, Math.max(0, games.length - 1));

    // Remove all old tiles (real + placeholder)
    track.querySelectorAll('.game-tile').forEach(t => t.remove());

    const hasGames = games.length > 0;

    // Real game tiles go before emptyMsg in the DOM
    games.forEach(game => track.insertBefore(_buildTile(game), emptyMsg));

    // emptyMsg: visible = counts as 1 grid cell at its position; hidden = no space
    emptyMsg.classList.toggle('hidden', hasGames);

    // Ghost placeholder tiles appended after emptyMsg to fill the grid
    // When 0 games: emptyMsg takes cell 0, fill 34 more; when N games: fill to 35
    const usedSlots = hasGames ? games.length : 1;
    const targetSlots = Math.max(MIN_TILES, Math.ceil(usedSlots / COLS) * COLS);
    const fillCount = targetSlots - usedSlots;
    for (let i = 0; i < fillCount; i++) track.appendChild(_buildPlaceholder(usedSlots + i));

    if (!hasGames) { _updateInfoPanel(null); return; }

    _applyGridLayout();
    _updateInfoPanel(games[_selectedIndex]);
  }

  function _applyGridLayout() {
    const tiles = Array.from(track.querySelectorAll('.game-tile:not(.placeholder)'));
    tiles.forEach((tile, i) => {
      tile.classList.toggle('active', i === _selectedIndex);
    });
    const active = tiles[_selectedIndex];
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function _select(index, animate = true) {
    if (!_currentGames.length) return;
    _selectedIndex = Math.max(0, Math.min(index, _currentGames.length - 1));
    _applyGridLayout();
    const game = _currentGames[_selectedIndex];
    _updateInfoPanel(game, animate);
    _updateBackground(game);
  }

  function prev() {
    if (_selectedIndex > 0) { _select(_selectedIndex - 1); Sfx?.play('nav'); }
  }

  function next() {
    if (_selectedIndex < _currentGames.length - 1) { _select(_selectedIndex + 1); Sfx?.play('nav'); }
  }

  function up() {
    if (_selectedIndex >= COLS) { _select(_selectedIndex - COLS); Sfx?.play('nav'); }
  }

  function down() {
    if (_selectedIndex + COLS < _currentGames.length) { _select(_selectedIndex + COLS); Sfx?.play('nav'); }
  }

  // ── Info Panel ────────────────────────────────────────────────────────

  function _updateInfoPanel(game, animate = true) {
    const titleEl      = document.getElementById('game-title');
    const consoleEl    = document.getElementById('game-console');
    const emulatorEl   = document.getElementById('game-emulator');
    const descEl       = document.getElementById('game-description');
    const lastPlayedEl = document.getElementById('game-last-played');
    const playtimeEl   = document.getElementById('game-playtime');
    const launchBtn    = document.getElementById('launch-btn');
    const favBtn       = document.getElementById('favorite-btn');
    const favOutline   = document.getElementById('fav-icon-outline');
    const favFilled    = document.getElementById('fav-icon-filled');
    const addColBtn    = document.getElementById('add-to-col-btn');

    if (!game) {
      if (titleEl)    titleEl.textContent  = 'Select a Game';
      if (descEl)     descEl.textContent   = 'Browse your library and select a game to see details.';
      if (consoleEl)  consoleEl.textContent  = '';
      if (emulatorEl) emulatorEl.textContent = '';
      if (lastPlayedEl) lastPlayedEl.textContent = '—';
      if (playtimeEl)   playtimeEl.textContent   = '—';
      if (launchBtn)  launchBtn.disabled  = true;
      if (favBtn)     favBtn.disabled     = true;
      if (addColBtn)  addColBtn.disabled  = true;
      document.getElementById('game-extra-meta')?.classList.add('hidden');
      const genresEl = document.getElementById('game-genres');
      if (genresEl) genresEl.innerHTML = '';
      return;
    }

    if (animate) {
      const panel = document.getElementById('game-info-panel');
      panel?.classList.remove('fade-in');
      void panel?.offsetWidth;
      panel?.classList.add('fade-in');
    }

    const record = Library.getRecord(game.id);

    if (titleEl)    titleEl.textContent    = game.title;
    if (consoleEl)  consoleEl.textContent  = game.consoleName;
    if (emulatorEl) emulatorEl.textContent = EmulatorManager.getEmulatorName(game.console);
    if (descEl)     descEl.textContent     = game.description || 'No description available.';
    if (lastPlayedEl) lastPlayedEl.textContent = Library.formatLastPlayed(record.lastPlayed);
    if (playtimeEl)   playtimeEl.textContent   = Library.formatPlayTime(record.playTime);

    const extraMeta = document.getElementById('game-extra-meta');
    const devEl  = document.getElementById('game-developer');
    const yearEl = document.getElementById('game-year');
    if (extraMeta && devEl && yearEl) {
      const hasExtra = !!(game.developer || game.releaseYear);
      extraMeta.classList.toggle('hidden', !hasExtra);
      devEl.textContent  = game.developer  || '';
      yearEl.textContent = game.releaseYear ? String(game.releaseYear) : '';
      devEl.classList.toggle('hidden',  !game.developer);
      yearEl.classList.toggle('hidden', !game.releaseYear);
    }

    const genresEl = document.getElementById('game-genres');
    if (genresEl) {
      genresEl.innerHTML = (game.genres || [])
        .map(g => `<span class="genre-tag">${g}</span>`).join('');
    }

    if (launchBtn) launchBtn.disabled = false;
    if (favBtn)    favBtn.disabled    = false;
    if (addColBtn) addColBtn.disabled = false;

    const isFav = !!record.favorite;
    favOutline?.classList.toggle('hidden', isFav);
    favFilled?.classList.toggle('hidden', !isFav);
  }

  function _updateBackground(game) {
    const bgImage = document.getElementById('bg-image');
    if (!bgImage) return;
    if (game?.coverPath) {
      bgImage.style.backgroundImage = `url("file://${game.coverPath}")`;
    } else {
      bgImage.style.backgroundImage = '';
    }
  }

  // ── Context Menu ──────────────────────────────────────────────────────

  function _openContextMenu(game, x, y) {
    _ctxGame = game;
    const menu = document.getElementById('game-context-menu');
    if (!menu) return;
    Sfx?.play('open');
    menu.classList.remove('hidden');

    const vw = window.innerWidth, vh = window.innerHeight;
    const mw = 190, mh = 200;
    menu.style.left = (x + mw > vw ? vw - mw - 8 : x) + 'px';
    menu.style.top  = (y + mh > vh ? vh - mh - 8 : y) + 'px';
  }

  function _closeContextMenu() {
    document.getElementById('game-context-menu')?.classList.add('hidden');
    _ctxGame = null;
  }

  // ── Empty Tile Menu ────────────────────────────────────────────────────

  let _emptyTileEl = null;

  function _openEmptyTileMenu(tileEl, x, y) {
    _emptyTileEl = tileEl;
    const menu = document.getElementById('empty-tile-menu');
    if (!menu) return;
    menu.classList.remove('hidden');
    const vw = window.innerWidth, vh = window.innerHeight;
    const mw = 200, mh = 180;
    menu.style.left = (x + mw > vw ? vw - mw - 8 : x) + 'px';
    menu.style.top  = (y + mh > vh ? vh - mh - 8 : y) + 'px';
  }

  function _closeEmptyTileMenu() {
    document.getElementById('empty-tile-menu')?.classList.add('hidden');
    _emptyTileEl = null;
  }

  async function _handleEmptyTileAction(action) {
    const tileEl = _emptyTileEl;
    _closeEmptyTileMenu();

    if (action === 'add-image') {
      const fp = await window.api.dialog.openFile([
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }
      ]);
      if (!fp || !tileEl) return;
      tileEl.innerHTML = '';
      tileEl.style.backgroundImage = `url("file://${fp}")`;
      tileEl.style.backgroundSize = 'cover';
      tileEl.style.backgroundPosition = 'center';
      tileEl.classList.remove('placeholder');
      tileEl.classList.add('custom-img-tile');
      tileEl.style.opacity = '1';
      tileEl.style.cursor = 'default';
      App.showToast('Image tile added');

    } else if (action === 'add-link') {
      const url = prompt('Enter website URL:', 'https://');
      if (!url || !tileEl) return;
      const hostname = (() => { try { return new URL(url).hostname.replace('www.', ''); } catch { return url; } })();
      tileEl.innerHTML = `<div class="custom-tile-body"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" width="22" height="22"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg><span>${hostname}</span></div>`;
      tileEl.classList.remove('placeholder');
      tileEl.classList.add('custom-link-tile');
      tileEl.style.opacity = '1';
      tileEl.style.cursor = 'pointer';
      tileEl.addEventListener('click', () => { try { window.open(url, '_blank'); } catch {} });
      App.showToast('Link tile added');

    } else if (action === 'add-folder') {
      const fp = await window.api.dialog.openFile([]);
      if (!fp || !tileEl) return;
      const name = fp.split(/[\\/]/).slice(-2, -1)[0] || fp.split(/[\\/]/).pop();
      tileEl.innerHTML = `<div class="custom-tile-body"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" width="22" height="22"><path d="M3 4h7l2 2h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg><span>${name}</span></div>`;
      tileEl.classList.remove('placeholder');
      tileEl.classList.add('custom-folder-tile');
      tileEl.style.opacity = '1';
      tileEl.style.cursor = 'pointer';
      tileEl.addEventListener('click', () => window.api.fs.openFolder(fp.split(/[\\/]/).slice(0,-1).join('/')));
      App.showToast('Folder tile added');

    } else if (action === 'pin-game') {
      openSearch();
    }
  }

  async function _handleContextAction(action) {
    const game = _ctxGame;
    _closeContextMenu();
    if (!game) return;

    if (action === 'launch') {
      EmulatorManager.launch(game, Settings.getData());

    } else if (action === 'favorite') {
      const isFav = Library.toggleFavorite(game.id);
      await Storage.savePlayData(Library.getPlayData());
      _updateInfoPanel(game, false);
      App.showToast(isFav ? '♥ Added to Favorites' : 'Removed from Favorites');

    } else if (action === 'collection') {
      setTimeout(() => _openColPicker(), 50);

    } else if (action === 'edit-details') {
      _openEditDetails(game);

    } else if (action === 'fetch-cover') {
      const appDir = Storage.appPath('').replace(/\/$/, '');
      App.showToast('Fetching cover for ' + game.title + '…');
      const ok = await CoverScraper.scrapeGame(game, appDir);
      if (ok) {
        renderCurrentPage();
        App.showToast('Cover downloaded for ' + game.title);
      } else {
        App.showToast('No cover found for ' + game.title);
      }

    } else if (action === 'open-location') {
      const dir = game.path.replace(/[/\\][^/\\]+$/, '');
      await window.api.fs.openFolder(dir);

    } else if (action.startsWith('resize-')) {
      const sz = action.replace('resize-', '');
      if (sz === '1x1') delete _tileSizes[game.id];
      else _tileSizes[game.id] = sz;
      const tileEl = track.querySelector(`.game-tile[data-id="${game.id}"]`);
      if (tileEl) _applyTileSize(tileEl, game.id);
    }
  }

  // ── Edit Details ──────────────────────────────────────────────────────

  let _editGame = null;
  let _editTempCoverPath = null;

  function _openEditDetails(game) {
    _editGame = game;
    _editTempCoverPath = game.coverPath || null;

    const overlay = document.getElementById('edit-details-overlay');
    document.getElementById('edit-details-title').textContent = 'Edit: ' + game.title;
    document.getElementById('edit-title-input').value = game.title || '';
    document.getElementById('edit-desc-input').value = game.description || '';
    document.getElementById('edit-genre-input').value = (game.genres || []).join(', ');
    document.getElementById('edit-dev-input').value = game.developer || '';
    document.getElementById('edit-year-input').value = game.releaseYear || '';
    _refreshEditCoverPreview();
    overlay?.classList.remove('hidden');
  }

  function _closeEditDetails() {
    document.getElementById('edit-details-overlay')?.classList.add('hidden');
    _editGame = null;
    _editTempCoverPath = null;
  }

  function _refreshEditCoverPreview() {
    const preview = document.getElementById('edit-cover-preview');
    if (!preview) return;
    if (_editTempCoverPath) {
      preview.innerHTML = `<img src="file://${_editTempCoverPath}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;" />`;
    } else {
      preview.innerHTML = `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48">
        <rect x="8" y="20" width="48" height="32" rx="4"/>
        <path d="M22 36h8m-4-4v8" fill="currentColor" stroke="none"/>
      </svg>`;
    }
  }

  async function _saveEditDetails() {
    if (!_editGame) return;
    const game = _editGame;

    game.title      = document.getElementById('edit-title-input').value.trim() || game.title;
    game.description = document.getElementById('edit-desc-input').value.trim();
    game.genres     = document.getElementById('edit-genre-input').value
                        .split(',').map(s => s.trim()).filter(Boolean);
    game.developer  = document.getElementById('edit-dev-input').value.trim();
    game.releaseYear = parseInt(document.getElementById('edit-year-input').value) || null;
    if (_editTempCoverPath !== undefined) game.coverPath = _editTempCoverPath;

    const allMeta = (await Storage.loadGameMeta()).meta || {};
    allMeta[game.id] = {
      title:       game.title,
      description: game.description,
      genres:      game.genres,
      developer:   game.developer,
      releaseYear: game.releaseYear,
      coverPath:   game.coverPath,
    };
    await Storage.saveGameMeta({ meta: allMeta });

    _closeEditDetails();
    _updateInfoPanel(game, false);
    renderCurrentPage();
    App.showToast('Details saved');
  }

  // ── Collection Picker ─────────────────────────────────────────────────

  function _openColPicker() {
    const game = _currentGames[_selectedIndex];
    const list = document.getElementById('col-picker-list');
    const picker = document.getElementById('col-picker');
    if (!list || !picker || !game) return;

    const cols = Library.getCollections();
    list.innerHTML = '';

    if (!cols.length) {
      list.innerHTML = '<div class="col-pick-none">No collections yet.<br>Create one first.</div>';
    } else {
      cols.forEach(col => {
        const inCol = col.games && col.games.includes(game.id);
        const btn = document.createElement('button');
        btn.className = 'col-pick-item' + (inCol ? ' in-col' : '');
        btn.textContent = (inCol ? '✓ ' : '') + col.name;
        btn.addEventListener('click', async () => {
          if (!col.games) col.games = [];
          if (inCol) {
            col.games = col.games.filter(id => id !== game.id);
          } else {
            col.games.push(game.id);
          }
          await Storage.saveCollections({ collections: Library.getCollections() });
          _openColPicker(); // refresh picker display
          App.showToast(inCol ? 'Removed from ' + col.name : 'Added to ' + col.name);
        });
        list.appendChild(btn);
      });
    }

    picker.classList.remove('hidden');
  }

  function _closeColPicker() {
    document.getElementById('col-picker')?.classList.add('hidden');
  }

  // ── Category switching ────────────────────────────────────────────────

  function _applySort(games) {
    const sorted = [...games];
    switch (_sortOrder) {
      case 'za':
        sorted.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'most-played':
        sorted.sort((a, b) =>
          (Library.getRecord(b.id).playCount || 0) - (Library.getRecord(a.id).playCount || 0));
        break;
      case 'last-played':
        sorted.sort((a, b) => {
          const da = Library.getRecord(a.id).lastPlayed || '';
          const db = Library.getRecord(b.id).lastPlayed || '';
          return db > da ? 1 : -1;
        });
        break;
      case 'recently-added':
        sorted.reverse();
        break;
      default: // 'az'
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }
    return sorted;
  }

  function switchCategory(category, collectionName) {
    _currentCategory = category;
    _currentCollection = collectionName || null;
    _selectedIndex = 0;
    _closeColPicker();
    let games = Library.filter(category, collectionName);
    if (_searchQuery) {
      const q = _searchQuery.toLowerCase();
      games = games.filter(g => g.title.toLowerCase().includes(q));
    }
    games = _applySort(games);
    renderGames(games);
  }

  function renderCollectionTabs() {
    // Collection tabs removed from top nav — collections accessed via bottom bar button
  }

  function setActiveTab(activeEl) {
    document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
    activeEl.classList.add('active');
  }

  // ── Search Overlay ────────────────────────────────────────────────────

  function openSearch() {
    Music.duck();
    Sfx?.play('open');
    const overlay = document.getElementById('search-overlay');
    overlay.classList.remove('hidden');
    document.getElementById('search-input')?.focus();
  }

  function closeSearch() {
    Music.unduck();
    Sfx?.play('close');
    document.getElementById('search-overlay')?.classList.add('hidden');
    document.getElementById('search-input').value = '';
    document.getElementById('search-results').innerHTML = '';
  }

  function _renderSearchResults(results) {
    const container = document.getElementById('search-results');
    if (!results.length) {
      container.innerHTML = '<div class="search-no-results">No results found.</div>';
      return;
    }
    container.innerHTML = '';
    results.forEach(game => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.innerHTML = `
        ${game.coverPath
          ? `<img src="file://${game.coverPath}" alt="${game.title}" />`
          : `<div style="width:40px;height:56px;background:var(--bg3);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--text3);font-weight:700;">${game.consoleName}</div>`}
        <div class="search-result-info">
          <h4>${game.title}</h4>
          <span>${game.consoleName}</span>
        </div>
      `;
      item.addEventListener('click', () => {
        closeSearch();
        const allGames = Library.filter('all');
        const idx = allGames.findIndex(g => g.id === game.id);
        if (idx !== -1) {
          document.querySelector('.category-tab[data-category="all"]')?.click();
          setTimeout(() => _select(idx), 100);
        }
      });
      container.appendChild(item);
    });
  }

  // ── Actions ───────────────────────────────────────────────────────────

  function launchSelected() {
    const game = _currentGames[_selectedIndex];
    if (!game) return;
    Sfx?.play('launch');
    EmulatorManager.launch(game, Settings.getData());
  }

  function toggleFavorite() {
    const game = _currentGames[_selectedIndex];
    if (!game) return;
    const isFav = Library.toggleFavorite(game.id);
    Storage.savePlayData(Library.getPlayData());
    _updateInfoPanel(game, false);
    Sfx?.play('favorite');
    App.showToast(isFav ? '♥ Added to Favorites' : 'Removed from Favorites');
  }

  function closeOverlays() {
    const overlays = ['search-overlay', 'profile-overlay', 'settings-overlay', 'collection-overlay'];
    let any = false;
    overlays.forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.classList.contains('hidden')) {
        el.classList.add('hidden'); any = true;
      }
    });
    if (!document.getElementById('col-picker')?.classList.contains('hidden')) {
      _closeColPicker(); any = true;
    }
    if (any) Sfx?.play('back');
    else document.querySelector('.category-tab[data-category="all"]')?.click();
  }

  // ── Init ──────────────────────────────────────────────────────────────

  function init() {
    // Category tabs
    document.querySelectorAll('.category-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        setActiveTab(tab);
        const cat = tab.dataset.category;
        const col = tab.dataset.collection;
        switchCategory(cat, col);
      });
    });

    // Launch & favorite buttons
    document.getElementById('launch-btn')?.addEventListener('click', launchSelected);
    document.getElementById('favorite-btn')?.addEventListener('click', toggleFavorite);

    // Add to collection button
    document.getElementById('add-to-col-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const picker = document.getElementById('col-picker');
      if (picker?.classList.contains('hidden')) {
        _openColPicker();
      } else {
        _closeColPicker();
      }
    });

    document.getElementById('col-picker-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      _closeColPicker();
    });

    // Close col picker on outside click
    document.addEventListener('click', (e) => {
      if (!document.getElementById('add-to-col-btn')?.contains(e.target) &&
          !document.getElementById('col-picker')?.contains(e.target)) {
        _closeColPicker();
      }
    });

    // Home button
    document.getElementById('home-btn')?.addEventListener('click', () => {
      closeOverlays();
      document.querySelector('.category-tab[data-category="all"]')?.click();
    });

    // Search
    document.getElementById('search-btn')?.addEventListener('click', openSearch);
    document.getElementById('search-close')?.addEventListener('click', closeSearch);
    document.getElementById('search-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'search-overlay') closeSearch();
    });
    document.getElementById('search-input')?.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      if (!q) { document.getElementById('search-results').innerHTML = ''; return; }
      _renderSearchResults(Library.search(q));
    });

    // Add collection
    document.getElementById('add-collection-btn')?.addEventListener('click', () => {
      document.getElementById('collection-overlay')?.classList.remove('hidden');
      document.getElementById('collection-name-input')?.focus();
    });
    document.getElementById('collection-close')?.addEventListener('click', () => {
      document.getElementById('collection-overlay')?.classList.add('hidden');
    });
    document.getElementById('collection-cancel-btn')?.addEventListener('click', () => {
      document.getElementById('collection-overlay')?.classList.add('hidden');
    });
    document.getElementById('collection-create-btn')?.addEventListener('click', async () => {
      const name = document.getElementById('collection-name-input')?.value?.trim();
      if (!name) return;
      Library.addCollection(name);
      await Storage.saveCollections({ collections: Library.getCollections() });
      renderCollectionTabs();
      document.getElementById('collection-overlay')?.classList.add('hidden');
      document.getElementById('collection-name-input').value = '';
      App.showToast('Collection "' + name + '" created');
    });

    // Edit Details modal
    document.getElementById('edit-details-close')?.addEventListener('click', _closeEditDetails);
    document.getElementById('edit-details-cancel')?.addEventListener('click', _closeEditDetails);
    document.getElementById('edit-details-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'edit-details-overlay') _closeEditDetails();
    });
    document.getElementById('edit-details-save')?.addEventListener('click', _saveEditDetails);

    document.getElementById('edit-cover-browse')?.addEventListener('click', async () => {
      const filePath = await window.api.dialog.openFile([
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }
      ]);
      if (!filePath) return;
      _editTempCoverPath = filePath;
      _refreshEditCoverPreview();
    });

    document.getElementById('edit-cover-clear')?.addEventListener('click', () => {
      _editTempCoverPath = null;
      _refreshEditCoverPreview();
    });

    document.getElementById('edit-cover-fetch')?.addEventListener('click', async () => {
      if (!_editGame) return;
      const appDir = Storage.appPath('').replace(/\/$/, '');
      const tempGame = { ..._editGame };
      const ok = await CoverScraper.scrapeGame(tempGame, appDir);
      if (ok) {
        _editTempCoverPath = tempGame.coverPath;
        _refreshEditCoverPreview();
        App.showToast('Cover fetched!');
      } else {
        App.showToast('No cover found online');
      }
    });

    // Context menu
    document.getElementById('game-context-menu')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.ctx-item');
      if (btn) _handleContextAction(btn.dataset.action);
    });

    document.addEventListener('click', (e) => {
      if (!document.getElementById('game-context-menu')?.contains(e.target)) {
        _closeContextMenu();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') _closeContextMenu();
    });

    // Sort dropdown
    const gridSort = document.getElementById('grid-sort');
    if (gridSort) {
      gridSort.addEventListener('change', () => {
        _sortOrder = gridSort.value;
        switchCategory(_currentCategory, _currentCollection);
      });
    }

    // Inline grid search
    const gridSearch = document.getElementById('grid-search');
    const gridSearchClear = document.getElementById('grid-search-clear');
    if (gridSearch) {
      gridSearch.addEventListener('input', () => {
        _searchQuery = gridSearch.value.trim();
        gridSearchClear?.classList.toggle('hidden', !_searchQuery);
        switchCategory(_currentCategory, _currentCollection);
      });
      gridSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          gridSearch.value = '';
          _searchQuery = '';
          gridSearchClear?.classList.add('hidden');
          switchCategory(_currentCategory, _currentCollection);
          gridSearch.blur();
        }
      });
    }
    if (gridSearchClear) {
      gridSearchClear.addEventListener('click', () => {
        if (gridSearch) gridSearch.value = '';
        _searchQuery = '';
        gridSearchClear.classList.add('hidden');
        switchCategory(_currentCategory, _currentCollection);
        gridSearch?.focus();
      });
    }

    // Clear search when switching category tabs
    document.querySelectorAll('.category-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        if (_searchQuery) {
          if (gridSearch) gridSearch.value = '';
          _searchQuery = '';
          gridSearchClear?.classList.add('hidden');
        }
      });
    });

    // Empty tile context menu
    document.getElementById('empty-tile-menu')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-eaction]');
      if (btn) _handleEmptyTileAction(btn.dataset.eaction);
    });
    document.addEventListener('click', (e) => {
      if (!document.getElementById('empty-tile-menu')?.contains(e.target) &&
          !e.target.closest('.game-tile.placeholder')) {
        _closeEmptyTileMenu();
      }
    });

    // Draggable modals
    _setupDraggable('settings-modal',     'settings-modal .modal-title-bar');
    _setupDraggable('profile-modal',      'profile-modal .modal-title-bar');
    _setupDraggable('edit-details-modal', 'edit-details-modal .modal-title-bar');
  }

  function _setupDraggable(modalId, handleSelector) {
    const modal  = document.getElementById(modalId);
    const handle = modal?.querySelector('.modal-title-bar');
    if (!modal || !handle) return;

    let dragging = false, startX = 0, startY = 0, origX = 0, origY = 0;

    handle.addEventListener('mousedown', (e) => {
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      const rect = modal.getBoundingClientRect();
      origX = rect.left; origY = rect.top;
      modal.style.position = 'fixed';
      modal.style.margin = '0';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      modal.style.left = origX + dx + 'px';
      modal.style.top  = origY + dy + 'px';
    });

    document.addEventListener('mouseup', () => {
      dragging = false;
      document.body.style.userSelect = '';
    });
  }

  function renderCurrentPage() {
    switchCategory(_currentCategory, _currentCollection);
  }

  function selectByIndex(idx) {
    if (idx >= 0 && idx < _currentGames.length) _select(idx, true);
  }

  const grid = { prev, next, up, down, selectByIndex };

  return {
    init, switchCategory, renderGames, renderCollectionTabs,
    openSearch, closeSearch, closeOverlays,
    launchSelected, toggleFavorite, setActiveTab,
    renderCurrentPage,
    grid,
    getSelectedGame: () => _currentGames[_selectedIndex],
    getSelectedIndex: () => _selectedIndex,
  };
})();
