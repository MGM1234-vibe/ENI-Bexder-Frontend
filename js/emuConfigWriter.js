/* ── ENI Bexder — Emulator Config Writer ──────────────────────────────────
 *  Writes per-emulator config files BEFORE launch so every emulator setting
 *  in ENI Bexder is actually applied.  Uses the emulator's real config path
 *  (AppData-relative) and preserves any existing keys / comments by doing a
 *  smart line-level merge instead of a full rewrite.
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
        // Preserve spacing style of original line
        const spacer = lines[i].includes(' = ') ? ' = ' : '=';
        lines[i] = key + spacer + pending[pKey].v;
        pending[pKey].done = true;
      }
    }

    // Pass 2: insert missing keys
    // Group undone entries by section
    const toInsert = {};
    for (const entry of Object.values(pending)) {
      if (entry.done) continue;
      toInsert[entry.sec] = toInsert[entry.sec] || [];
      toInsert[entry.sec].push(`${entry.k} = ${entry.v}`);
    }

    // Insert from bottom to top so indices stay valid
    const sections = Object.keys(toInsert).sort((a, b) => {
      const ia = sectionLines[a] ?? -1;
      const ib = sectionLines[b] ?? -1;
      return ib - ia;
    });

    for (const sec of sections) {
      const newLines = toInsert[sec];
      if (sec in sectionLines) {
        // Append after last known line in that section
        lines.splice(sectionLines[sec] + 1, 0, ...newLines);
      } else if (sec === '__root__') {
        lines.unshift(...newLines, '');
      } else {
        // Section doesn't exist yet — append at end
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

  // ── Per-emulator definitions ──────────────────────────────────────────────
  // path(appdata): returns absolute config file path, or null to skip
  // patches(s): returns INI section patches based on ENI settings object

  const EMULATORS = {
    gb: {
      path: (ad) => `${ad}\\mGBA\\config.ini`,
      patches: (s) => ({
        'ports.qt': {
          fullscreen:  s.emuFullscreen    ? '1' : '0',
          videoSync:   s.emuVsync         ? '1' : '0',
          audioSync:   s.emuVsync         ? '1' : '0',
          windowWidth: _scaleToRes(s.emuWindowScale)[0],
          windowHeight:_scaleToRes(s.emuWindowScale)[1],
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

    psp: {
      path: (ad) => `${ad}\\PPSSPP\\PSP\\SYSTEM\\ppsspp.ini`,
      patches: (s) => ({
        'Graphics': {
          FullScreen:           s.emuFullscreen    ? 'True'  : 'False',
          VSync:                s.emuVsync         ? 'True'  : 'False',
          FrameSkip:            '0',
          FrameSkipType:        '0',
          RenderingMode:        '1',
        },
        'Audio': {
          AudioBackend:         '0',
          AudioLatency:         String(Math.max(0, Math.round((s.emuAudioLatency || 64) / 32) - 1)),
        },
        'General': {
          PauseWhenMinimized:   s.emuPauseUnfocused ? 'True' : 'False',
        },
      }),
    },

    ps1: {
      path: (ad) => `${ad}\\DuckStation\\settings.ini`,
      patches: (s) => ({
        'Main': {
          StartFullscreen:      s.emuFullscreen    ? 'true'  : 'false',
          PauseOnFocusLoss:     s.emuPauseUnfocused? 'true'  : 'false',
        },
        'Display': {
          VSync:                s.emuVsync         ? 'true'  : 'false',
          IntegerScaling:       s.emuIntegerScale  ? 'true'  : 'false',
        },
        'Audio': {
          BufferMS:             String(s.emuAudioLatency || 64),
          MuteAllSounds:        'false',
        },
      }),
    },

    ps2: {
      path: (ad) => `${ad}\\PCSX2\\inis\\PCSX2.ini`,
      patches: (s) => ({
        'EmuCore': {
          EnableFullscreenUI:   'true',
        },
        'EmuCore/GS': {
          VsyncEnable:          s.emuVsync         ? '1'     : '0',
          IntegerScaling:       s.emuIntegerScale  ? 'true'  : 'false',
          FramerateNTSC:        String(s.emuFrameLimit || 60),
          FrameratePAL:         '50',
        },
        'EmuCore/CPU': {
          EnableRecordingTools: 'false',
        },
      }),
    },

    gamecube: {
      path: (ad) => `${ad}\\Dolphin Emulator\\Config\\Dolphin.ini`,
      patches: (s) => ({
        'Display': {
          Fullscreen:           s.emuFullscreen    ? 'True'  : 'False',
          KeepWindowOnTop:      'False',
        },
        'GFX': {
          VSync:                s.emuVsync         ? 'True'  : 'False',
        },
        'Core': {
          PauseOnFocusLost:     s.emuPauseUnfocused? 'True'  : 'False',
        },
      }),
    },
    wii: {
      path: (ad) => `${ad}\\Dolphin Emulator\\Config\\Dolphin.ini`,
      patches: (s) => EMULATORS.gamecube.patches(s),
    },

    n64: {
      path: (ad) => `${ad}\\Mupen64Plus\\mupen64plus.cfg`,
      patches: (s) => ({
        'Video-General': {
          Fullscreen:           s.emuFullscreen    ? 'True'  : 'False',
        },
      }),
    },

    ds: {
      path: (ad) => `${ad}\\melonDS\\melonDS.ini`,
      patches: (s) => ({
        '__root__': {
          Fullscreen:           s.emuFullscreen    ? '1'     : '0',
          AudioVolume:          s.emuMuteUnfocused ? '0'     : '256',
        },
      }),
    },

    '3ds': {
      path: (ad) => `${ad}\\Citra\\config\\qt-config.ini`,
      patches: (s) => ({
        'UISettings': {
          fullscreen:           s.emuFullscreen    ? 'true'  : 'false',
        },
        'Renderer': {
          use_vsync_new:        s.emuVsync         ? 'true'  : 'false',
        },
      }),
    },

    switch: {
      path: (ad) => `${ad}\\yuzu\\config\\qt-config.ini`,
      patches: (s) => ({
        'UISettings': {
          fullscreen:           s.emuFullscreen    ? 'true'  : 'false',
        },
        'Renderer': {
          use_vsync:            s.emuVsync         ? '1'     : '0',
        },
      }),
    },

    dreamcast: {
      path: (ad) => `${ad}\\flycast\\emu.cfg`,
      patches: (s) => ({
        'window': {
          fullscreen:           s.emuFullscreen    ? '1'     : '0',
          width:                _scaleToRes(s.emuWindowScale)[0],
          height:               _scaleToRes(s.emuWindowScale)[1],
        },
        'audio': {
          buffer:               String(s.emuAudioLatency || 64),
        },
      }),
    },

    snes: {
      path: (ad) => `${ad}\\Snes9x\\snes9x.conf`,
      patches: (s) => ({
        '__root__': {
          FullScreen:           s.emuFullscreen    ? '1'     : '0',
          VSync:                s.emuVsync         ? '1'     : '0',
          SoundSync:            s.emuVsync         ? '1'     : '0',
        },
      }),
    },

    wiiu: {
      path: (ad) => `${ad}\\Cemu\\settings.xml`,
      patches: () => null, // XML format — not supported, handled via CLI
    },

    ps3: {
      path: () => null, // RPCS3 uses YAML — not supported
      patches: () => null,
    },

    psvita: {
      path: () => null, // Vita3K uses its own format
      patches: () => null,
    },

    xbox: {
      path: (ad) => `${ad}\\xemu\\xemu.toml`,
      patches: (s) => ({
        'general': {
          fullscreen:           s.emuFullscreen    ? 'true'  : 'false',
        },
      }),
    },

    arcade: {
      path: () => null, // MAME ini is in the emulator directory — skip
      patches: () => null,
    },

    nes: {
      path: () => null, // Nestopia uses XML — skip
      patches: () => null,
    },

    genesis: {
      path: () => null,
      patches: () => null,
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
   */
  async function apply(consoleKey, settings) {
    const def = EMULATORS[consoleKey];
    if (!def) return;

    const patches = def.patches(settings);
    if (!patches) return;

    let appdata;
    try {
      const info = await window.api.system.info();
      appdata = info.appdata;
    } catch (_) { return; }

    const cfgPath = def.path(appdata);
    if (!cfgPath) return;

    try {
      await _applyIni(cfgPath, patches);
    } catch (e) {
      console.warn('[EmuConfigWriter] Could not write config for', consoleKey, e);
    }
  }

  return { apply };
})();
