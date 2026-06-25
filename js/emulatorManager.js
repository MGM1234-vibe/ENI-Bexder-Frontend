/* ── ENI Bexder — Emulator Manager ───────────────────────────────────── */

const EmulatorManager = (() => {
  const EMULATOR_MAP = {
    nes:       { name: 'Nestopia',    exec: 'nestopia.exe'          },
    snes:      { name: 'Snes9x',     exec: 'snes9x-x64.exe'        },
    n64:       { name: 'Mupen64',    exec: 'mupen64plus.exe'        },
    gamecube:  { name: 'Dolphin',    exec: 'Dolphin.exe'            },
    wii:       { name: 'Dolphin',    exec: 'Dolphin.exe'            },
    wiiu:      { name: 'Cemu',       exec: 'Cemu.exe'               },
    switch:    { name: 'Yuzu',       exec: 'yuzu.exe'               },
    gb:        { name: 'mGBA',       exec: 'mGBA.exe'               },
    gbc:       { name: 'mGBA',       exec: 'mGBA.exe'               },
    gba:       { name: 'mGBA',       exec: 'mGBA.exe'               },
    ds:        { name: 'melonDS',    exec: 'melonDS.exe'            },
    '3ds':     { name: 'Citra',      exec: 'citra-qt.exe'           },
    genesis:   { name: 'Gens',       exec: 'Gens.exe'               },
    dreamcast: { name: 'Flycast',    exec: 'flycast.exe'            },
    ps1:       { name: 'DuckStation',exec: 'duckstation-qt.exe'     },
    ps2:       { name: 'PCSX2',      exec: 'pcsx2-qtx64.exe'        },
    ps3:       { name: 'RPCS3',      exec: 'rpcs3.exe'              },
    psp:       { name: 'PPSSPP',     exec: 'PPSSPPWindows64.exe'    },
    psvita:    { name: 'Vita3K',     exec: 'Vita3K.exe'             },
    xbox:      { name: 'Xemu',       exec: 'xemu.exe'               },
    arcade:    { name: 'MAME',       exec: 'mame64.exe'             },
  };

  // Per-emulator CLI flag overrides.
  // Each key is a flag name; value is the argument string or null (= not supported).
  const EMU_FLAGS = {
    nes:       { fullscreen: '-fullscreen',  vsync: null,      scale: null              },
    snes:      { fullscreen: '-fullscreen',  vsync: '-vsync',  scale: '-scale'          },
    n64:       { fullscreen: '--fullscreen', vsync: null,      scale: null              },
    gamecube:  { fullscreen: '-b',           vsync: null,      scale: null              },
    wii:       { fullscreen: '-b',           vsync: null,      scale: null              },
    wiiu:      { fullscreen: null,           vsync: null,      scale: null              },
    switch:    { fullscreen: '-f',           vsync: null,      scale: null              },
    gb:        { fullscreen: '-f',           vsync: null,      scale: '-s'              },
    gbc:       { fullscreen: '-f',           vsync: null,      scale: '-s'              },
    gba:       { fullscreen: '-f',           vsync: null,      scale: '-s'              },
    ds:        { fullscreen: null,           vsync: null,      scale: null              },
    '3ds':     { fullscreen: '-f',           vsync: null,      scale: null              },
    genesis:   { fullscreen: null,           vsync: null,      scale: null              },
    dreamcast: { fullscreen: null,           vsync: null,      scale: null              },
    ps1:       { fullscreen: '--fullscreen', vsync: null,      scale: null              },
    ps2:       { fullscreen: '--fullscreen', vsync: null,      scale: null              },
    ps3:       { fullscreen: null,           vsync: null,      scale: null              },
    psp:       { fullscreen: '--fullscreen', vsync: null,      scale: null              },
    psvita:    { fullscreen: null,           vsync: null,      scale: null              },
    xbox:      { fullscreen: '-full-screen', vsync: null,      scale: null              },
    arcade:    { fullscreen: '-nowindow',    vsync: null,      scale: null              },
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
    const emuDir = _appDir + '/emulators/' + consoleKey;
    const result = await window.api.fs.readDir(emuDir);
    if (!result.ok) return null;
    const exe = result.files.find(f =>
      !f.isDirectory && f.name.toLowerCase() === info.exec.toLowerCase()
    );
    return exe ? exe.fullPath : null;
  }

  async function launch(game, settings) {
    const emuPath = await getEmulatorPath(game.console);
    if (!emuPath) {
      App.showToast(`Emulator for ${game.consoleName} not found.\nPlace it in emulators/${game.console}/`);
      return false;
    }

    Music.pauseForGame();

    // Write emulator config file before launch so all settings take effect
    await EmuConfigWriter.apply(game.console, settings);

    const args = _buildArgs(game, settings);
    const result = await window.api.emulator.launch(emuPath, game.path, args);

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

  function _buildArgs(game, settings) {
    const args = [];
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

    // Generic flags supported by most emulators
    if (s.emuIntegerScale)   args.push('--integer-scale');
    if (s.emuMuteUnfocused)  args.push('--mute-unfocused');
    if (s.emuPauseUnfocused) args.push('--pause-unfocused');
    if (s.emuRewind)         args.push('--rewind');

    if (s.emuAudioLatency && s.emuAudioLatency !== 64)
      args.push('--audio-latency', String(s.emuAudioLatency));
    if (s.emuFrameLimit && s.emuFrameLimit !== 60)
      args.push('--frame-limit', String(s.emuFrameLimit));
    if (s.emuFfSpeed && s.emuFfSpeed !== 4)
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
