/* ── ENI Bexder — Grid & Page State ──────────────────────────────────── */

const Pages = (() => {
  const MIN_TILE_SIZE = 120;  // Minimum tile size in pixels
  const MAX_TILE_SIZE = 280;  // Maximum tile size in pixels
  const DEFAULT_TILE_SIZE = 160; // Default tile size
  const GAP = 18; // Grid gap in pixels
  const SIDE_PAD = 24; // Left/right padding so scaled tiles are never clipped
  const MIN_COLS = 7;  // Always show at least 7 columns
  const MIN_ROWS = 3;  // Always fill to at least 3 rows of tiles

  let _currentGames = [];
  let _selectedIndex = 0;
  let _currentCategory = 'all';
  let _currentCollection = null;
  let _ctxGame = null;
  let _searchQuery = '';
  let _sortOrder = 'az';
  let _gridCols = 7; // Dynamic column count
  let _gridRows = 3; // Dynamic row count

  const track = document.getElementById('game-grid');
  const emptyMsg = document.getElementById('carousel-empty');

  const _tileSizes = {};
  let _customTiles = [];

  // ── Responsive Grid Layout Manager ────────────────────────────────────

  function _calculateGridDimensions() {
    const gridSection = document.getElementById('grid-section');
    if (!gridSection) return;

    // Available width for tile content only (subtract section padding + side padding)
    const contentWidth = gridSection.clientWidth - 32 - SIDE_PAD * 2;

    // Guard: section not yet painted or too narrow
    if (contentWidth <= MIN_TILE_SIZE) {
      _gridCols = MIN_COLS;
      const tileSize = DEFAULT_TILE_SIZE;
      _gridRows = MIN_ROWS;
      track.style.gridTemplateColumns = `repeat(${_gridCols}, ${tileSize}px)`;
      track.style.gridAutoRows = `${tileSize}px`;
      track.style.gap = `${GAP}px`;
      track.style.justifyContent = 'start';
      track.style.padding = `10px ${SIDE_PAD}px`;
      track.style.maxWidth = `${_gridCols * tileSize + (_gridCols - 1) * GAP + SIDE_PAD * 2}px`;
      track.style.margin = '0 auto';
      track.dataset.tileSize = tileSize;
      return;
    }

    // How many columns can fit at min/max tile sizes
    const maxCols = Math.floor((contentWidth + GAP) / (MIN_TILE_SIZE + GAP));
    const minCols = Math.max(2, Math.floor(contentWidth / (MAX_TILE_SIZE + GAP)));

    let tileSize = DEFAULT_TILE_SIZE;

    if (maxCols < minCols) {
      tileSize = MIN_TILE_SIZE;
      _gridCols = Math.max(1, maxCols);
    } else {
      // Target MIN_COLS (7); fall back to fewer only if screen is too narrow
      _gridCols = Math.max(minCols, Math.min(maxCols, MIN_COLS));
      tileSize = Math.floor((contentWidth - (_gridCols - 1) * GAP) / _gridCols);
      tileSize = Math.max(MIN_TILE_SIZE, Math.min(MAX_TILE_SIZE, tileSize));
    }

    // Row count — always show at least MIN_ROWS rows
    const tilesNeedingExtraSpace = _currentGames.filter(g => {
      const sz = _tileSizes[g.id];
      return sz === 'w2' || sz === 'h2' || sz === 'w2h2';
    }).length;
    const baseRows = Math.max(MIN_ROWS, Math.ceil((_currentGames.length || 1) / _gridCols));
    _gridRows = baseRows + Math.ceil(tilesNeedingExtraSpace / _gridCols);

    // Apply grid CSS (inline styles override the CSS defaults)
    track.style.gridTemplateColumns = `repeat(${_gridCols}, ${tileSize}px)`;
    track.style.gridAutoRows = `${tileSize}px`;
    track.style.gap = `${GAP}px`;
    // 'start' keeps the first tile visible at left-pad offset; the container
    // itself is centred via margin:auto so the overall grid is still centred.
    track.style.justifyContent = 'start';
    track.style.padding = `10px ${SIDE_PAD}px`;
    track.style.maxWidth = `${_gridCols * tileSize + (_gridCols - 1) * GAP + SIDE_PAD * 2}px`;
    track.style.margin = '0 auto';
    track.dataset.tileSize = tileSize;
  }

  function _applyCustomTileSize(tile, custom) {
    tile.style.gridColumn = '';
    tile.style.gridRow    = '';
    const sz = custom.size;
    if (!sz || sz === '1x1') return;
    if (sz === 'w2') {
      if (_gridCols >= 2) tile.style.gridColumn = 'span 2';
    } else if (sz === 'h2') {
      tile.style.gridRow = 'span 2';
    } else if (sz === 'w2h2') {
      if (_gridCols >= 2) { tile.style.gridColumn = 'span 2'; tile.style.gridRow = 'span 2'; }
      else tile.style.gridRow = 'span 2';
    }
  }

  function _enforceTileConstraints(tile, gameId) {
    const sz = _tileSizes[gameId];
    
    // Remove all size classes first
    tile.classList.remove('tile-w2', 'tile-h2', 'tile-w2h2');
    tile.style.gridColumn = '';
    tile.style.gridRow = '';

    // Apply size with constraints - prevent overflow
    if (sz === 'w2') {
      // Only allow w2 if we have enough columns
      if (_gridCols >= 2) {
        tile.classList.add('tile-w2');
        tile.style.gridColumn = 'span 2';
      }
    } else if (sz === 'h2') {
      tile.classList.add('tile-h2');
      tile.style.gridRow = 'span 2';
    } else if (sz === 'w2h2') {
      // Only allow w2h2 if we have enough columns
      if (_gridCols >= 2) {
        tile.classList.add('tile-w2h2');
        tile.style.gridColumn = 'span 2';
        tile.style.gridRow = 'span 2';
      } else {
        // Fall back to h2 if not enough columns
        tile.classList.add('tile-h2');
        tile.style.gridRow = 'span 2';
      }
    }
  }

  async function _loadTileLayout() {
    try {
      const layout = await Storage.loadTileLayout();
      Object.assign(_tileSizes, layout.tileSizes || {});
      _customTiles = layout.customTiles || [];
    } catch (e) {
      console.warn('[Pages] Failed to load tile layout:', e);
    }
  }

  async function _saveTileLayout() {
    try {
      await Storage.saveTileLayout({ tileSizes: _tileSizes, customTiles: _customTiles });
    } catch (e) {
      console.warn('[Pages] Failed to save tile layout:', e);
    }
  }

  function _fileUrl(p) {
    if (!p) return '';
    const normalized = p.replace(/\\/g, '/');
    const base = normalized.startsWith('/') ? normalized : '/' + normalized;
    return 'file://' + base.replace(/ /g, '%20').replace(/#/g, '%23').replace(/\?/g, '%3F');
  }

  function _buildTile(game) {
    const tile = document.createElement('div');
    tile.className = 'game-tile';
    tile.dataset.id = game.id;
    _applyTileSize(tile, game.id);

    const hasCover = !!game.coverPath;
    const coverHtml = hasCover
      ? `<img class="tile-cover" src="${_fileUrl(game.coverPath)}" alt="${game.title}" loading="lazy" onerror="this.classList.add('tile-cover-error');this.nextElementSibling.classList.add('tile-placeholder-visible')" />`
      : '';
    const placeholderClass = hasCover ? '' : 'tile-placeholder-visible';

    tile.innerHTML = `
      ${coverHtml}
      <div class="tile-placeholder ${placeholderClass}">
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="8" y="20" width="48" height="32" rx="4"/>
          <path d="M22 36h8m-4-4v8M42 34a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm6 4a2 0 1 0 0-4 2 2 0 0 0 0 4z" fill="currentColor" stroke="none"/>
        </svg>
        <span>${game.consoleName}</span>
      </div>
      <div class="tile-badges">
        ${game.updatePath ? '<span class="tile-badge update-badge" title="Update available">UPD</span>' : ''}
        ${game.dlcPaths && game.dlcPaths.length ? '<span class="tile-badge dlc-badge" title="DLC available">DLC</span>' : ''}
      </div>
      <div class="tile-overlay">
        <div class="tile-title">${game.title}</div>
        <div class="tile-console">${game.consoleName}</div>
      </div>
    `;

    tile.addEventListener('click', () => {
      const idx = _currentGames.findIndex(g => g.id === game.id);
      if (idx === _selectedIndex) launchSelected();
      else _select(idx, true);
    });

    tile.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const idx = _currentGames.findIndex(g => g.id === game.id);
      if (idx !== _selectedIndex) _select(idx, true);
      _openContextMenu(game, e.clientX, e.clientY);
    });

    return tile;
  }

  function _applyTileSize(tile, gameId) {
    _enforceTileConstraints(tile, gameId);
  }

  function _buildPlaceholder(slotIndex) {
    const t = document.createElement('div');
    const custom = _customTiles.find(ct => ct.slot === slotIndex);

    if (custom) {
      t.className = 'game-tile';
      t.dataset.slot = slotIndex;
      if (custom.type === 'image') {
        t.style.backgroundImage = `url("${_fileUrl(custom.path)}")`;
        t.style.backgroundSize = 'cover';
        t.style.backgroundPosition = 'center';
        t.classList.add('custom-img-tile');
        t.style.opacity = '1';
      } else if (custom.type === 'link') {
        const hostname = (() => { try { return new URL(custom.url).hostname; } catch { return custom.url; } })();
        const faviconUrl = hostname ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64` : '';
        const title = custom.displayText || custom.title || hostname || 'Link';
        const globeSvg = `<svg class="link-tile-globe" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/></svg>`;
        t.innerHTML = `
          <div class="custom-link-tile-inner">
            <div class="link-tile-icon-wrap">
              ${faviconUrl ? `<img src="${faviconUrl}" alt="" class="link-tile-favicon" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><span class="link-tile-globe-fallback" style="display:none">${globeSvg}</span>` : `<span class="link-tile-globe-fallback">${globeSvg}</span>`}
            </div>
            <span class="link-tile-title">${title}</span>
            <span class="link-tile-domain">${hostname}</span>
          </div>`;
        t.classList.add('custom-link-tile');
        t.style.opacity = '1';
        t.addEventListener('click', () => { try { window.open(custom.url, '_blank'); } catch {} });
      } else if (custom.type === 'folder') {
        const folderLabel = custom.displayText || 'Folder';
        const folderSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" width="22" height="22"><path d="M3 4h7l2 2h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg>`;
        if (custom.coverPath) {
          // Cover image mode: photo bg + gradient + name label at bottom
          t.innerHTML = `
            <img class="folder-cover-img" src="${_fileUrl(custom.coverPath)}" alt="" onerror="this.style.display='none'" />
            <div class="folder-cover-label">${folderSvg}<span>${folderLabel}</span></div>`;
          t.classList.add('custom-folder-tile', 'has-cover');
        } else {
          t.innerHTML = `<div class="custom-tile-body">${folderSvg}<span>${folderLabel}</span></div>`;
          t.classList.add('custom-folder-tile');
        }
        t.style.opacity = '1';
        const folderPath = custom.path; // open the selected folder itself
        t.addEventListener('click', () => window.api.fs.openFolder(folderPath));
      }
      // Apply stored size (persisted from a previous resize action)
      if (custom.size) _applyCustomTileSize(t, custom);

      t.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        _openEmptyTileMenu(t, e.clientX, e.clientY);
      });
      return t;
    }

    t.className = 'game-tile placeholder';
    t.dataset.slot = slotIndex;
    t.innerHTML = '<div class="empty-tile-inner"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>';
    t.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      _openEmptyTileMenu(t, e.clientX, e.clientY);
    });
    return t;
  }

  function renderGames(games) {
    _currentGames = games;
    _selectedIndex = Math.min(_selectedIndex, Math.max(0, games.length - 1));

    track.querySelectorAll('.game-tile').forEach(t => t.remove());

    const hasGames = games.length > 0;
    games.forEach(game => track.insertBefore(_buildTile(game), emptyMsg));
    emptyMsg.classList.toggle('hidden', hasGames);

    // Calculate responsive grid dimensions
    _calculateGridDimensions();

    // Add placeholders to fill grid — always fill to at least MIN_COLS × MIN_ROWS
    const usedSlots = hasGames ? games.length : 1;
    const minSlots = _gridCols * MIN_ROWS;
    const targetSlots = Math.max(minSlots, Math.ceil(usedSlots / _gridCols) * _gridCols);
    const fillCount = targetSlots - usedSlots;
    for (let i = 0; i < fillCount; i++) track.appendChild(_buildPlaceholder(usedSlots + i));

    if (!hasGames) { _updateInfoPanel(null); return; }
    _applyGridLayout();
    _updateInfoPanel(games[_selectedIndex]);
  }

  function _applyGridLayout() {
    const tiles = Array.from(track.querySelectorAll('.game-tile:not(.placeholder)'));
    tiles.forEach((tile, i) => tile.classList.toggle('active', i === _selectedIndex));
    if (tiles[_selectedIndex]) {
      tiles[_selectedIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function _select(index, animate = true) {
    if (!_currentGames.length) return;
    _selectedIndex = Math.max(0, Math.min(index, _currentGames.length - 1));
    _applyGridLayout();
    _updateInfoPanel(_currentGames[_selectedIndex], animate);
    _updateBackground(_currentGames[_selectedIndex]);
  }

  function prev() { if (_selectedIndex > 0) { _select(_selectedIndex - 1); Sfx?.play('nav'); } }
  function next() { if (_selectedIndex < _currentGames.length - 1) { _select(_selectedIndex + 1); Sfx?.play('nav'); } }
  function up() { if (_selectedIndex >= _gridCols) { _select(_selectedIndex - _gridCols); Sfx?.play('nav'); } }
  function down() { if (_selectedIndex + _gridCols < _currentGames.length) { _select(_selectedIndex + _gridCols); Sfx?.play('nav'); } }

  function _updateInfoPanel(game, animate = true) {
    const titleEl = document.getElementById('game-title');
    const consoleEl = document.getElementById('game-console');
    const emulatorEl = document.getElementById('game-emulator');
    const descEl = document.getElementById('game-description');
    const lastPlayedEl = document.getElementById('game-last-played');
    const playtimeEl = document.getElementById('game-playtime');
    const launchBtn = document.getElementById('launch-btn');
    const favBtn = document.getElementById('favorite-btn');
    const favOutline = document.getElementById('fav-icon-outline');
    const favFilled = document.getElementById('fav-icon-filled');
    const addColBtn = document.getElementById('add-to-col-btn');

    if (!game) {
      if (titleEl) titleEl.textContent = 'Select a Game';
      if (descEl) descEl.textContent = 'Browse your library and select a game to see details.';
      if (consoleEl) consoleEl.textContent = '';
      if (emulatorEl) emulatorEl.textContent = '';
      if (lastPlayedEl) lastPlayedEl.textContent = '—';
      if (playtimeEl) playtimeEl.textContent = '—';
      if (launchBtn) launchBtn.disabled = true;
      if (favBtn) favBtn.disabled = true;
      if (addColBtn) addColBtn.disabled = true;
      document.getElementById('game-extra-meta')?.classList.add('hidden');
      const genresEl = document.getElementById('game-genres');
      if (genresEl) genresEl.innerHTML = '';
      const updateDlcEl = document.getElementById('game-updatedlc');
      if (updateDlcEl) { updateDlcEl.innerHTML = ''; updateDlcEl.classList.add('hidden'); }
      return;
    }

    if (animate) {
      const panel = document.getElementById('game-info-panel');
      panel?.classList.remove('fade-in');
      void panel?.offsetWidth;
      panel?.classList.add('fade-in');
    }

    const record = Library.getRecord(game.id);
    if (titleEl) titleEl.textContent = game.title;
    if (consoleEl) consoleEl.textContent = game.consoleName;
    if (emulatorEl) emulatorEl.textContent = EmulatorManager.getEmulatorName(game.console);
    if (descEl) descEl.textContent = game.description || 'No description available.';
    if (lastPlayedEl) lastPlayedEl.textContent = Library.formatLastPlayed(record.lastPlayed);
    if (playtimeEl) playtimeEl.textContent = Library.formatPlayTime(record.playTime);

    const extraMeta = document.getElementById('game-extra-meta');
    const devEl = document.getElementById('game-developer');
    const yearEl = document.getElementById('game-year');
    if (extraMeta && devEl && yearEl) {
      const hasExtra = !!(game.developer || game.releaseYear);
      extraMeta.classList.toggle('hidden', !hasExtra);
      devEl.textContent = game.developer || '';
      yearEl.textContent = game.releaseYear ? String(game.releaseYear) : '';
      devEl.classList.toggle('hidden', !game.developer);
      yearEl.classList.toggle('hidden', !game.releaseYear);
    }

    const genresEl = document.getElementById('game-genres');
    if (genresEl) {
      genresEl.innerHTML = (game.genres || []).map(g => `<span class="genre-tag">${g}</span>`).join('');
    }

    if (launchBtn) launchBtn.disabled = false;
    if (favBtn) favBtn.disabled = false;
    if (addColBtn) addColBtn.disabled = false;

    const isFav = !!record.favorite;
    favOutline?.classList.toggle('hidden', isFav);
    favFilled?.classList.toggle('hidden', !isFav);

    // Update / DLC info in panel
    const updateDlcEl = document.getElementById('game-updatedlc');
    if (updateDlcEl) {
      const parts = [];
      if (game.updatePath) {
        const updName = game.updatePath.replace(/[/\\][^/\\]+$/, '').replace(/[/\\]/g, ' › ');
        parts.push(`<span class="ud-item update-item"><span class="ud-label">Update</span> ${updName}</span>`);
      }
      if (game.dlcPaths && game.dlcPaths.length) {
        game.dlcPaths.forEach(p => {
          const dlcName = p.replace(/[/\\][^/\\]+$/, '').replace(/[/\\]/g, ' › ');
          parts.push(`<span class="ud-item dlc-item"><span class="ud-label">DLC</span> ${dlcName}</span>`);
        });
      }
      updateDlcEl.innerHTML = parts.join('');
      updateDlcEl.classList.toggle('hidden', !parts.length);
    }
  }

  function _updateBackground(game) {
    const bgImage = document.getElementById('bg-image');
    if (!bgImage) return;
    bgImage.style.backgroundImage = game?.coverPath ? `url("${_fileUrl(game.coverPath)}")` : '';
  }

  function _openContextMenu(game, x, y) {
    _ctxGame = game;
    const menu = document.getElementById('game-context-menu');
    if (!menu) return;
    Sfx?.play('open');

    const showUpdate = !!game.updatePath;
    const hasDlc = game.dlcPaths && game.dlcPaths.length > 0;
    const showMain = showUpdate || hasDlc;
    document.getElementById('ctx-update-sep')?.classList.toggle('hidden', !showUpdate);
    document.getElementById('ctx-launch-update')?.classList.toggle('hidden', !showUpdate);
    document.getElementById('ctx-dlc-sep')?.classList.toggle('hidden', !hasDlc);
    document.getElementById('ctx-launch-dlc')?.classList.toggle('hidden', !hasDlc);
    document.getElementById('ctx-main-sep')?.classList.toggle('hidden', !showMain);
    document.getElementById('ctx-launch-main')?.classList.toggle('hidden', !showMain);

    menu.classList.remove('hidden');
    const vw = window.innerWidth, vh = window.innerHeight;
    menu.style.left = Math.min(x, vw - 200) + 'px';
    menu.style.top = Math.min(y, vh - 220) + 'px';
  }

  function _closeContextMenu() {
    document.getElementById('game-context-menu')?.classList.add('hidden');
    _ctxGame = null;
  }

  let _emptyTileEl = null;
  let openUrlDialog = null; // Will be set in init()

  function _openEmptyTileMenu(tileEl, x, y) {
    _emptyTileEl = tileEl;
    const menu = document.getElementById('empty-tile-menu');
    if (!menu) return;

    const slot    = parseInt(tileEl?.dataset?.slot, 10);
    const custom  = isNaN(slot) ? null : _customTiles.find(ct => ct.slot === slot);
    const isLink  = custom?.type === 'link';
    const hasCustom = !!custom;

    // Dynamic label
    const labelEl = document.getElementById('ctx-tile-label');
    if (labelEl) labelEl.textContent = isLink ? (custom.displayText || 'Link Tile') : hasCustom ? 'Custom Tile' : 'Empty Slot';

    const isFolder = custom?.type === 'folder';
    const hasCover = isFolder && !!custom.coverPath;

    // Folder-specific items
    const _show = (id, visible) => document.getElementById(id)?.classList.toggle('hidden', !visible);
    _show('ctx-set-folder-cover',    isFolder);
    _show('ctx-remove-folder-cover', isFolder && hasCover);
    _show('ctx-folder-sep',          isFolder);

    // Link-specific items (only for link tiles)
    _show('ctx-edit-link',    isLink);
    _show('ctx-open-link',    isLink);
    _show('ctx-link-sep',     isLink);

    // "Add" items only appear on empty slots
    _show('ctx-pin-game',     !hasCustom);
    _show('ctx-add-image',    !hasCustom);
    _show('ctx-add-link',     !hasCustom);
    _show('ctx-add-folder',   !hasCustom);

    // "Remove" only appears when there is something to remove
    _show('ctx-remove-custom', hasCustom);

    // Resize actions appear for all custom tiles
    _show('ctx-resize-sep',   hasCustom);
    _show('ctx-resize-1x1',   hasCustom);
    _show('ctx-resize-w2',    hasCustom);
    _show('ctx-resize-h2',    hasCustom);
    _show('ctx-resize-w2h2',  hasCustom);

    menu.classList.remove('hidden');
    const vw = window.innerWidth, vh = window.innerHeight;
    menu.style.left = Math.min(x, vw - 210) + 'px';
    menu.style.top  = Math.min(y, vh - 240) + 'px';
  }

  function _closeEmptyTileMenu() {
    document.getElementById('empty-tile-menu')?.classList.add('hidden');
    _emptyTileEl = null;
  }

  async function _handleEmptyTileAction(action) {
    const tileEl = _emptyTileEl;
    const slot = parseInt(tileEl?.dataset?.slot, 10);
    _closeEmptyTileMenu();

    if (action === 'add-image') {
      const fp = await window.api.dialog.openFile([{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]);
      if (!fp || !tileEl) return;
      _customTiles = _customTiles.filter(ct => ct.slot !== slot);
      _customTiles.push({ slot, type: 'image', path: fp });
      await _saveTileLayout();
      renderCurrentPage();
      App.showToast('Image tile added');
    } else if (action === 'add-link') {
      if (isNaN(slot)) return;
      openUrlDialog(null, slot);
    } else if (action === 'add-folder') {
      const fp = await window.api.dialog.openFolder();
      if (!fp || !tileEl) return;
      const name = fp.replace(/\\/g, '/').split('/').filter(Boolean).pop() || 'Folder';
      const dirPath = fp.replace(/[/\\][^/\\]+$/, '');
      _customTiles = _customTiles.filter(ct => ct.slot !== slot);
      _customTiles.push({ slot, type: 'folder', path: fp, dirPath, displayText: name });
      await _saveTileLayout();
      renderCurrentPage();
      App.showToast('Folder tile added');
    } else if (action === 'remove-custom') {
      _customTiles = _customTiles.filter(ct => ct.slot !== slot);
      await _saveTileLayout();
      renderCurrentPage();
      App.showToast('Custom tile removed');
    } else if (action === 'pin-game') {
      openSearch();
    } else if (action.startsWith('resize-')) {
      const sz = action.replace('resize-', '');
      const customIdx = _customTiles.findIndex(ct => ct.slot === slot);
      if (customIdx !== -1) {
        if (sz === '1x1') delete _customTiles[customIdx].size;
        else _customTiles[customIdx].size = sz;
        await _saveTileLayout();
        // Apply the new size immediately to the live tile element
        const existingTile = track.querySelector(`.game-tile[data-slot="${slot}"]`);
        if (existingTile) _applyCustomTileSize(existingTile, _customTiles[customIdx]);
        _calculateGridDimensions();
        // Reapply constraints for all game tiles after grid may have shifted
        track.querySelectorAll('.game-tile[data-id]').forEach(el => _enforceTileConstraints(el, el.dataset.id));
        App.showToast('Tile resized');
      }
    } else if (action === 'open-link') {
      const custom = _customTiles.find(ct => ct.slot === slot);
      if (custom?.url) { try { window.open(custom.url, '_blank'); } catch {} }
    } else if (action === 'edit-link') {
      const custom = _customTiles.find(ct => ct.slot === slot);
      if (custom) openUrlDialog(custom);
    } else if (action === 'set-folder-cover') {
      const fp = await window.api.dialog.openFile([{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }]);
      if (fp) {
        const customIdx = _customTiles.findIndex(ct => ct.slot === slot);
        if (customIdx !== -1) {
          _customTiles[customIdx].coverPath = fp;
          await _saveTileLayout();
          renderCurrentPage();
          App.showToast('Cover image set');
        }
      }
    } else if (action === 'remove-folder-cover') {
      const customIdx = _customTiles.findIndex(ct => ct.slot === slot);
      if (customIdx !== -1) {
        delete _customTiles[customIdx].coverPath;
        await _saveTileLayout();
        renderCurrentPage();
        App.showToast('Cover removed');
      }
    }
  }

  async function _handleContextAction(action) {
    const game = _ctxGame;
    _closeContextMenu();
    if (!game) return;

    if (action === 'launch') {
      EmulatorManager.launch(game, Settings.getData());
    } else if (action === 'launch-update') {
      EmulatorManager.launch(game, Settings.getData(), 'update');
    } else if (action === 'launch-dlc') {
      EmulatorManager.launch(game, Settings.getData(), 'dlc');
    } else if (action === 'launch-main') {
      EmulatorManager.launch(game, Settings.getData(), 'main');
    } else if (action === 'favorite') {
      const isFav = Library.toggleFavorite(game.id);
      await Storage.savePlayData(Library.getPlayData());
      _updateInfoPanel(game, false);
      App.showToast(isFav ? '♥ Added to Favorites' : 'Removed from Favorites');
    } else if (action === 'collection') {
      setTimeout(() => _openColPicker(), 50);
    } else if (action === 'edit-details') {
      _openEditDetails(game);
    } else if (action === 'open-location') {
      const dir = game.path.replace(/[/\\][^/\\]+$/, '');
      await window.api.fs.openFolder(dir);
    } else if (action.startsWith('resize-')) {
      const sz = action.replace('resize-', '');
      if (sz === '1x1') delete _tileSizes[game.id];
      else _tileSizes[game.id] = sz;
      const tileEl = track.querySelector(`.game-tile[data-id="${game.id}"]`);
      if (tileEl) _applyTileSize(tileEl, game.id);
      _calculateGridDimensions();
      track.querySelectorAll('.game-tile[data-id]').forEach(el => _enforceTileConstraints(el, el.dataset.id));
      await _saveTileLayout();
    }
  }

  let _editGame = null;
  let _editTempCoverPath = null;

  function _openEditDetails(game) {
    _editGame = game;
    _editTempCoverPath = game.coverPath || null;
    document.getElementById('edit-details-title').textContent = 'Edit: ' + game.title;
    document.getElementById('edit-title-input').value = game.title || '';
    document.getElementById('edit-desc-input').value = game.description || '';
    document.getElementById('edit-genre-input').value = (game.genres || []).join(', ');
    document.getElementById('edit-dev-input').value = game.developer || '';
    document.getElementById('edit-year-input').value = game.releaseYear || '';
    _refreshEditCoverPreview();
    document.getElementById('edit-details-overlay')?.classList.remove('hidden');
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
      preview.innerHTML = `<img src="${_fileUrl(_editTempCoverPath)}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;" />`;
    } else {
      preview.innerHTML = `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48"><rect x="8" y="20" width="48" height="32" rx="4"/><path d="M22 36h8m-4-4v8" fill="currentColor" stroke="none"/></svg>`;
    }
  }

  async function _saveEditDetails() {
    if (!_editGame) return;
    const game = _editGame;
    game.title = document.getElementById('edit-title-input').value.trim() || game.title;
    game.description = document.getElementById('edit-desc-input').value.trim();
    game.genres = document.getElementById('edit-genre-input').value.split(',').map(s => s.trim()).filter(Boolean);
    game.developer = document.getElementById('edit-dev-input').value.trim();
    game.releaseYear = parseInt(document.getElementById('edit-year-input').value) || null;
    if (_editTempCoverPath !== undefined) game.coverPath = _editTempCoverPath;

    const allMeta = (await Storage.loadGameMeta()).meta || {};
    allMeta[game.id] = { title: game.title, description: game.description, genres: game.genres, developer: game.developer, releaseYear: game.releaseYear, coverPath: game.coverPath, updatePath: game.updatePath, dlcPaths: game.dlcPaths };
    await Storage.saveGameMeta({ meta: allMeta });
    _closeEditDetails();
    _updateInfoPanel(game, false);
    renderCurrentPage();
    if (typeof ConsoleLibrary !== 'undefined' && typeof ConsoleLibrary.refreshCurrentGameGrid === 'function') {
      ConsoleLibrary.refreshCurrentGameGrid();
    }
    App.showToast('Details saved');
  }

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
          if (inCol) col.games = col.games.filter(id => id !== game.id);
          else col.games.push(game.id);
          await Storage.saveCollections({ collections: Library.getCollections() });
          _openColPicker();
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

  function _applySort(games) {
    const sorted = [...games];
    switch (_sortOrder) {
      case 'za': sorted.sort((a, b) => b.title.localeCompare(a.title)); break;
      case 'most-played': sorted.sort((a, b) => (Library.getRecord(b.id).playCount || 0) - (Library.getRecord(a.id).playCount || 0)); break;
      case 'last-played': sorted.sort((a, b) => { const da = Library.getRecord(a.id).lastPlayed || ''; const db = Library.getRecord(b.id).lastPlayed || ''; return db > da ? 1 : -1; }); break;
      case 'recently-added': sorted.reverse(); break;
      default: sorted.sort((a, b) => a.title.localeCompare(b.title)); break;
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
    renderGames(_applySort(games));
  }

  function renderCollectionTabs() {
    const list = document.getElementById('category-list');
    if (!list) return;

    // Remove previously rendered collection tabs
    list.querySelectorAll('.category-tab[data-category="collection"]').forEach(t => t.remove());

    // Add a tab for every user collection
    Library.getCollections().forEach(col => {
      const tab = document.createElement('button');
      tab.className = 'category-tab';
      tab.dataset.category = 'collection';
      tab.dataset.collection = col.name;
      tab.textContent = col.name;
      list.appendChild(tab);
      // Click is handled by the delegated listener on #category-list in init()
    });
  }

  function setActiveTab(activeEl) {
    document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
    activeEl.classList.add('active');
  }

  function openSearch() { Music.duck(); Sfx?.play('open'); document.getElementById('search-overlay')?.classList.remove('hidden'); document.getElementById('search-input')?.focus(); }
  function closeSearch() { Music.unduck(); Sfx?.play('close'); document.getElementById('search-overlay')?.classList.add('hidden'); document.getElementById('search-input').value = ''; document.getElementById('search-results').innerHTML = ''; }

  function _renderSearchResults(results) {
    const container = document.getElementById('search-results');
    if (!results.length) { container.innerHTML = '<div class="search-no-results">No results found.</div>'; return; }
    container.innerHTML = '';
    results.forEach(game => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.innerHTML = `${game.coverPath ? `<img src="${_fileUrl(game.coverPath)}" alt="${game.title}" />` : `<div style="width:40px;height:56px;background:var(--bg3);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--text3);font-weight:700;">${game.consoleName}</div>`}<div class="search-result-info"><h4>${game.title}</h4><span>${game.consoleName}</span></div>`;
      item.addEventListener('click', () => {
        closeSearch();
        const allGames = Library.filter('all');
        const idx = allGames.findIndex(g => g.id === game.id);
        if (idx !== -1) { document.querySelector('.category-tab[data-category="all"]')?.click(); setTimeout(() => _select(idx), 100); }
      });
      container.appendChild(item);
    });
  }

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
    overlays.forEach(id => { const el = document.getElementById(id); if (el && !el.classList.contains('hidden')) { el.classList.add('hidden'); any = true; } });
    if (!document.getElementById('col-picker')?.classList.contains('hidden')) { _closeColPicker(); any = true; }
    if (any) Sfx?.play('back');
    else document.querySelector('.category-tab[data-category="all"]')?.click();
  }

  function init() {
    const gridSearch = document.getElementById('grid-search');
    const gridSearchClear = document.getElementById('grid-search-clear');

    // URL Dialog handlers
    const urlDialog = document.getElementById('url-dialog');
    const urlInput = document.getElementById('url-input');
    const urlDialogClose = document.getElementById('url-dialog-close');
    const urlDialogCancel = document.getElementById('url-dialog-cancel');
    const urlDialogAdd = document.getElementById('url-dialog-add');

    const urlTitleInput  = document.getElementById('url-title-input');
    const urlDescInput   = document.getElementById('url-desc-input');
    const urlFetchBtn    = document.getElementById('url-fetch-info-btn');
    const urlMetaPreview = document.getElementById('url-meta-preview');
    const urlMetaFavicon = document.getElementById('url-meta-favicon');
    const urlMetaTitle   = document.getElementById('url-meta-title');
    const urlMetaHostname= document.getElementById('url-meta-hostname');

    let _urlDialogEditSlot = null; // null = add mode, number = edit mode
    let _urlDialogTargetSlot = null; // slot captured when opening add dialog (survives menu close)

    const _resetUrlDialog = () => {
      _urlDialogEditSlot = null;
      _urlDialogTargetSlot = null;
      if (urlTitleInput)  urlTitleInput.value  = '';
      if (urlDescInput)   urlDescInput.value   = '';
      if (urlMetaPreview) urlMetaPreview.classList.add('hidden');
      if (urlMetaFavicon) urlMetaFavicon.src   = '';
      if (urlMetaTitle)   urlMetaTitle.textContent  = '';
      if (urlMetaHostname)urlMetaHostname.textContent = '';
      if (urlFetchBtn)    { urlFetchBtn.textContent = 'Fetch Info'; urlFetchBtn.disabled = false; }
      // Reset title bar and button
      const titleEl = document.getElementById('url-dialog-title');
      if (titleEl) titleEl.textContent = 'Add Web Link';
      if (urlDialogAdd) { urlDialogAdd.textContent = 'Add Link'; }
    };

    // openUrlDialog accepts an optional existingLink object to enter edit mode,
    // or a targetSlot number when adding a link to a specific empty tile.
    openUrlDialog = (existingLink, targetSlot) => {
      urlDialog?.classList.remove('hidden');
      _resetUrlDialog();
      if (existingLink) {
        // Edit mode: pre-fill all fields from the stored tile
        _urlDialogEditSlot = existingLink.slot;
        if (urlInput) urlInput.value = existingLink.url || '';
        if (urlTitleInput) urlTitleInput.value = existingLink.displayText || '';
        if (urlDescInput) urlDescInput.value = existingLink.description || '';
        // Show the metadata preview with the stored favicon
        const hostname = existingLink.hostname || (() => { try { return new URL(existingLink.url).hostname; } catch { return existingLink.url; } })();
        if (urlMetaFavicon && urlMetaTitle && urlMetaHostname && urlMetaPreview) {
          urlMetaFavicon.src = hostname ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64` : '';
          urlMetaTitle.textContent = existingLink.displayText || hostname;
          urlMetaHostname.textContent = hostname;
          urlMetaPreview.classList.remove('hidden');
        }
        const titleEl = document.getElementById('url-dialog-title');
        if (titleEl) titleEl.textContent = 'Edit Web Link';
        if (urlDialogAdd) urlDialogAdd.textContent = 'Save Changes';
      } else {
        // Add mode — persist slot before the context menu closes and clears _emptyTileEl
        _urlDialogTargetSlot = targetSlot ?? parseInt(_emptyTileEl?.dataset?.slot, 10);
        if (urlInput) { urlInput.value = 'https://'; urlInput.focus(); urlInput.select(); }
      }
    };

    const closeUrlDialog = () => {
      urlDialog?.classList.add('hidden');
      _resetUrlDialog();
    };

    urlFetchBtn?.addEventListener('click', async () => {
      const url = urlInput?.value.trim();
      if (!url || url === 'https://') return;
      urlFetchBtn.textContent = 'Fetching…';
      urlFetchBtn.disabled = true;
      try {
        const hostname = (() => { try { return new URL(url).hostname; } catch { return url; } })();
        const meta = await _fetchLinkMeta(url);
        if (urlMetaPreview && urlMetaFavicon && urlMetaTitle && urlMetaHostname) {
          urlMetaFavicon.src = hostname ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64` : '';
          urlMetaTitle.textContent = meta?.title || hostname;
          urlMetaHostname.textContent = hostname;
          urlMetaPreview.classList.remove('hidden');
        }
        if (meta?.title && urlTitleInput && !urlTitleInput.value) urlTitleInput.value = meta.title;
        if (meta?.description && urlDescInput && !urlDescInput.value) urlDescInput.value = meta.description;
        App.showToast(meta?.title ? `Found: ${meta.title}` : 'No metadata found — enter a title manually');
      } catch (e) {
        App.showToast('Could not reach URL — check the address');
      }
      urlFetchBtn.textContent = 'Fetch Info';
      urlFetchBtn.disabled = false;
    });

    const addUrlLink = async () => {
      const url = urlInput?.value.trim();
      if (!url || url === 'https://') { closeUrlDialog(); return; }

      const slot = _urlDialogEditSlot !== null ? _urlDialogEditSlot : _urlDialogTargetSlot;
      if (slot == null || isNaN(slot)) { closeUrlDialog(); return; }

      const isEditing = _urlDialogEditSlot !== null;
      const hostname = (() => { try { return new URL(url).hostname; } catch { return url; } })();
      const customTitle = urlTitleInput?.value.trim() || hostname;
      const customDesc  = urlDescInput?.value.trim() || '';

      _customTiles = _customTiles.filter(ct => ct.slot !== slot);
      _customTiles.push({ slot, type: 'link', url, hostname, displayText: customTitle, description: customDesc });
      await _saveTileLayout();
      closeUrlDialog();
      renderCurrentPage();
      App.showToast(isEditing ? 'Link updated' : 'Link tile added');
    };

    urlDialogClose?.addEventListener('click', closeUrlDialog);
    urlDialogCancel?.addEventListener('click', closeUrlDialog);
    urlDialogAdd?.addEventListener('click', addUrlLink);
    urlInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addUrlLink();
      if (e.key === 'Escape') closeUrlDialog();
    });
    urlDialog?.addEventListener('click', (e) => {
      if (e.target.id === 'url-dialog') closeUrlDialog();
    });

    // Responsive grid recalculation on window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (_currentGames.length > 0) {
          _calculateGridDimensions();
          // Reapply tile sizes with new constraints
          const tiles = Array.from(track.querySelectorAll('.game-tile[data-id]'));
          tiles.forEach(tile => {
            _enforceTileConstraints(tile, tile.dataset.id);
          });
        }
      }, 150);
    });

    // Use event delegation on the category list so dynamically-added collection
    // tabs are handled automatically without re-attaching listeners.
    document.getElementById('category-list')?.addEventListener('click', (e) => {
      const tab = e.target.closest('.category-tab');
      if (!tab) return;
      if (_searchQuery) { if (gridSearch) gridSearch.value = ''; _searchQuery = ''; gridSearchClear?.classList.add('hidden'); }
      setActiveTab(tab);
      switchCategory(tab.dataset.category, tab.dataset.collection);
    });

    document.getElementById('launch-btn')?.addEventListener('click', launchSelected);
    document.getElementById('favorite-btn')?.addEventListener('click', toggleFavorite);
    document.getElementById('add-to-col-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const picker = document.getElementById('col-picker');
      if (picker?.classList.contains('hidden')) _openColPicker();
      else _closeColPicker();
    });
    document.getElementById('col-picker-close')?.addEventListener('click', (e) => { e.stopPropagation(); _closeColPicker(); });
    document.addEventListener('click', (e) => {
      if (!document.getElementById('add-to-col-btn')?.contains(e.target) && !document.getElementById('col-picker')?.contains(e.target)) _closeColPicker();
    });
    document.getElementById('home-btn')?.addEventListener('click', () => {
      closeOverlays();
      try { ConsoleLibrary.close(); } catch {}
      document.getElementById('main-content')?.classList.remove('collections-open');
      document.querySelector('.category-tab[data-category="all"]')?.click();
    });
    document.getElementById('search-btn')?.addEventListener('click', openSearch);
    document.getElementById('search-close')?.addEventListener('click', closeSearch);
    document.getElementById('search-overlay')?.addEventListener('click', (e) => { if (e.target.id === 'search-overlay') closeSearch(); });
    document.getElementById('search-input')?.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      if (!q) { document.getElementById('search-results').innerHTML = ''; return; }
      _renderSearchResults(Library.search(q));
    });
    document.getElementById('add-collection-btn')?.addEventListener('click', () => { document.getElementById('collection-overlay')?.classList.remove('hidden'); document.getElementById('collection-name-input')?.focus(); });
    document.getElementById('collection-close')?.addEventListener('click', () => { document.getElementById('collection-overlay')?.classList.add('hidden'); });
    document.getElementById('collection-cancel-btn')?.addEventListener('click', () => { document.getElementById('collection-overlay')?.classList.add('hidden'); });
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
    document.getElementById('edit-details-close')?.addEventListener('click', _closeEditDetails);
    document.getElementById('edit-details-cancel')?.addEventListener('click', _closeEditDetails);
    document.getElementById('edit-details-overlay')?.addEventListener('click', (e) => { if (e.target.id === 'edit-details-overlay') _closeEditDetails(); });
    document.getElementById('edit-details-save')?.addEventListener('click', _saveEditDetails);
    document.getElementById('edit-cover-browse')?.addEventListener('click', async () => { const fp = await window.api.dialog.openFile([{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]); if (!fp) return; _editTempCoverPath = fp; _refreshEditCoverPreview(); });
    document.getElementById('edit-cover-clear')?.addEventListener('click', () => { _editTempCoverPath = null; _refreshEditCoverPreview(); });
    document.getElementById('game-context-menu')?.addEventListener('click', (e) => { const btn = e.target.closest('.ctx-item'); if (btn) _handleContextAction(btn.dataset.action); });
    document.addEventListener('click', (e) => { if (!document.getElementById('game-context-menu')?.contains(e.target)) _closeContextMenu(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') _closeContextMenu(); });
    const gridSort = document.getElementById('grid-sort');
    if (gridSort) gridSort.addEventListener('change', () => { _sortOrder = gridSort.value; switchCategory(_currentCategory, _currentCollection); });
    if (gridSearch) {
      gridSearch.addEventListener('input', () => { _searchQuery = gridSearch.value.trim(); gridSearchClear?.classList.toggle('hidden', !_searchQuery); switchCategory(_currentCategory, _currentCollection); });
      gridSearch.addEventListener('keydown', (e) => { if (e.key === 'Escape') { gridSearch.value = ''; _searchQuery = ''; gridSearchClear?.classList.add('hidden'); switchCategory(_currentCategory, _currentCollection); gridSearch.blur(); } });
    }
    if (gridSearchClear) gridSearchClear.addEventListener('click', () => { if (gridSearch) gridSearch.value = ''; _searchQuery = ''; gridSearchClear.classList.add('hidden'); switchCategory(_currentCategory, _currentCollection); gridSearch?.focus(); });
    document.getElementById('empty-tile-menu')?.addEventListener('click', (e) => { const btn = e.target.closest('[data-eaction]'); if (btn) _handleEmptyTileAction(btn.dataset.eaction); });
    document.addEventListener('click', (e) => { if (!document.getElementById('empty-tile-menu')?.contains(e.target)) _closeEmptyTileMenu(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') _closeEmptyTileMenu(); });
    _setupDraggable('settings-modal', 'settings-modal .modal-title-bar');
    _setupDraggable('profile-modal', 'profile-modal .modal-title-bar');
    _setupDraggable('edit-details-modal', 'edit-details-modal .modal-title-bar');
  }

  function _setupDraggable(modalId, handleSelector) {
    const modal = document.getElementById(modalId);
    const handle = modal?.querySelector('.modal-title-bar');
    if (!modal || !handle) return;
    let dragging = false, startX = 0, startY = 0, origX = 0, origY = 0;
    handle.addEventListener('mousedown', (e) => {
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      const rect = modal.getBoundingClientRect();
      origX = rect.left; origY = rect.top;
      modal.style.position = 'fixed'; modal.style.margin = '0';
      document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', (e) => { if (!dragging) return; modal.style.left = (origX + e.clientX - startX) + 'px'; modal.style.top = (origY + e.clientY - startY) + 'px'; });
    document.addEventListener('mouseup', () => { dragging = false; document.body.style.userSelect = ''; });
  }

  async function _fetchLinkMeta(url) {
    try {
      if (!window.api?.net?.fetchBinary) return null;
      const r = await window.api.net.fetchBinary(url);
      if (!r?.ok || !r?.base64) return null;
      const binaryStr = atob(r.base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      const html = new TextDecoder('utf-8').decode(bytes);
      const ogTitle    = (html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']{1,120})["']/i)
                       || html.match(/<meta[^>]+content=["']([^"']{1,120})["'][^>]+property=["']og:title["']/i))?.[1];
      const titleTag   = html.match(/<title[^>]*>([^<]{1,120})<\/title>/i)?.[1];
      const ogDesc     = (html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{1,200})["']/i)
                       || html.match(/<meta[^>]+content=["']([^"']{1,200})["'][^>]+property=["']og:description["']/i))?.[1];
      const metaDesc   = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,200})["']/i)
                       || html.match(/<meta[^>]+content=["']([^"']{1,200})["'][^>]+name=["']description["']/i))?.[1];
      const title = (ogTitle || titleTag || '').trim();
      const description = (ogDesc || metaDesc || '').trim();
      return title || description ? { title, description } : null;
    } catch { return null; }
  }

  function renderCurrentPage() { switchCategory(_currentCategory, _currentCollection); }
  function selectByIndex(idx) { if (idx >= 0 && idx < _currentGames.length) _select(idx, true); }

  const grid = { prev, next, up, down, selectByIndex };

  return {
    init, switchCategory, renderGames, renderCollectionTabs,
    openSearch, closeSearch, closeOverlays,
    launchSelected, toggleFavorite, setActiveTab,
    renderCurrentPage, loadTileLayout: _loadTileLayout,
    openEditDetails: _openEditDetails,
    grid,
    getSelectedGame: () => _currentGames[_selectedIndex],
    getSelectedIndex: () => _selectedIndex,
  };
})();