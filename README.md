MADE WITH AI THERE WILL BE MISSING STUFF AND BROKEN STUFF PLEASE CONTACT ME IF THERE ARE ANY BUGS ENJOY

# ENI Bexder

A console-style desktop emulator frontend for Windows, inspired by the Nintendo Wii Menu, Xbox 360 Dashboard, and Playnite Fullscreen. Built with Electron — drop in your ROMs, emulators, and music, then play everything from one slick launcher.

---

## Quick Start

### Prerequisites

- **Node.js** v18 or later
- **npm**

### 1. Install dependencies

```bash
npm install
```

### 2. Run in development mode

```bash
npm run dev
```

### 3. Build for distribution (Windows)

```bash
npm run build:win
```

The installer and unpacked build are placed in the `dist/` folder.

---

## Using the Built App

When you open `dist/win-unpacked/ENI Bexder.exe`, all your content folders go **next to the `.exe`** — not inside the installer or any subfolder:

```
win-unpacked/
├── ENI Bexder.exe
├── roms/              ← put your ROMs here (one subfolder per console)
│   ├── nes/
│   ├── snes/
│   └── ...
├── emulators/         ← put emulator executables here
│   ├── nes/
│   └── ...
├── music/             ← menu background music (mp3, wav, ogg, flac, m4a)
├── covers/            ← game cover art images
├── themes/            ← custom theme JSON files
└── saves/             ← save states (managed by emulators)
```

> The app automatically creates these folders the first time you open them from **Settings → Library**.

---

## Directory Structure (Source)

```
ENIBexder/
├── main.js              — Electron main process (window, IPC, filesystem, emulator launch)
├── preload.js           — Secure IPC bridge (contextBridge)
├── index.html           — Main app window (all UI markup)
├── package.json         — Build config + npm scripts
├── css/
│   ├── style.css            Main layout + components
│   ├── themes.css           Dark / Light / Custom theme variables
│   ├── settings.css         Settings overlay
│   ├── profile.css          Profile overlay
│   └── nowplaying.css       Now Playing widget
├── js/
│   ├── app.js               Boot sequence + App singleton
│   ├── storage.js           %APPDATA% read/write (settings, profile, collections, play data)
│   ├── library.js           ROM scanning, filtering, favorites, collections
│   ├── music.js             Audio player (play, pause, next/prev, shuffle, repeat, duck/fade)
│   ├── nowplaying.js        Now Playing widget renderer
│   ├── sfx.js               UI sound effects (custom files + Web Audio synth fallback)
│   ├── profile.js           Profile load/save/edit UI
│   ├── settings.js          Settings load/save/apply UI
│   ├── emulatorManager.js   Emulator path resolution + launch
│   ├── emuConfigWriter.js   Per-emulator config file writer (applied before each launch)
│   ├── coverScraper.js      Automatic cover art downloader
│   ├── consolelibrary.js    Collections overlay (emulator grid + custom collections)
│   ├── themes.js            Theme engine (built-in + custom JSON themes)
│   ├── controls.js          Keyboard + Gamepad (XInput) input handling
│   ├── i18n.js              Internationalization / language strings
│   ├── updater.js           Update checker
│   └── pages.js             Grid, categories, search overlay, game info panel
├── roms/                — ROMs go here (one subfolder per console key)
├── emulators/           — Emulator executables (one subfolder per console key)
├── covers/              — Game cover images
├── music/               — Menu background music
├── themes/              — External theme JSON files
├── saves/               — Save states / battery saves
└── assets/
    ├── icons/               App icons (icon.ico, icon.icns, icon.png)
    ├── sounds/              Custom UI sound effects (drop files here to override built-ins)
    └── default-avatar.svg   Default profile avatar
```

---

## AppData Storage

ENI Bexder stores all user data in:

```
%APPDATA%\ENIBexder\
├── settings.json          — All app settings (theme, volume, emulator flags, background, etc.)
├── profiles\
│   └── default.json       — Your profile (username, bio, avatar, social links)
└── cache\
    ├── library.json       — Last selected game + scroll position
    ├── collections.json   — Your custom game collections
    ├── playdata.json      — Play history, playtime, and favorites
    ├── gamemeta.json      — Custom game titles and cover overrides
    └── consolemeta.json   — Per-collection customization (name, art, color, description)
```

---

## Sound Effects

ENI Bexder has built-in synthesized sounds for all UI actions. You can **override any sound** by dropping an audio file into `assets/sounds/`.

### How it works

Name your file after the sound you want to replace, with any supported extension:

| Sound name   | Triggered when…                        |
|--------------|----------------------------------------|
| `nav`        | Moving between game tiles              |
| `confirm`    | Selecting / confirming                 |
| `back`       | Going back / closing                   |
| `favorite`   | Toggling a favorite                    |
| `launch`     | Launching a game                       |
| `error`      | An action is denied / fails            |
| `open`       | Opening a menu or overlay              |
| `close`      | Closing a menu or overlay              |
| `track`      | Skipping a music track                 |

**Supported formats:** `.mp3` `.wav` `.ogg` `.flac` `.m4a`

**Example:** to replace the navigation tick with your own file, add:
```
assets/sounds/nav.mp3
```

The app scans `assets/sounds/` on startup and loads any matching files automatically. Custom files take priority over the synthesized sounds — no settings change needed.

> If you add a new file while the app is already running, call `Sfx.reload()` from DevTools console to pick it up without restarting.

---

## Collections

The Collections overlay (⊞ button in the bottom bar) shows every configured emulator as a large card — even consoles with no ROMs yet. Click a card to browse its game library.

### Creating a custom collection

1. Open Collections (⊞ in the bottom bar).
2. Click **+ New Collection** in the top-right of the overlay.
3. Enter a name and click **Create**.
4. The collection appears in the grid alongside the emulator cards.

### Adding games to a collection

1. Select any game in the main grid.
2. Click the **grid+ icon** in the action buttons below the game info panel.
3. A popup lists all your collections — click one to add or remove the game.
4. Changes are saved instantly.

### Customizing a collection (right-click any card)

| Option               | What it does                                              |
|----------------------|-----------------------------------------------------------|
| Change Cover Art     | Set a custom background image for the card                |
| Change Accent Color  | Set a custom glow/border color                            |
| Rename               | Override the display name                                 |
| Edit Description     | Add a subtitle line shown on the card                     |
| Reset Customization  | Revert to default gradient and name                       |
| Delete Collection    | Permanently remove a custom collection (custom only)      |

Customization data is saved to `%APPDATA%\ENIBexder\cache\consolemeta.json`.

---

## Adding Emulators

Place each emulator inside `emulators/<console>/`:

| Console    | Folder       | Expected executable          |
|------------|--------------|------------------------------|
| NES        | `nes/`       | `nestopia.exe`               |
| SNES       | `snes/`      | `snes9x-x64.exe`             |
| N64        | `n64/`       | `mupen64plus.exe`            |
| GameCube   | `gamecube/`  | `Dolphin.exe`                |
| Wii        | `wii/`       | `Dolphin.exe`                |
| Wii U      | `wiiu/`      | `Cemu.exe`                   |
| Switch     | `switch/`    | `yuzu.exe`                   |
| Game Boy   | `gb/`        | `mGBA.exe`                   |
| GBC        | `gbc/`       | `mGBA.exe`                   |
| GBA        | `gba/`       | `mGBA.exe`                   |
| DS         | `ds/`        | `melonDS.exe`                |
| 3DS        | `3ds/`       | `citra-qt.exe`               |
| Genesis    | `genesis/`   | `Gens.exe`                   |
| Dreamcast  | `dreamcast/` | `flycast.exe`                |
| PS1        | `ps1/`       | `duckstation-qt.exe`         |
| PS2        | `ps2/`       | `pcsx2-qtx64.exe`            |
| PS3        | `ps3/`       | `rpcs3.exe`                  |
| PSP        | `psp/`       | `PPSSPPWindows64.exe`        |
| PS Vita    | `psvita/`    | `Vita3K.exe`                 |
| Xbox       | `xbox/`      | `xemu.exe`                   |
| Arcade     | `arcade/`    | `mame64.exe`                 |

---

## Adding Game Covers

Place cover images in the `covers/` folder. The filename must loosely match the ROM title (spaces, dashes, and special characters are ignored — only letters and numbers are compared).

**Example:** ROM `Super Mario 64.z64` → Cover: `covers/Super Mario 64.jpg`

You can also use **Settings → Library → Fetch Covers** to automatically download cover art for your library.

### Recommended cover size

**660 × 900 px** (portrait, 11:15 ratio). JPEG or PNG. Keep files under ~500 KB for smooth loading.

---

## Music

Place `.mp3`, `.wav`, `.ogg`, `.flac`, or `.m4a` files in the `music/` folder. Music plays automatically on startup.

| Situation              | What happens                              |
|------------------------|-------------------------------------------|
| App starts             | Music plays automatically                 |
| Game launches          | Music **pauses** immediately              |
| Game closes            | Music **resumes** automatically           |
| Overlay opens          | Music **fades to 25%** volume             |
| Overlay closes         | Music **fades back** to full volume       |

Use the **Now Playing** widget in the top-right to control playback (play/pause, next, previous).

---

## Custom Background Image

In **Settings → Appearance**, click **Browse** next to "Background Image" to pick any PNG, JPG, or WEBP file. Click **Clear** to remove it.

---

## Theming

### Built-in themes
Choose **Dark**, **Light**, or **Custom** from **Settings → Appearance**.

### Custom JSON themes
Place `.json` files in the `themes/` folder:

```json
{
  "name": "My Theme",
  "bg1": "#0a0a0f",
  "bg2": "#111118",
  "bg3": "#1a1a24",
  "accent": "#7c6aff",
  "text1": "#ffffff",
  "text2": "#aaaacc",
  "text3": "#666688"
}
```

---

## Controls

| Action           | Keyboard       | Controller       |
|------------------|----------------|------------------|
| Navigate grid    | Arrow Keys     | D-Pad / L-Stick  |
| Launch game      | Enter          | A Button         |
| Back / Close     | Escape         | B Button         |
| Toggle Favorite  | F              | Y Button         |
| Open Search      | S              | X Button         |
| Fullscreen       | F11            | —                |
| Now Playing next | N              | —                |

Controller deadzone is adjustable in **Settings → Controls**.

---

## Emulator Config

Before each game launch, ENI Bexder writes a config file for the emulator using `emuConfigWriter.js`. Settings like fullscreen, V-Sync, and window scale are applied automatically — no need to configure the emulator separately.

---

## Language / i18n

Change the language in **Settings → General**. Language strings live in `js/i18n.js`.

---

## Build Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start in development mode (DevTools enabled) |
| `npm start` | Start without DevTools |
| `npm run build:win` | Build Windows installer + win-unpacked |
| `npm run build:mac` | Build macOS DMG |
| `npm run build:linux` | Build Linux AppImage |
