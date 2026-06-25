/* ── ENI Bexder — Cover Art Scraper ───────────────────────────────────── */
/* Uses libretro-thumbnails (GitHub) — no API key required.                 */

const CoverScraper = (() => {

  const SYSTEM_MAP = {
    nes:       'Nintendo - Nintendo Entertainment System',
    snes:      'Nintendo - Super Nintendo Entertainment System',
    n64:       'Nintendo - Nintendo 64',
    gamecube:  'Nintendo - GameCube',
    wii:       'Nintendo - Wii',
    wiiu:      'Nintendo - Wii U',
    switch:    'Nintendo - Nintendo Switch',
    gb:        'Nintendo - Game Boy',
    gbc:       'Nintendo - Game Boy Color',
    gba:       'Nintendo - Game Boy Advance',
    ds:        'Nintendo - Nintendo DS',
    '3ds':     'Nintendo - Nintendo 3DS',
    genesis:   'Sega - Mega Drive - Genesis',
    dreamcast: 'Sega - Dreamcast',
    ps1:       'Sony - PlayStation',
    ps2:       'Sony - PlayStation 2',
    ps3:       'Sony - PlayStation 3',
    psp:       'Sony - PlayStation Portable',
    psvita:    'Sony - PlayStation Vita',
    xbox:      'Microsoft - Xbox',
    arcade:    'MAME',
  };

  function _buildUrl(consoleKey, title) {
    const system = SYSTEM_MAP[consoleKey];
    if (!system) return null;
    const encoded = encodeURIComponent(title.replace(/:/g, '_')) + '.png';
    return `https://raw.githubusercontent.com/libretro-thumbnails/${
      encodeURIComponent(system)}/master/Named_Boxarts/${encoded}`;
  }

  async function _fetchAsBase64(url) {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  async function scrapeGame(game, appDir) {
    const url = _buildUrl(game.console, game.title);
    if (!url) return false;

    const b64 = await _fetchAsBase64(url);
    if (!b64) return false;

    const safe = game.title.replace(/[<>:"/\\|?*]/g, '_');
    const destPath = appDir + '/covers/' + safe + '.png';
    const result = await window.api.fs.writeBinary(destPath, b64);
    if (!result.ok) return false;

    game.coverPath = destPath;
    return true;
  }

  async function scrapeAll(appDir, onProgress) {
    const games = Library.getAll().filter(g => !g.coverPath);
    if (games.length === 0) return { found: 0, total: 0 };

    let found = 0;
    for (let i = 0; i < games.length; i++) {
      const game = games[i];
      if (onProgress) onProgress(i + 1, games.length, game.title);
      try {
        const ok = await scrapeGame(game, appDir);
        if (ok) found++;
      } catch (_) {}
    }
    return { found, total: games.length };
  }

  return { scrapeAll, scrapeGame };
})();
