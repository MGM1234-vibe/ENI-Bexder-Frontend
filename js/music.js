/* ── ENI Bexder — Music Player ────────────────────────────────────────── */

const Music = (() => {
  let _tracks = [];
  let _index = 0;
  let _audio = null;
  let _volume = 0.75;
  let _shuffle = false;
  let _repeat = false;
  let _playing = false;
  let _onChangeCallback = null;

  function _createAudio() {
    if (_audio) {
      _audio.pause();
      _audio.src = '';
    }
    _audio = new Audio();
    _audio.volume = _volume;
    _audio.addEventListener('ended', () => {
      if (_repeat) { _audio.currentTime = 0; _audio.play(); }
      else next();
    });
    _audio.addEventListener('play',  () => { _playing = true;  _notify(); });
    _audio.addEventListener('pause', () => { _playing = false; _notify(); });
    _audio.addEventListener('error', () => { next(); });
  }

  async function scan(musicDir) {
    const SUPPORTED = ['.mp3', '.wav', '.ogg', '.flac', '.m4a'];
    const result = await window.api.fs.readDir(musicDir);
    if (!result.ok) { _tracks = []; return; }
    _tracks = result.files
      .filter(f => !f.isDirectory && SUPPORTED.some(ext => f.name.toLowerCase().endsWith(ext)))
      .map(f => ({
        title: f.name.replace(/\.[^.]+$/, '').replace(/[_]/g, ' '),
        path: f.fullPath,
        artist: '',
      }));
    if (_shuffle) shuffleTracks();
  }

  function shuffleTracks() {
    for (let i = _tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [_tracks[i], _tracks[j]] = [_tracks[j], _tracks[i]];
    }
  }

  function play(index) {
    if (!_tracks.length) return;
    _index = Math.max(0, Math.min(index, _tracks.length - 1));
    if (!_audio) _createAudio();
    _audio.src = 'file://' + _tracks[_index].path;
    _audio.play().catch(() => {});
  }

  function toggle() {
    if (!_audio || !_tracks.length) { play(_index); return; }
    if (_audio.paused) _audio.play().catch(() => {});
    else _audio.pause();
  }

  function next() {
    if (!_tracks.length) return;
    _index = (_index + 1) % _tracks.length;
    play(_index);
  }

  function prev() {
    if (!_tracks.length) return;
    if (_audio && _audio.currentTime > 3) { _audio.currentTime = 0; return; }
    _index = (_index - 1 + _tracks.length) % _tracks.length;
    play(_index);
  }

  function setVolume(v) {
    _volume = Math.max(0, Math.min(1, v / 100));
    if (_audio) _audio.volume = _isDucked ? _volume * 0.25 : _volume;
  }

  let _isDucked = false;
  let _pausedForGame = false;
  let _fadeTimer = null;

  function _fadeTo(target, ms) {
    if (_fadeTimer) { clearInterval(_fadeTimer); _fadeTimer = null; }
    if (!_audio) return;
    const steps = 20;
    const interval = ms / steps;
    const start = _audio.volume;
    const delta = (target - start) / steps;
    let step = 0;
    _fadeTimer = setInterval(() => {
      step++;
      _audio.volume = Math.max(0, Math.min(1, start + delta * step));
      if (step >= steps) {
        clearInterval(_fadeTimer);
        _fadeTimer = null;
        _audio.volume = target;
      }
    }, interval);
  }

  function duck() {
    _isDucked = true;
    _fadeTo(_volume * 0.25, 300);
  }

  function unduck() {
    _isDucked = false;
    _fadeTo(_volume, 300);
  }

  function pauseForGame() {
    if (_playing) {
      _pausedForGame = true;
      if (_audio) _audio.pause();
    }
  }

  function resumeAfterGame() {
    if (_pausedForGame) {
      _pausedForGame = false;
      if (_audio && _tracks.length) _audio.play().catch(() => {});
    }
  }

  function setShuffle(val) {
    _shuffle = val;
    if (_shuffle) shuffleTracks();
  }

  function setRepeat(val) { _repeat = val; }

  function getProgress() {
    if (!_audio || !_audio.duration) return 0;
    return (_audio.currentTime / _audio.duration) * 100;
  }

  function getDuration() { return _audio ? _audio.duration || 0 : 0; }
  function getCurrentTime() { return _audio ? _audio.currentTime || 0 : 0; }

  function getCurrent() {
    if (!_tracks.length) return null;
    return _tracks[_index];
  }

  function isPlaying()    { return _playing; }
  function getTracks()    { return _tracks; }
  function getShuffle()   { return _shuffle; }
  function getRepeat()    { return _repeat; }
  function getIndex()     { return _index; }
  function getVolumeRaw() { return _volume; }

  function onChange(cb) { _onChangeCallback = cb; }

  function _notify() {
    if (_onChangeCallback) _onChangeCallback(getCurrent(), _playing);
  }

  function startIfNotPlaying() {
    if (_tracks.length && (!_audio || _audio.paused)) {
      play(_index);
    }
  }

  return {
    scan, play, toggle, next, prev,
    setVolume, setShuffle, setRepeat,
    getProgress, getDuration, getCurrentTime,
    getCurrent, isPlaying, getTracks,
    getShuffle, getRepeat, getIndex, getVolumeRaw,
    onChange, startIfNotPlaying,
    duck, unduck, pauseForGame, resumeAfterGame,
  };
})();
