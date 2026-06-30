/* ── ENI Bexder — Emulator Manager ───────────────────────────────────── */

const EmulatorManager = (() => {
  const UPDATE_DLC_EXTENSIONS = ['.nsp','.nsz','.ncz','.nsu','.xci','.pkg','.wud','.wux',
    '.wad','.iso','.cia','.dlc','.add','.addon','.xex','.pak','.prx','.rap','.psvimg'];

  function _isUpdateDlc(filename) {
    const lower = filename.toLowerCase();
    return UPDATE_DLC_EXTENSIONS.some(ext => lower.endsWith(ext));
  }

  function _isValidRomPath(path) {
    if (!path) return false;
    const lower = path.toLowerCase();
    const ext = lower.slice(lower.lastIndexOf('.'));
    const VALID_EXTENSIONS = new Set([
      '.nes','.smc','.sfc','.z64','.n64','.v64','.iso','.cue','.bin','.gcz',
      '.rvz','.wbfs','.nsp','.xci','.gb','.gbc','.gba','.nds','.3ds','.cia',
      '.md','.gen','.gdi','.chd','.rom','.zip','.7z','.nsz','.ncz','.nsu',
      '.pkg','.wud','.wux','.wad','.dlc','.add','.addon','.xex','.pak','.prx','.rap','.psvimg'
    ]);
    if (!VALID_EXTENSIONS.has(ext)) return false;
    if (/screenshot/i.test(lower)) return false;
    if (/^ss\d/i.test(lower)) return false;
    if (/screen_/i.test(lower)) return false;
    if (/\.png$/.test(ext)) return false;
    if (/\.jpg$/.test(ext) || /\.jpeg$/.test(ext)) return false;
    if (/\.gif$/.test(ext)) return false;
    if (/\.bmp$/.test(ext)) return false;
    if (/\.webp$/.test(ext)) return false;
    return true;
  }

  const EMULATOR_MAP = {
    nes:       { name: 'Nestopia',    exec: 'nestopia.exe',        romFlag: null, requiredArgs: []       },
    snes:      { name: 'Snes9x',     exec: 'snes9x-x64.exe',      romFlag: null, requiredArgs: []       },
    n64:       { name: 'Project64',  exec: 'Project64.exe',         romFlag: null, requiredArgs: []       },
    gamecube:  { name: 'Dolphin',    exec: 'Dolphin.exe',          romFlag: '-e', requiredArgs: ['-b']  },
    wii:       { name: 'Dolphin',    exec: 'Dolphin.exe',          romFlag: '-e', requiredArgs: ['-b']  },
    wiiu:      { name: 'Cemu',       exec: 'Cemu.exe',             romFlag: '-g', requiredArgs: []       },
    switch:    { name: 'Yuzu',       exec: 'yuzu.exe',             romFlag: '-g', requiredArgs: []       },
    gb:        { name: 'mGBA',       exec: 'mGBA.exe',             romFlag: null, requiredArgs: []       },
    gbc:       { name: 'mGBA',       exec: 'mGBA.exe',             romFlag: null, requiredArgs: []       },
    gba:       { name: 'mGBA',       exec: 'mGBA.exe',             romFlag: null, requiredArgs: []       },
    ds:        { name: 'melonDS',    exec: 'melonDS.exe',          romFlag: null, requiredArgs: []       },
    '3ds':     { name: 'Citra',      exec: 'citra-qt.exe',         romFlag: null, requiredArgs: []       },
    genesis:   { name: 'Gens',       exec: 'Gens.exe',             romFlag: null, requiredArgs: []       },
    dreamcast: { name: 'Flycast',    exec: 'flycast.exe',          romFlag: null, requiredArgs: []       },
    ps1:       { name: 'DuckStation',exec: 'duckstation-qt.exe',   romFlag: null, requiredArgs: []       },
    ps2:       { name: 'PCSX2',      exec: 'pcsx2-qtx64.exe',      romFlag: null, requiredArgs: []       },
    ps3:       { name: 'RPCS3',      exec: 'rpcs3.exe',            romFlag: null, requiredArgs: []       },
    psp:       { name: 'PPSSPP',     exec: 'PPSSPPWindows64.exe',  romFlag: null, requiredArgs: []       },
    psvita:    { name: 'Vita3K',     exec: 'Vita3K.exe',           romFlag: null, requiredArgs: []       },
    xbox:      { name: 'Xemu',       exec: 'xemu.exe',             romFlag: null, requiredArgs: []       },
    arcade:    { name: 'MAME',       exec: 'mame64.exe',           romFlag: null, requiredArgs: []       },
  };

  // Per-emulator CLI flag overrides.
  // fullscreen/vsync/scale: the CLI flag string, or null if not supported via CLI.
  // genericFlags: which of the shared optional flags this emulator accepts.
  //   Supported keys: 'integerScale','muteUnfocused','pauseUnfocused','rewind',
  //                   'audioLatency','frameLimit','ffSpeed'
  const EMU_FLAGS = {
    // NES — Nestopia has no meaningful CLI flags; fullscreen/settings via its own config
    nes:       { fullscreen: null,           vsync: null,      scale: null,  genericFlags: []                                        },
    snes:      { fullscreen: '-fullscreen',  vsync: '-vsync',  scale: '-scale', genericFlags: []                                     },
    // N64 — mupen64plus supports --fullscreen but not the shared optional flags
    n64:       { fullscreen: '--fullscreen', vsync: null,      scale: null,  genericFlags: []                                        },
    // GameCube/Wii — fullscreen handled via Dolphin.ini config; -b (batch) is a requiredArg
    gamecube:  { fullscreen: null,           vsync: null,      scale: null,  genericFlags: []                                        },
    wii:       { fullscreen: null,           vsync: null,      scale: null,  genericFlags: []                                        },
    // WiiU — Cemu: fullscreen via settings.xml (not patched), no supported generic flags
    wiiu:      { fullscreen: null,           vsync: null,      scale: null,  genericFlags: []                                        },
    // Switch — Yuzu: -f for fullscreen; -g romFlag handled separately
    switch:    { fullscreen: '-f',           vsync: null,      scale: null,  genericFlags: []                                        },
    gb:        { fullscreen: '-f',           vsync: null,      scale: '-s',  genericFlags: []                                        },
    gbc:       { fullscreen: '-f',           vsync: null,      scale: '-s',  genericFlags: []                                        },
    gba:       { fullscreen: '-f',           vsync: null,      scale: '-s',  genericFlags: []                                        },
    ds:        { fullscreen: null,           vsync: null,      scale: null,  genericFlags: []                                        },
    '3ds':     { fullscreen: '-f',           vsync: null,      scale: null,  genericFlags: []                                        },
    genesis:   { fullscreen: null,           vsync: null,      scale: null,  genericFlags: []                                        },
    dreamcast: { fullscreen: null,           vsync: null,      scale: null,  genericFlags: []                                        },
    ps1:       { fullscreen: '--fullscreen', vsync: null,      scale: null,  genericFlags: ['pauseUnfocused']                        },
    ps2:       { fullscreen: '--fullscreen', vsync: null,      scale: null,  genericFlags: []                                        },
    ps3:       { fullscreen: null,           vsync: null,      scale: null,  genericFlags: []                                        },
    psp:       { fullscreen: '--fullscreen', vsync: null,      scale: null,  genericFlags: []                                        },
    psvita:    { fullscreen: null,           vsync: null,      scale: null,  genericFlags: []                                        },
    xbox:      { fullscreen: '-full-screen', vsync: null,      scale: null,  genericFlags: []                                        },
    arcade:    { fullscreen: '-nowindow',    vsync: null,      scale: null,  genericFlags: []                                        },
  };

  let _appDir = null;

  function init(appDir) {
    _appDir = appDir;
    window.api.emulator.onExited(() => {
      Music.resumeAfterGame();
    });
  }

  async function getEmulatorPath(consoleKey) {
    const info = EMULATOR_MAP[consoleKey];
    if (!info) return null;
    const searchPaths = [_appDir + '/emulators/' + consoleKey];
    if (consoleKey === 'gamecube' || consoleKey === 'wii') {
      searchPaths.unshift(_appDir + '/emulators/gamecube-wii');
    }
    if (consoleKey === 'gb' || consoleKey === 'gbc' || consoleKey === 'gba') {
      searchPaths.unshift(_appDir + '/emulators/gba-gbc-gb');
    }
    const seen = new Set();
    for (const dir of searchPaths) {
      if (seen.has(dir)) continue;
      seen.add(dir);
      const result = await window.api.fs.readDir(dir);
      if (!result.ok) continue;
      const exe = result.files.find(f =>
        !f.isDirectory && f.name.toLowerCase() === info.exec.toLowerCase()
      );
      if (exe) return exe.fullPath;
    }
    return null;
  }

  async function launch(game, settings, forceMode) {
    const emuPath = await getEmulatorPath(game.console);
    if (!emuPath) {
      App.showToast(`Emulator for ${game.consoleName} not found.\nPlace it in emulators/${game.console}/`);
      return false;
    }

    Music.pauseForGame();

    const sep = emuPath.includes('\\') ? '\\' : '/';
    const emuDir = emuPath.substring(0, emuPath.lastIndexOf(sep));

    await EmuConfigWriter.apply(game.console, settings, emuDir);

    const args = _buildArgs(game, settings);

    const romFlag = EMULATOR_MAP[game.console]?.romFlag;
    if (romFlag) args.push(romFlag);

    const mode = forceMode || (settings?.smartLaunchMode || 'update-dlc-main');
    let launchPath = game.path;
    if (mode === 'update' && game.updatePath) {
      launchPath = game.updatePath;
    } else if (mode === 'dlc' && game.dlcPaths && game.dlcPaths.length) {
      launchPath = game.dlcPaths[0];
    } else if (mode === 'update-dlc-main') {
      if (game.updatePath) launchPath = game.updatePath;
      else if (game.dlcPaths && game.dlcPaths.length) launchPath = game.dlcPaths[0];
    } else if (mode === 'dlc-update-main') {
      if (game.dlcPaths && game.dlcPaths.length) launchPath = game.dlcPaths[0];
      else if (game.updatePath) launchPath = game.updatePath;
    }

    if (!_isValidRomPath(launchPath)) {
      console.warn('[EmulatorManager] Blocked invalid launch path:', launchPath);
      if (_isValidRomPath(game.path)) {
        launchPath = game.path;
      } else {
        App.showToast('Game file not found or invalid for: ' + (game.title || 'Unknown'));
        return false;
      }
    }

    const result = await window.api.emulator.launch(emuPath, launchPath, args);

    if (!result.ok) {
      Music.resumeAfterGame();
      App.showToast('Failed to launch: ' + result.error);
      return false;
    }

    Library.recordPlay(game.id);
    const playData = Library.getPlayData();
    await Storage.savePlayData(playData);
    return true;
  }

  function _flag(consoleKey, name) {
    return EMU_FLAGS[consoleKey]?.[name] ?? null;
  }

  function _supportsGeneric(consoleKey, name) {
    return (EMU_FLAGS[consoleKey]?.genericFlags || []).includes(name);
  }

  function _buildArgs(game, settings) {
    const info = EMULATOR_MAP[game.console] || {};
    // Start with any flags that must always be present (e.g. Dolphin -b)
    const args = [...(info.requiredArgs || [])];
    const s = settings || {};
    const c = game.console;

    if (s.emuFullscreen) {
      const f = _flag(c, 'fullscreen');
      if (f) args.push(f);
    }

    if (s.emuVsync) {
      const f = _flag(c, 'vsync');
      if (f) args.push(f);
    }

    if (s.emuWindowScale && s.emuWindowScale !== 2) {
      const f = _flag(c, 'scale');
      if (f) args.push(f, String(s.emuWindowScale));
    }

    // Optional flags — only passed when the emulator explicitly supports them
    if (s.emuIntegerScale   && _supportsGeneric(c, 'integerScale'))   args.push('--integer-scale');
    if (s.emuMuteUnfocused  && _supportsGeneric(c, 'muteUnfocused'))  args.push('--mute-unfocused');
    if (s.emuPauseUnfocused && _supportsGeneric(c, 'pauseUnfocused')) args.push('--pause-unfocused');
    if (s.emuRewind         && _supportsGeneric(c, 'rewind'))         args.push('--rewind');

    if (s.emuAudioLatency && s.emuAudioLatency !== 64 && _supportsGeneric(c, 'audioLatency'))
      args.push('--audio-latency', String(s.emuAudioLatency));
    if (s.emuFrameLimit && s.emuFrameLimit !== 60 && _supportsGeneric(c, 'frameLimit'))
      args.push('--frame-limit', String(s.emuFrameLimit));
    if (s.emuFfSpeed && s.emuFfSpeed !== 4 && _supportsGeneric(c, 'ffSpeed'))
      args.push('--ff-speed', String(s.emuFfSpeed));

    return args;
  }

  function getEmulatorName(consoleKey) {
    return EMULATOR_MAP[consoleKey]?.name || 'Unknown Emulator';
  }

  function getConsoleList() {
    return Object.entries(EMULATOR_MAP).map(([key, val]) => ({
      key,
      emulatorName: val.name,
    }));
  }

  return { init, launch, getEmulatorPath, getEmulatorName, getConsoleList };
})();
