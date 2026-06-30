/* ── ENI Bexder — Emulator Config Writer ──────────────────────────────────
 *  Writes per-emulator config files BEFORE launch so every emulator setting
 *  in ENI Bexder is actually applied.  Uses the emulator's real config path
 *  (AppData-relative or emulator-dir-relative) and preserves any existing
 *  keys / comments by doing a smart line-level merge instead of a full rewrite.
 * ──────────────────────────────────────────────────────────────────────── */

const EmuConfigWriter = (() => {

  // ── INI helpers ──────────────────────────────────────────────────────────

  /**
   * Set/add values in an INI text while preserving comments and unknown keys.
   * updates = { 'SectionName': { key: 'value' }, '__root__': { key: 'value' } }
   */
  function _patchIni(text, updates) {
    const lines = text ? text.split('\n') : [];
    const pending = {};

    for (const [sec, keys] of Object.entries(updates)) {
      for (const [k, v] of Object.entries(keys)) {
        pending[sec + '\x00' + k] = { sec, k, v, done: false };
      }
    }

    let currentSec = '__root__';
    const sectionLines = {}; // sec -> last line index inside section

    // Pass 1: patch existing keys
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      const sm = t.match(/^\[(.+)\]$/);
      if (sm) { currentSec = sm[1]; continue; }

      const ei = t.indexOf('=');
      if (ei < 0) continue;
      const key = t.slice(0, ei).trim();
      const pKey = currentSec + '\x00' + key;
      sectionLines[currentSec] = i;

      if (pending[pKey] && !pending[pKey].done) {
        const spacer = lines[i].includes(' = ') ? ' = ' : '=';
        lines[i] = key + spacer + pending[pKey].v;
        pending[pKey].done = true;
      }
    }

    // Pass 2: insert missing keys grouped by section (bottom to top)
    const toInsert = {};
    for (const entry of Object.values(pending)) {
      if (entry.done) continue;
      toInsert[entry.sec] = toInsert[entry.sec] || [];
      toInsert[entry.sec].push(`${entry.k} = ${entry.v}`);
    }

    const sections = Object.keys(toInsert).sort((a, b) => {
      const ia = sectionLines[a] ?? -1;
      const ib = sectionLines[b] ?? -1;
      return ib - ia;
    });

    for (const sec of sections) {
      const newLines = toInsert[sec];
      if (sec in sectionLines) {
        lines.splice(sectionLines[sec] + 1, 0, ...newLines);
      } else if (sec === '__root__') {
        lines.unshift(...newLines, '');
      } else {
        lines.push('', `[${sec}]`, ...newLines);
      }
    }

    return lines.join('\n');
  }

  async function _applyIni(filePath, updates) {
    const r = await window.api.fs.readFile(filePath);
    const patched = _patchIni(r.ok ? r.data : '', updates);
    await window.api.fs.writeFile(filePath, patched);
  }

  // ── XML helpers ───────────────────────────────────────────────────────────

  /**
   * Patch an XML document. Uses DOMParser / XMLSerializer (available in Electron renderer).
   *
   * updates: array of patch descriptors
   *   { path: string[], attr: string,  value: string }  → sets an attribute
   *   { path: string[], value: string }                  → sets textContent
   *
   * path is relative to the document root element, e.g. ['video', 'fullscreen']
   * navigates documentElement → <video> → <fullscreen>.
   * Missing intermediate elements are created automatically.
   */
  function _patchXml(xmlText, updates) {
    let doc;
    try {
      const parser = new DOMParser();
      doc = parser.parseFromString(
        xmlText && xmlText.trim() ? xmlText : '<root/>',
        'application/xml'
      );
      if (doc.querySelector('parsererror')) {
        doc = new DOMParser().parseFromString('<root/>', 'application/xml');
      }
    } catch (_) {
      doc = new DOMParser().parseFromString('<root/>', 'application/xml');
    }

    for (const update of updates) {
      let node = doc.documentElement;
      for (const tag of update.path) {
        let child = node.getElementsByTagName(tag)[0];
        if (!child) {
          child = doc.createElement(tag);
          node.appendChild(child);
        }
        node = child;
      }
      if (update.attr) {
        node.setAttribute(update.attr, update.value);
      } else {
        node.textContent = update.value;
      }
    }

    return new XMLSerializer().serializeToString(doc);
  }

  async function _applyXml(filePath, updates) {
    const r = await window.api.fs.readFile(filePath);
    const patched = _patchXml(r.ok ? r.data : '', updates);
    await window.api.fs.writeFile(filePath, patched);
  }

  // ── YAML helpers ──────────────────────────────────────────────────────────

  /**
   * Patch a simple single-level-nested YAML config file.
   * Preserves comments and unknown keys.
   *
   * updates = { 'SectionName': { key: 'value' }, '__root__': { key: 'value' } }
   *
   * Section headers are unindented lines ending with a colon and no value:  Video:
   * Keys inside sections are indented (2 spaces):                           "  Fullscreen: false"
   * Root-level keys are unindented:                                         "fullscreen: false"
   */
  function _patchYaml(text, updates) {
    const lines = text ? text.split('\n') : [];
    const pending = {};

    for (const [sec, keys] of Object.entries(updates)) {
      for (const [k, v] of Object.entries(keys)) {
        pending[sec + '\x00' + k] = { sec, k, v, done: false };
      }
    }

    let currentSec = '__root__';
    const sectionLines = {}; // sec -> last line index that belongs to the section

    // Pass 1: patch existing keys
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const trimmed = raw.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const colonIdx = trimmed.indexOf(':');
      if (colonIdx < 0) continue;

      const key  = trimmed.slice(0, colonIdx).trim();
      const rest = trimmed.slice(colonIdx + 1).trim();
      const indent = raw.length - raw.trimStart().length;

      // Unindented line with no value → section header
      if (rest === '' && indent === 0) {
        currentSec = key;
        continue;
      }

      const pKey = currentSec + '\x00' + key;
      sectionLines[currentSec] = i;

      if (pending[pKey] && !pending[pKey].done) {
        const indentStr = raw.slice(0, indent);
        lines[i] = `${indentStr}${key}: ${pending[pKey].v}`;
        pending[pKey].done = true;
      }
    }

    // Pass 2: insert missing keys (bottom to top to preserve indices)
    const toInsert = {};
    for (const entry of Object.values(pending)) {
      if (entry.done) continue;
      toInsert[entry.sec] = toInsert[entry.sec] || [];
      toInsert[entry.sec].push(entry);
    }

    const sections = Object.keys(toInsert).sort((a, b) => {
      const ia = sectionLines[a] ?? -1;
      const ib = sectionLines[b] ?? -1;
      return ib - ia;
    });

    for (const sec of sections) {
      const entries = toInsert[sec];
      if (sec === '__root__') {
        lines.unshift(...entries.map(e => `${e.k}: ${e.v}`), '');
      } else if (sec in sectionLines) {
        lines.splice(sectionLines[sec] + 1, 0, ...entries.map(e => `  ${e.k}: ${e.v}`));
      } else {
        lines.push('', `${sec}:`, ...entries.map(e => `  ${e.k}: ${e.v}`));
      }
    }

    return lines.join('\n');
  }

  async function _applyYaml(filePath, updates) {
    const r = await window.api.fs.readFile(filePath);
    const patched = _patchYaml(r.ok ? r.data : '', updates);
    await window.api.fs.writeFile(filePath, patched);
  }

  // ── MAME INI helpers ──────────────────────────────────────────────────────

  /**
   * Patch a MAME-style ini (flat file, key padded with spaces then value, no sections).
   * updates = { key: 'value' }
   */
  function _patchMame(text, updates) {
    const lines = text ? text.split('\n') : [];
    const pending = {};
    for (const [k, v] of Object.entries(updates)) {
      pending[k] = { v, done: false };
    }

    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (!t || t.startsWith('#')) continue;
      const parts = t.split(/\s+/);
      const key = parts[0];
      if (pending[key] && !pending[key].done) {
        lines[i] = key.padEnd(26) + pending[key].v;
        pending[key].done = true;
      }
    }

    for (const [k, entry] of Object.entries(pending)) {
      if (!entry.done) lines.push(k.padEnd(26) + entry.v);
    }

    return lines.join('\n');
  }

  async function _applyMame(filePath, updates) {
    const r = await window.api.fs.readFile(filePath);
    const patched = _patchMame(r.ok ? r.data : '', updates);
    await window.api.fs.writeFile(filePath, patched);
  }

  // ── Per-emulator definitions ──────────────────────────────────────────────
  //
  //  path(appdata, emuDir):
  //    Returns the absolute config file path, or null to skip.
  //    appdata  = %APPDATA% (e.g. C:\Users\You\AppData\Roaming)
  //    emuDir   = directory of the emulator executable (for configs stored there)
  //
  //  format: 'ini' (default) | 'xml' | 'yaml' | 'mame'
  //
  //  patches(s):
  //    Returns the patch payload for the chosen format, or null to skip.

  const EMULATORS = {

    // ── Game Boy family (mGBA) ────────────────────────────────────────────
    gb: {
      path: (ad) => `${ad}\\mGBA\\config.ini`,
      patches: (s) => ({
        'ports.qt': {
          fullscreen:   s.emuFullscreen ? '1' : '0',
          videoSync:    s.emuVsync      ? '1' : '0',
          audioSync:    s.emuVsync      ? '1' : '0',
          windowWidth:  _scaleToRes(s.emuWindowScale)[0],
          windowHeight: _scaleToRes(s.emuWindowScale)[1],
        },
      }),
    },
    gbc: {
      path: (ad) => `${ad}\\mGBA\\config.ini`,
      patches: (s) => EMULATORS.gb.patches(s),
    },
    gba: {
      path: (ad) => `${ad}\\mGBA\\config.ini`,
      patches: (s) => EMULATORS.gb.patches(s),
    },

    // ── PSP (PPSSPP) ──────────────────────────────────────────────────────
    psp: {
      path: (ad) => `${ad}\\PPSSPP\\PSP\\SYSTEM\\ppsspp.ini`,
      patches: (s) => ({
        'Graphics': {
          FullScreen:    s.emuFullscreen    ? 'True'  : 'False',
          VSync:         s.emuVsync         ? 'True'  : 'False',
          FrameSkip:     '0',
          FrameSkipType: '0',
          RenderingMode: '1',
        },
        'Audio': {
          AudioBackend:  '0',
          AudioLatency:  String(Math.max(0, Math.round((s.emuAudioLatency || 64) / 32) - 1)),
        },
        'General': {
          PauseWhenMinimized: s.emuPauseUnfocused ? 'True' : 'False',
        },
      }),
    },

    // ── PS1 (DuckStation) ─────────────────────────────────────────────────
    ps1: {
      path: (ad) => `${ad}\\DuckStation\\settings.ini`,
      patches: (s) => ({
        'Main': {
          StartFullscreen:  s.emuFullscreen    ? 'true' : 'false',
          PauseOnFocusLoss: s.emuPauseUnfocused? 'true' : 'false',
        },
        'Display': {
          VSync:            s.emuVsync         ? 'true' : 'false',
          IntegerScaling:   s.emuIntegerScale  ? 'true' : 'false',
        },
        'Audio': {
          BufferMS:         String(s.emuAudioLatency || 64),
          MuteAllSounds:    'false',
        },
      }),
    },

    // ── PS2 (PCSX2) ───────────────────────────────────────────────────────
    ps2: {
      path: (ad) => `${ad}\\PCSX2\\inis\\PCSX2.ini`,
      patches: (s) => ({
        'EmuCore': {
          EnableFullscreenUI:   'true',
        },
        'EmuCore/GS': {
          VsyncEnable:          s.emuVsync        ? '1'     : '0',
          IntegerScaling:       s.emuIntegerScale ? 'true'  : 'false',
          FramerateNTSC:        String(s.emuFrameLimit || 60),
          FrameratePAL:         '50',
        },
        'EmuCore/CPU': {
          EnableRecordingTools: 'false',
        },
      }),
    },

    // ── PS3 (RPCS3) — YAML ────────────────────────────────────────────────
    ps3: {
      path: (ad) => `${ad}\\rpcs3\\config.yml`,
      format: 'yaml',
      patches: (s) => ({
        'Video': {
          Fullscreen:    s.emuFullscreen ? 'true' : 'false',
          VSync:         s.emuVsync      ? 'true' : 'false',
          'Frame limit': String(s.emuFrameLimit || 60),
        },
        'Audio': {
          'Master Volume': '100',
        },
      }),
    },

    // ── PS Vita (Vita3K) — YAML ───────────────────────────────────────────
    psvita: {
      path: (ad) => `${ad}\\Vita3K\\config.yml`,
      format: 'yaml',
      patches: (s) => ({
        '__root__': {
          fullscreen:     s.emuFullscreen ? 'true' : 'false',
          'audio-volume': '100',
        },
      }),
    },

    // ── GameCube (Dolphin) ────────────────────────────────────────────────
    gamecube: {
      path: (ad) => `${ad}\\Dolphin Emulator\\Config\\Dolphin.ini`,
      patches: (s) => ({
        'Display': {
          Fullscreen:      s.emuFullscreen    ? 'True' : 'False',
          KeepWindowOnTop: 'False',
        },
        'GFX': {
          VSync:           s.emuVsync         ? 'True' : 'False',
        },
        'Core': {
          PauseOnFocusLost: s.emuPauseUnfocused ? 'True' : 'False',
        },
      }),
    },
    wii: {
      path: (ad) => `${ad}\\Dolphin Emulator\\Config\\Dolphin.ini`,
      patches: (s) => EMULATORS.gamecube.patches(s),
    },

    // ── Wii U (Cemu) — XML ────────────────────────────────────────────────
    // settings.xml uses text-content style: <fullscreen>true</fullscreen>
    wiiu: {
      path: (ad) => `${ad}\\Cemu\\settings.xml`,
      format: 'xml',
      patches: (s) => [
        { path: ['fullscreen'], value: s.emuFullscreen ? 'true' : 'false' },
        { path: ['vsync'],      value: s.emuVsync      ? '1'    : '0'     },
      ],
    },

    // ── N64 (Mupen64Plus) ─────────────────────────────────────────────────
    n64: {
      path: (ad) => `${ad}\\Mupen64Plus\\mupen64plus.cfg`,
      patches: (s) => ({
        'Video-General': {
          Fullscreen: s.emuFullscreen ? 'True' : 'False',
        },
      }),
    },

    // ── NES (Nestopia UE) — XML ───────────────────────────────────────────
    // nestopia.xml uses attribute-value style: <fullscreen value="yes"/>
    nes: {
      path: (ad) => `${ad}\\Nestopia\\nestopia.xml`,
      format: 'xml',
      patches: (s) => [
        { path: ['video', 'fullscreen'], attr: 'value', value: s.emuFullscreen ? 'yes' : 'no' },
        { path: ['video', 'vsync'],      attr: 'value', value: s.emuVsync      ? 'yes' : 'no' },
      ],
    },

    // ── SNES (Snes9x) ─────────────────────────────────────────────────────
    snes: {
      path: (ad) => `${ad}\\Snes9x\\snes9x.conf`,
      patches: (s) => ({
        '__root__': {
          FullScreen: s.emuFullscreen ? '1' : '0',
          VSync:      s.emuVsync      ? '1' : '0',
          SoundSync:  s.emuVsync      ? '1' : '0',
        },
      }),
    },

    // ── Switch (Yuzu) ─────────────────────────────────────────────────────
    switch: {
      path: (ad) => `${ad}\\yuzu\\config\\qt-config.ini`,
      patches: (s) => ({
        'UISettings': {
          fullscreen: s.emuFullscreen ? 'true' : 'false',
        },
        'Renderer': {
          use_vsync:  s.emuVsync      ? '1'    : '0',
        },
      }),
    },

    // ── DS (melonDS) ──────────────────────────────────────────────────────
    ds: {
      path: (ad) => `${ad}\\melonDS\\melonDS.ini`,
      patches: (s) => ({
        '__root__': {
          Fullscreen:  s.emuFullscreen    ? '1'   : '0',
          AudioVolume: s.emuMuteUnfocused ? '0'   : '256',
        },
      }),
    },

    // ── 3DS (Citra) ───────────────────────────────────────────────────────
    '3ds': {
      path: (ad) => `${ad}\\Citra\\config\\qt-config.ini`,
      patches: (s) => ({
        'UISettings': {
          fullscreen:    s.emuFullscreen ? 'true' : 'false',
        },
        'Renderer': {
          use_vsync_new: s.emuVsync      ? 'true' : 'false',
        },
      }),
    },

    // ── Dreamcast (Flycast) ───────────────────────────────────────────────
    dreamcast: {
      path: (ad) => `${ad}\\flycast\\emu.cfg`,
      patches: (s) => ({
        'window': {
          fullscreen: s.emuFullscreen ? '1'   : '0',
          width:      _scaleToRes(s.emuWindowScale)[0],
          height:     _scaleToRes(s.emuWindowScale)[1],
        },
        'audio': {
          buffer: String(s.emuAudioLatency || 64),
        },
      }),
    },

    // ── Xbox (xemu) ───────────────────────────────────────────────────────
    xbox: {
      path: (ad) => `${ad}\\xemu\\xemu.toml`,
      patches: (s) => ({
        'general': {
          fullscreen: s.emuFullscreen ? 'true' : 'false',
        },
      }),
    },

    // ── Genesis (Gens) — config lives in the emulator directory ───────────
    // Gens uses a sectioned INI at <emuDir>\gens.cfg
    genesis: {
      path: (_ad, emuDir) => emuDir ? `${emuDir}\\gens.cfg` : null,
      patches: (s) => ({
        'Screen': {
          FullScreen: s.emuFullscreen ? '1' : '0',
          VSync:      s.emuVsync      ? '1' : '0',
        },
      }),
    },

    // ── Arcade (MAME) — config lives in the emulator directory ───────────
    // mame.ini is a flat space-padded key-value file (no sections)
    arcade: {
      path: (_ad, emuDir) => emuDir ? `${emuDir}\\mame.ini` : null,
      format: 'mame',
      patches: (s) => ({
        windowed: s.emuFullscreen ? '0' : '1',
      }),
    },
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  function _scaleToRes(scale) {
    const BASE_W = 640, BASE_H = 480;
    const s = scale || 2;
    return [String(BASE_W * s), String(BASE_H * s)];
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Write the correct config file for `consoleKey` emulator before launch.
   * @param {string} consoleKey  e.g. 'gba', 'ps1'
   * @param {object} settings    ENI Bexder settings object
   * @param {string} [emuDir]    Directory of the emulator executable (for
   *                             emulators like MAME/Gens whose config lives
   *                             alongside the exe, not in AppData)
   */
  async function apply(consoleKey, settings, emuDir) {
    const def = EMULATORS[consoleKey];
    if (!def) return;

    const patches = def.patches(settings);
    if (!patches) return;

    let appdata;
    try {
      const info = await window.api.system.info();
      appdata = info.appdata;
    } catch (_) { return; }

    const cfgPath = def.path(appdata, emuDir || null);
    if (!cfgPath) return;

    const format = def.format || 'ini';

    try {
      if (format === 'xml') {
        await _applyXml(cfgPath, patches);
      } else if (format === 'yaml') {
        await _applyYaml(cfgPath, patches);
      } else if (format === 'mame') {
        await _applyMame(cfgPath, patches);
      } else {
        await _applyIni(cfgPath, patches);
      }
    } catch (e) {
      console.warn('[EmuConfigWriter] Could not write config for', consoleKey, e);
    }
  }

  return { apply };
})();
