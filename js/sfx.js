/* ── ENI Bexder — Sound Effects ────────────────────────────────────────── */
/*
 *  Priority order (per sound name):
 *    1. Custom audio file in  assets/sounds/<name>.{mp3,wav,ogg,flac}
 *    2. Built-in Web Audio API synthesizer
 *
 *  To override any sound, drop a file named after it into assets/sounds/:
 *    nav.mp3   confirm.wav   back.ogg   favorite.mp3   launch.mp3
 *    error.wav   open.mp3   close.mp3   track.mp3
 */

const Sfx = (() => {
  let _ctx      = null;
  let _enabled  = true;
  let _volume   = 0.5;
  let _appDir   = null;
  let _custom   = {};    // name → HTMLAudioElement (pre-loaded custom files)

  const AUDIO_EXTS = ['mp3', 'wav', 'ogg', 'flac', 'm4a'];

  // ── Context ──────────────────────────────────────────────────────────────

  function _getCtx() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  }

  // ── Custom file loader ───────────────────────────────────────────────────

  async function _loadCustomSounds() {
    try {
      _appDir = await window.api.app.getDir();
    } catch { return; }

    const soundsDir = _appDir + '/assets/sounds';
    const result    = await window.api.fs.readDir(soundsDir);
    if (!result?.ok) return;

    for (const file of result.files) {
      if (file.isDirectory) continue;
      const dotIdx  = file.name.lastIndexOf('.');
      if (dotIdx < 0) continue;
      const name    = file.name.slice(0, dotIdx).toLowerCase();
      const ext     = file.name.slice(dotIdx + 1).toLowerCase();
      if (!AUDIO_EXTS.includes(ext)) continue;
      if (_custom[name]) continue;     // first match wins

      const audio       = new Audio();
      audio.src         = 'file://' + file.fullPath;
      audio.preload     = 'auto';
      _custom[name]     = audio;
    }
  }

  // ── Low-level synth helpers ──────────────────────────────────────────────

  function _osc(type, freq, startTime, duration, gainPeak, ctx, dest) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    env.gain.setValueAtTime(0, startTime);
    env.gain.linearRampToValueAtTime(gainPeak * _volume, startTime + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(env);
    env.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  function _noise(startTime, duration, gainPeak, freq, q, ctx, dest) {
    const buf  = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const src  = ctx.createBufferSource();
    src.buffer = buf;

    const filt = ctx.createBiquadFilter();
    filt.type  = 'bandpass';
    filt.frequency.value = freq;
    filt.Q.value = q;

    const env = ctx.createGain();
    env.gain.setValueAtTime(gainPeak * _volume, startTime);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    src.connect(filt);
    filt.connect(env);
    env.connect(dest);
    src.start(startTime);
    src.stop(startTime + duration + 0.01);
  }

  // ── Built-in synthesized sounds ──────────────────────────────────────────

  const _synth = {

    nav() {
      const ctx = _getCtx(), t = ctx.currentTime;
      _noise(t, 0.03, 0.18, 2800, 8, ctx, ctx.destination);
      _osc('sine', 1800, t, 0.025, 0.06, ctx, ctx.destination);
    },

    confirm() {
      const ctx = _getCtx(), t = ctx.currentTime;
      _osc('sine',     880,  t,        0.10, 0.22, ctx, ctx.destination);
      _osc('sine',    1320,  t + 0.07, 0.14, 0.26, ctx, ctx.destination);
      _osc('triangle', 660,  t,        0.10, 0.08, ctx, ctx.destination);
    },

    back() {
      const ctx = _getCtx(), t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(440, t + 0.12);
      env.gain.setValueAtTime(0.22 * _volume, t);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(env); env.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.14);
    },

    favorite() {
      const ctx = _getCtx(), t = ctx.currentTime;
      [523, 659, 784, 1047].forEach((freq, i) =>
        _osc('sine', freq, t + i * 0.05, 0.14, 0.18, ctx, ctx.destination));
    },

    launch() {
      const ctx = _getCtx(), t = ctx.currentTime;
      const osc  = ctx.createOscillator();
      const env  = ctx.createGain();
      const filt = ctx.createBiquadFilter();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.3);
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(800, t);
      filt.frequency.exponentialRampToValueAtTime(3200, t + 0.3);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.18 * _volume, t + 0.02);
      env.gain.setValueAtTime(0.18 * _volume, t + 0.25);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      osc.connect(filt); filt.connect(env); env.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.6);
      [440, 554, 659].forEach((freq, i) =>
        _osc('sine', freq, t + 0.25 + i * 0.02, 0.35, 0.12, ctx, ctx.destination));
    },

    error() {
      const ctx = _getCtx(), t = ctx.currentTime;
      _osc('sawtooth', 180, t,        0.08, 0.18, ctx, ctx.destination);
      _osc('sawtooth', 120, t + 0.06, 0.09, 0.14, ctx, ctx.destination);
    },

    open() {
      const ctx = _getCtx(), t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(900, t + 0.06);
      env.gain.setValueAtTime(0.15 * _volume, t);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      osc.connect(env); env.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.12);
    },

    close() {
      const ctx = _getCtx(), t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, t);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.07);
      env.gain.setValueAtTime(0.12 * _volume, t);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      osc.connect(env); env.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.11);
    },

    track() {
      const ctx = _getCtx(), t = ctx.currentTime;
      _osc('sine', 660, t,        0.08, 0.12, ctx, ctx.destination);
      _osc('sine', 880, t + 0.06, 0.09, 0.10, ctx, ctx.destination);
    },
  };

  // ── Public API ───────────────────────────────────────────────────────────

  function play(name) {
    if (!_enabled) return;
    try {
      // Custom file takes priority
      if (_custom[name]) {
        const audio   = _custom[name].cloneNode();
        audio.volume  = _volume;
        audio.play().catch(() => {});
        return;
      }
      // Fall back to synthesizer
      if (_synth[name]) _synth[name]();
    } catch { /* AudioContext blocked before first gesture — silently skip */ }
  }

  /** Re-scans assets/sounds/ at runtime (call after user drops a new file) */
  async function reload() {
    _custom = {};
    await _loadCustomSounds();
  }

  async function init() {
    await _loadCustomSounds();
  }

  function setEnabled(val)   { _enabled = val; }
  function setVolume(v)      { _volume  = Math.max(0, Math.min(1, v)); }
  function isEnabled()       { return _enabled; }
  function getVolume()       { return _volume; }
  function listCustom()      { return Object.keys(_custom); }
  function listSynth()       { return Object.keys(_synth); }

  return { init, play, reload, setEnabled, setVolume, isEnabled, getVolume,
           listCustom, listSynth };
})();
