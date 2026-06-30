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
├── saves/             ← save states (managed by emulators)
└── assets/            ← UI icons, sounds, collection icons, default avatar
    ├── icons/         ← app window icons
    ├── sounds/        ← custom UI sound effects (nav, launch, favorite, etc.)
    ├── collection-icons/ ← custom collection card icons (png, jpg, svg, webp)
    └── default-avatar.svg ← fallback profile avatar
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
│   ├── sfx.js               UI sound effects (custom audio files in assets/sounds/)
│   ├── profile.js           Profile load/save/edit UI
│   ├── settings.js          Settings load/save/apply UI
│   ├── emulatorManager.js   Emulator path resolution + launch
│   ├── emuConfigWriter.js   Per-emulator config file writer (applied before each launch)
│   ├── consolelibrary.js    Collections overlay (emulator grid + custom collections)
│   ├── themes.js            Theme engine (built-in + custom JSON themes)
│   ├── controls.js          Keyboard + Gamepad (XInput) input handling
│   ├── i18n.js              Internationalization / language strings
│   ├── updater.js           Update checker
│   └── pages.js             Grid, categories, search overlay, game info panel
└── assets/
    ├── icons/               App icons (icon.ico, icon.icns, icon.png)
    ├── sounds/              Custom UI sound effects (place files here to enable sounds)
    ├── collection-icons/    Collection card icons (SVG/PNG/JPG/WebP — drop files here to add to picker)
    └── default-avatar.svg   Default profile avatar
```

Content folders (`roms/`, `emulators/`, `covers/`, `music/`, `themes/`, `saves/`) are created automatically next to the `.exe` when opened from **Settings → Library**.

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
    └── consolemeta.json   — Per-collection customization (name, cover art, color, description)
```

### What is the `cache` folder?

The `cache` folder stores **runtime data** that the app reads and writes while you use it. It does not contain your ROMs, emulators, or media files — those live next to the `.exe` or in `%APPDATA%` for profile data.

| File | Purpose |
|------|---------|
| `library.json` | Remembers your scroll position and last selected game between sessions |
| `collections.json` | Saves your custom game collections and which games belong to each |
| `playdata.json` | Tracks play time, last played date, and favorite status for every game |
| `gamemeta.json` | Stores your edited game titles, descriptions, genres, cover overrides, update/DLC paths |
| `consolemeta.json` | Stores collection card customization (display name, description, cover image, accent color, icon) |

> You can safely delete the `cache` folder to reset all runtime data. The app will rebuild it on next launch, but you will lose collections, play history, and custom metadata.

---

## Sound Effects

ENI Bexder plays UI sounds **only** when you provide custom audio files. There are no built-in default sounds.

### How to add sounds

Drop an audio file named after the action into `assets/sounds/`:

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

**Example:** to add a navigation tick sound:
```
assets/sounds/nav.mp3
```

The app scans `assets/sounds/` on startup and loads any matching files automatically. If no file exists for a given action, the action plays silently.

> If you add a new file while the app is already running, call `Sfx.reload()` from DevTools console to pick it up without restarting.

---

## Collections

The Collections overlay (⊞ button in the bottom bar) shows every configured emulator as a large card — even consoles with no ROMs yet. GameCube and Wii share a single **GameCube / Wii** Dolphin card. Click any card to browse its game library in a paginated 7×5 grid.

### Creating a custom collection

1. Open Collections (⊞ in the bottom bar).
2. Click the **+ New Collection** card inside the grid.
3. Enter a name and click **Create**.
4. The collection appears in the grid alongside the emulator cards.

### Adding games to a collection

1. Select any game in the main grid.
2. Click the **grid+ icon** in the action buttons below the game info panel.
3. A popup lists all your collections — click one to add or remove the game.
4. Changes are saved instantly.

### Browsing a collection

- Click any emulator or custom collection card to open its game grid.
- Games are shown **35 per page** (7 columns × 5 rows) with **Previous / Next** pagination.
- Click any game tile to launch it, or **right-click** for more options.

### Game context menu (inside a collection)

Right-click any game tile inside a collection to see:

| Option               | What it does                                              |
|----------------------|-----------------------------------------------------------|
| Launch               | Start the game with its default emulator                  |
| Edit Details         | Change title, description, genres, cover art              |
| Open File Location   | Open the folder containing the ROM file                   |
| Remove from Collection | Remove the game from this custom collection (custom collections only) |

### Customizing a collection card (right-click any card)

| Option               | What it does                                              |
|----------------------|-----------------------------------------------------------|
| Change Cover Art     | Set a custom background image for the card                |
| Choose Icon          | Pick an image from `assets/collection-icons/` to show on the card (only appears when custom icons are present) |
| Change Accent Color  | Set a custom glow/border color                            |
| Edit Collection      | Change display name and description at the same time      |
| Rename               | Override the display name only                            |
| Edit Description     | Change the subtitle line shown on the card                |
| Reset Customization  | Revert to default gradient, name, and icon               |
| Delete Collection    | Permanently remove a custom collection (custom collections only) |

Customization data is saved to `%APPDATA%\ENIBexder\cache\consolemeta.json`.

### Custom collection icons

ENI Bexder uses **emoji icons by default** for each console. You can replace them with your own images by dropping files into `assets/collection-icons/`.

**Supported formats:** `.svg`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`

1. Drop any image file into `assets/collection-icons/`.
2. Restart the app (or the folder is re-scanned automatically on launch).
3. Right-click any collection card and choose **Choose Icon** — your file appears in the picker grid.

Icons are stored by filename in `consolemeta.json` and travel with your profile.

### Recommended collection card cover sizes

Collection cards display in **landscape** orientation (wider than tall).

| Use                       | Recommended size     | Ratio  | Format       |
|---------------------------|----------------------|--------|--------------|
| **Collection card cover** | **880 × 500 px**     | 16:9   | PNG or JPG   |

- Keep collection card images under **~300 KB** for smooth rendering.
- Any standard image works — the card crops and centers it automatically.
- Supported formats: `.png` `.jpg` `.jpeg` `.webp`

> **Tip:** Movie posters, fan art, or console hero shots make great collection card backgrounds.

---

## Adding Emulators

Place each emulator inside `emulators/<console>/`. Consoles that share the same emulator can also be placed in a shared folder:

| Console    | Folder           | Expected executable          |
|------------|------------------|------------------------------|
| NES        | `nes/`           | `nestopia.exe`               |
| SNES       | `snes/`          | `snes9x-x64.exe`             |
| N64        | `n64/`       | `Project64.exe`              |
| GameCube   | `gamecube/`      | `Dolphin.exe`                |
| Wii        | `wii/`           | `Dolphin.exe`                |
| GameCube / Wii (shared) | `gamecube-wii/` | `Dolphin.exe`        |
| Wii U      | `wiiu/`          | `Cemu.exe`                   |
| Switch     | `switch/`        | `yuzu.exe`                   |
| Game Boy   | `gb/`            | `mGBA.exe`                   |
| GBC        | `gbc/`           | `mGBA.exe`                   |
| GBA        | `gba/`           | `mGBA.exe`                   |
| GB / GBC / GBA (shared) | `gba-gbc-gb/` | `mGBA.exe`                |
| DS         | `ds/`            | `melonDS.exe`                |
| 3DS        | `3ds/`           | `citra-qt.exe`               |
| Genesis    | `genesis/`       | `Gens.exe`                   |
| Dreamcast  | `dreamcast/`     | `flycast.exe`                |
| PS1        | `ps1/`           | `duckstation-qt.exe`         |
| PS2        | `ps2/`           | `pcsx2-qtx64.exe`            |
| PS3        | `ps3/`           | `rpcs3.exe`                  |
| PSP        | `psp/`           | `PPSSPPWindows64.exe`        |
| PS Vita    | `psvita/`        | `Vita3K.exe`                 |
| Xbox       | `xbox/`          | `xemu.exe`                   |
| Arcade     | `arcade/`        | `mame64.exe`                 |

---

## Game Folders & Update / DLC Support

ENI Bexder uses **game folders by default**. Each subfolder inside a console directory is treated as a single game, with automatic Update and DLC detection:

```
roms/
├── nes/
│   ├── Super Mario Bros/
│   │   ├── Super Mario Bros.nes
│   │   ├── Super Mario Bros (Update).nes
│   │   └── Super Mario Bros (DLC).nes
│   └── Zelda/
│       ├── Zelda.nes
│       └── Zelda DLC Pack.nes
```

### How it works

- Each subfolder inside a console directory is treated as a single game.
- The first recognized ROM extension becomes the **main game file**.
- Files with keywords like `update`, `upd`, `patch`, `dlc`, `addon`, or `expansion` in their filename are classified as **Updates** or **DLC**.
- Games show **UPD** and **DLC** badges on their tiles when these files are detected.
- You can still place loose ROM files directly in the console folder — they are imported as flat games alongside the folder-based ones.

### Smart Launch (default behavior)

When you press **Enter** or click **Play**, ENI Bexder automatically chooses the best launch file:

| Priority | File type |
|----------|-----------|
| 1st | **Update** (if present) |
| 2nd | **DLC** (if present) |
| 3rd | **Main ROM** |

This means most games will automatically launch with their latest update or DLC without any extra steps.

### Launch options (right-click menu)

Right-click any game tile to override the smart default:

| Option | What it does |
|--------|--------------|
| **Launch** | Uses the Smart Launch priority (Update → DLC → Main) |
| **Launch with Update** | Forces the update file |
| **Launch with DLC** | Forces the first DLC file |
| **Launch Main ROM** | Forces the base game only |

**Launch with Update** and **Launch with DLC** only appear when the game has those files detected.

### Smart Launch Mode setting

You can change the default priority order in **Settings → Emulator → Smart Launch Mode**:

- **Update → DLC → Main** (default)
- **DLC → Update → Main**
- **Always Main ROM** (disables smart selection entirely)

---

## Supported Update/DLC file types

ENI Bexder recognizes a wide range of update and DLC formats, including:

**Nintendo Switch:**
`.nsp`, `.nsz`, `.ncz`, `.xci`

**Wii U:**
`.rpx`, `.wud`, `.wux`

**PlayStation:**
`.pkg`, `.wud`, `.wux`, `.wad`, `.psvimg`

**Xbox:**
`.xex`, `.pak`, `.iso`

**General / Multi-platform:**
`.dlc`, `.add`, `.addon`, `.prx`, `.rap`

---

## Adding Game Covers

Place cover images in the `covers/` folder. The filename must loosely match the ROM title (spaces, dashes, and special characters are ignored — only letters and numbers are compared).

**Example:** ROM `Super Mario 64.z64` → Cover: `covers/Super Mario 64.jpg`

Place matching cover files in `covers/` with a filename that loosely matches the ROM title.

### Recommended game cover size

**660 × 900 px** (portrait, 11:15 ratio). JPEG or PNG. Keep files under ~500 KB for smooth loading.

---

## Custom Tiles (Home Menu)

When you right-click an empty slot in the home grid, you can add three kinds of custom tiles:

### Image Tile

Choose **Add Image** to pin a picture to the grid.

| Recommended size | Ratio | Format |
|------------------|-------|--------|
| **800 × 800 px** | 1:1   | PNG, JPG, JPEG, WebP |

- Square images work best — the grid crops to fit.
- Keep files under **~400 KB** for smooth rendering.

### Web Link Tile

Choose **Add Web Link** to pin an external URL. Enter the address and an optional display title. The tile shows a favicon and the page title when available.

### Folder Tile

Choose **Add Folder** to pin a local folder. Clicking the tile opens that folder in Windows Explorer. You can optionally set a cover image for the tile via right-click → **Set Cover Image**.

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

> The volume slider in **Settings → Audio** adjusts music volume live while you drag it.

---

## Custom Background

In **Settings → Appearance** you can set:

- **Background Image** — Pick any PNG, JPG, WEBP, or GIF file. Click **Clear** to remove.
- **Background Video** — Pick any MP4, WebM, MOV, or MKV file for an animated background. Click **Clear** to remove.
- **Live Backgrounds** — Choose Aurora or Pulse for animated color effects (no file needed).

The selected game's cover art always shows as a blurred background behind the grid.

### Recommended background sizes

| Type       | Recommended resolution | Aspect ratio | Format         |
|------------|------------------------|--------------|----------------|
| **Image**  | **1920 × 1080 px**     | 16:9         | JPG, PNG, WebP |
| **Video**  | **1920 × 1080 px**     | 16:9         | MP4, WebM      |

- Keep background images under **~2 MB** for fast loading.
- Keep background videos short, looped, and under **~10 MB** for smooth playback.
- Any standard resolution works — the app scales to fit the window.

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

### Default bindings

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

### Custom remapping

You can remap both keyboard and controller buttons in **Settings → Controls**.

- Each action shows its current binding.
- Click any binding button, then press the new key or controller button to assign it.
- Use **Reset to Default** to restore the original layout.

Custom bindings are saved automatically and applied immediately.

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
