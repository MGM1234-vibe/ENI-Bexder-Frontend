/* ── ENI Bexder — Game Library ────────────────────────────────────────── */

const Library = (() => {
  const CONSOLE_MAP = {
    nes:       { name: 'NES',       category: 'nintendo' },
    snes:      { name: 'SNES',      category: 'nintendo' },
    n64:       { name: 'N64',       category: 'nintendo' },
    gamecube:  { name: 'GameCube',  category: 'nintendo' },
    wii:       { name: 'Wii',       category: 'nintendo' },
    wiiu:      { name: 'Wii U',     category: 'nintendo' },
    switch:    { name: 'Switch',    category: 'nintendo' },
    gb:        { name: 'Game Boy',  category: 'nintendo' },
    gbc:       { name: 'GBC',       category: 'nintendo' },
    gba:       { name: 'GBA',       category: 'nintendo' },
    ds:        { name: 'DS',        category: 'nintendo' },
    '3ds':     { name: '3DS',       category: 'nintendo' },
    genesis:   { name: 'Genesis',   category: 'arcade' },
    dreamcast: { name: 'Dreamcast', category: 'arcade' },
    ps1:       { name: 'PS1',       category: 'playstation' },
    ps2:       { name: 'PS2',       category: 'playstation' },
    ps3:       { name: 'PS3',       category: 'playstation' },
    psp:       { name: 'PSP',       category: 'playstation' },
    psvita:    { name: 'PS Vita',   category: 'playstation' },
    xbox:      { name: 'Xbox',      category: 'xbox' },
    arcade:    { name: 'Arcade',    category: 'arcade' },
  };

  const ROM_EXTENSIONS = ['.nes','.smc','.sfc','.z64','.n64','.v64','.iso','.cue','.bin','.gcz',
    '.rvz','.wbfs','.nsp','.xci','.gb','.gbc','.gba','.nds','.3ds','.cia',
    '.md','.gen','.gdi','.chd','.rom','.zip','.7z'];

  let _games = [];
  let _playData = {};
  let _collections = [];
  let _favorites = new Set();
  let _appDir = null;

  async function scan(appDir) {
    _appDir = appDir;
    const romsDir = appDir + '/roms';
    const dirResult = await window.api.fs.readDir(romsDir);
    if (!dirResult.ok) return;

    const found = [];
    for (const consoleDir of dirResult.files) {
      if (!consoleDir.isDirectory) continue;
      const key = consoleDir.name.toLowerCase();
      const consoleInfo = CONSOLE_MAP[key] || { name: consoleDir.name, category: 'arcade' };
      const romsResult = await window.api.fs.readDir(consoleDir.fullPath);
      if (!romsResult.ok) continue;
      for (const rom of romsResult.files) {
        if (rom.isDirectory) continue;
        const ext = rom.name.slice(rom.name.lastIndexOf('.')).toLowerCase();
        if (!ROM_EXTENSIONS.includes(ext)) continue;
        const title = rom.name.replace(/\.[^.]+$/, '').replace(/[_()[\]]/g, ' ').trim();
        const id = `${key}::${rom.name}`;
        found.push({
          id, title, console: key,
          consoleName: consoleInfo.name,
          category: consoleInfo.category,
          path: rom.fullPath,
          coverPath: '',
          description: '',
        });
      }
    }
    _games = found;
    await _loadCoverPaths();
  }

  async function _loadCoverPaths() {
    const coversDir = _appDir + '/covers';
    const result = await window.api.fs.readDir(coversDir);
    if (!result.ok) return;
    const coverMap = {};
    for (const f of result.files) {
      const base = f.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
      coverMap[base] = f.fullPath;
    }
    for (const game of _games) {
      const key = game.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (coverMap[key]) game.coverPath = coverMap[key];
    }
  }

  function loadPlayData(data) {
    _playData = data.records || {};
    for (const id of Object.keys(_playData)) {
      if (_playData[id].favorite) _favorites.add(id);
    }
  }

  function loadGameMeta(data) {
    const meta = data.meta || {};
    for (const game of _games) {
      const m = meta[game.id];
      if (!m) continue;
      if (m.title)       game.title       = m.title;
      if (m.description) game.description = m.description;
      if (m.genres)      game.genres      = m.genres;
      if (m.developer)   game.developer   = m.developer;
      if (m.releaseYear) game.releaseYear  = m.releaseYear;
      if (m.coverPath)   game.coverPath   = m.coverPath;
    }
  }

  function loadCollections(data) {
    _collections = data.collections || [];
  }

  function getRecord(id) {
    return _playData[id] || { lastPlayed: null, playTime: 0, favorite: false };
  }

  function toggleFavorite(id) {
    if (!_playData[id]) _playData[id] = { lastPlayed: null, playTime: 0, favorite: false };
    _playData[id].favorite = !_playData[id].favorite;
    if (_playData[id].favorite) _favorites.add(id);
    else _favorites.delete(id);
    return _playData[id].favorite;
  }

  function recordPlay(id) {
    if (!_playData[id]) _playData[id] = { lastPlayed: null, playTime: 0, favorite: false };
    _playData[id].lastPlayed = new Date().toISOString();
    _playData[id].playTime = (_playData[id].playTime || 0) + 1;
  }

  function getPlayData() { return { records: _playData }; }

  function formatLastPlayed(iso) {
    if (!iso) return 'Never';
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60)   return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return d.toLocaleDateString();
  }

  function formatPlayTime(minutes) {
    if (!minutes) return '0m';
    if (minutes < 60) return minutes + 'm';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  function search(query) {
    if (!query) return [];
    const q = query.toLowerCase();
    return _games.filter(g =>
      g.title.toLowerCase().includes(q) ||
      g.consoleName.toLowerCase().includes(q)
    );
  }

  function addCollection(name) {
    if (!name || _collections.find(c => c.name === name)) return;
    _collections.push({ name, games: [] });
  }

  function removeCollection(name) {
    _collections = _collections.filter(c => c.name !== name);
  }

  function filter(category, collectionName) {
    let list = [..._games];
    if (category === 'recent') {
      list = list.filter(g => _playData[g.id]?.lastPlayed)
        .sort((a, b) => new Date(_playData[b.id].lastPlayed) - new Date(_playData[a.id].lastPlayed));
    } else if (category === 'favorites') {
      list = list.filter(g => _favorites.has(g.id));
    } else if (category === 'collection' && collectionName) {
      const col = _collections.find(c => c.name === collectionName);
      if (col) list = list.filter(g => col.games.includes(g.id));
      else list = [];
    } else if (category && category !== 'all') {
      list = list.filter(g => g.category === category);
    }
    return list;
  }

  function getAll()          { return _games; }
  function getCollections()  { return _collections; }
  function getFavorites()    { return _favorites; }

  return { scan, loadPlayData, loadCollections, loadGameMeta, getRecord, toggleFavorite,
           recordPlay, getPlayData, formatLastPlayed, formatPlayTime,
           search, addCollection, removeCollection, filter, getAll, getCollections, getFavorites };
})();
