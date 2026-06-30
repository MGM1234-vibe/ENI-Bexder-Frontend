/* ── ENI Bexder — Input Controls (Keyboard + Controller) ─────────────── */

const Controls = (() => {
  let _gamepadIndex = null;
  let _lastButtons = [];
  let _deadzone = 0.15;
  let _rafId = null;
  let _cooldown = false;
  let _cooldownTime = 180; // ms between actions

  let _keyMap = null;
  let _btnMap = null;
  let _rebindTarget = null;

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

  function setKeyMap(map) {
    _keyMap = map;
  }

  function getKeyMap() {
    if (!_keyMap) {
      _keyMap = {
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
    }
    return _keyMap;
  }

  function getBtnMap() {
    if (!_btnMap) {
      _btnMap = {
        0: 'confirm',
        1: 'back',
        2: 'search',
        3: 'favorite',
        4: 'nav-prev',
        5: 'nav-next',
        9: 'back',
        12: 'up',
        13: 'down',
        14: 'prev',
        15: 'next',
      };
    }
    return _btnMap;
  }

  function setBtnMap(map) {
    _btnMap = map;
  }

  function _actionForCode(code) {
    return getKeyMap()[code] || null;
  }

  function _actionForBtn(index) {
    return getBtnMap()[index] || null;
  }

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

  // ── Rebind capture ────────────────────────────────────────────────────

  function startKeyRebind(action, onDone) {
    _rebindTarget = { type: 'key', action, onDone };
    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const code = e.code;
      const map = getKeyMap();
      const old = Object.entries(map).find(([, a]) => a === action);
      if (old) delete map[old[0]];
      map[code] = action;
      document.removeEventListener('keydown', handler);
      _rebindTarget = null;
      if (onDone) onDone(code);
    };
    document.addEventListener('keydown', handler, { once: false });
  }

  function startBtnRebind(action, onDone) {
    _rebindTarget = { type: 'btn', action, onDone };
    const poll = () => {
      const gamepads = navigator.getGamepads();
      for (const gp of gamepads) {
        if (!gp) continue;
        for (let i = 0; i < gp.buttons.length; i++) {
          if (gp.buttons[i].pressed) {
            const map = getBtnMap();
            const old = Object.entries(map).find(([, a]) => a === action);
            if (old) delete map[old[0]];
            map[i] = action;
            _rebindTarget = null;
            if (onDone) onDone(i);
            return;
          }
        }
      }
      if (_rebindTarget) requestAnimationFrame(poll);
    };
    poll();
  }

  function cancelRebind() {
    _rebindTarget = null;
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
    if (_rebindTarget && _rebindTarget.type === 'key') return;
    _setInputMode('keyboard');

    const action = _actionForCode(e.code) || _actionForCode(e.key);
    if (!action) return;

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

      gp.buttons.forEach((btn, i) => {
        const wasPressed = _lastButtons[i] || false;
        const isPressed = btn.pressed;
        if (isPressed && !wasPressed) {
          _setInputMode('gamepad');
          if (_rebindTarget && _rebindTarget.type === 'btn') return;
          const action = _actionForBtn(i);
          if (action) _triggerAction(action);
        }
      });

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

    for (const gp of navigator.getGamepads()) {
      if (gp) { _gamepadIndex = gp.index; _pollGamepad(); break; }
    }
  }

  return { init, setDeadzone, applyProfile, getKeyMap, getBtnMap, setKeyMap, setBtnMap, startKeyRebind, startBtnRebind, cancelRebind };
})();
