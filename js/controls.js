/* ── ENI Bexder — Input Controls (Keyboard + Controller) ─────────────── */

const Controls = (() => {
  let _gamepadIndex = null;
  let _lastButtons = [];
  let _deadzone = 0.15;
  let _rafId = null;
  let _cooldown = false;
  let _cooldownTime = 180; // ms between actions

  // ── Controller profiles ───────────────────────────────────────────────
  const PROFILES = {
    default: { deadzone: 15, cooldown: 180 },
    arcade:  { deadzone: 5,  cooldown: 110 },
    racing:  { deadzone: 25, cooldown: 160 },
    rpg:     { deadzone: 10, cooldown: 220 },
  };

  function applyProfile(name) {
    const p = PROFILES[name] || PROFILES.default;
    setDeadzone(p.deadzone);
    _cooldownTime = p.cooldown;
  }

  const KEY_ACTIONS = {
    'ArrowLeft':  'prev',
    'ArrowRight': 'next',
    'ArrowUp':    'up',
    'ArrowDown':  'down',
    'Enter':      'confirm',
    ' ':          'confirm',
    'Escape':     'back',
    'KeyF':       'favorite',
    'F11':        'fullscreen',
    'KeyS':       'search',
    'KeyQ':       'nav-prev',
    'KeyE':       'nav-next',
  };

  // Xbox-style button indices
  const BUTTON_ACTIONS = {
    0: 'confirm',    // A
    1: 'back',       // B
    2: 'search',     // X (search)
    3: 'favorite',   // Y
    4: 'nav-prev',   // LB (left bumper)
    5: 'nav-next',   // RB (right bumper)
    9: 'back',       // Start/Menu
    12: 'up',        // D-pad up
    13: 'down',      // D-pad down
    14: 'prev',      // D-pad left
    15: 'next',      // D-pad right
  };

  function _triggerAction(action) {
    if (_cooldown) return;
    _cooldown = true;
    setTimeout(() => { _cooldown = false; }, _cooldownTime);

    switch (action) {
      case 'prev':      Pages.grid.prev();               break;
      case 'next':      Pages.grid.next();               break;
      case 'up':        Pages.grid.up();                 break;
      case 'down':      Pages.grid.down();               break;
      case 'confirm':   NavFocus.activate() || Pages.launchSelected(); break;
      case 'favorite':  Pages.toggleFavorite();          break;
      case 'back':      NavFocus.clear() || Pages.closeOverlays(); break;
      case 'search':    Pages.openSearch();              break;
      case 'nav-prev':  NavFocus.prev();                 break;
      case 'nav-next':  NavFocus.next();                 break;
      case 'fullscreen': window.api.window.fullscreenToggle(); break;
    }
  }

  // ── Input-mode hint switching ─────────────────────────────────────────
  let _currentMode = 'keyboard';

  function _setInputMode(mode) {
    if (_currentMode === mode) return;
    _currentMode = mode;
    const kb = document.getElementById('hints-keyboard');
    const gp = document.getElementById('hints-gamepad');
    if (kb) kb.classList.toggle('hidden', mode === 'gamepad');
    if (gp) gp.classList.toggle('hidden', mode === 'keyboard');
  }

  function _onKeyDown(e) {
    _setInputMode('keyboard');

    const action = KEY_ACTIONS[e.code] || KEY_ACTIONS[e.key];
    if (!action) return;

    // Don't interfere with text inputs
    const tag = document.activeElement?.tagName;
    if (['INPUT','TEXTAREA','SELECT'].includes(tag)) return;

    e.preventDefault();
    _triggerAction(action);
  }

  function _pollGamepad() {
    const gamepads = navigator.getGamepads();
    for (const gp of gamepads) {
      if (!gp) continue;
      _gamepadIndex = gp.index;

      // Buttons
      gp.buttons.forEach((btn, i) => {
        const wasPressed = _lastButtons[i] || false;
        const isPressed = btn.pressed;
        if (isPressed && !wasPressed) {
          _setInputMode('gamepad');
          const action = BUTTON_ACTIONS[i];
          if (action) _triggerAction(action);
        }
      });

      // Left stick
      const lx = gp.axes[0] || 0;
      const ly = gp.axes[1] || 0;

      if (Math.abs(lx) > _deadzone) {
        if (lx < 0) _triggerAction('prev');
        else        _triggerAction('next');
      }
      if (Math.abs(ly) > _deadzone) {
        if (ly < 0) _triggerAction('up');
        else        _triggerAction('down');
      }

      _lastButtons = gp.buttons.map(b => b.pressed);
      break;
    }

    _rafId = requestAnimationFrame(_pollGamepad);
  }

  function setDeadzone(pct) {
    _deadzone = Math.max(0, Math.min(0.5, pct / 100));
  }

  function init() {
    document.addEventListener('keydown', _onKeyDown);

    window.addEventListener('gamepadconnected', (e) => {
      _gamepadIndex = e.gamepad.index;
      _lastButtons = e.gamepad.buttons.map(b => b.pressed);
      if (!_rafId) _pollGamepad();
      _setInputMode('gamepad');
      App.showToast('Controller connected: ' + (e.gamepad.id || 'Gamepad'));
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      if (_gamepadIndex === e.gamepad.index) {
        _gamepadIndex = null;
        if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
        _setInputMode('keyboard');
      }
    });

    // Start polling if a gamepad is already connected
    for (const gp of navigator.getGamepads()) {
      if (gp) { _gamepadIndex = gp.index; _pollGamepad(); break; }
    }
  }

  return { init, setDeadzone, applyProfile };
})();
