/* ── ENI Bexder — Now Playing Widget ─────────────────────────────────── */

const NowPlaying = (() => {
  let _container = null;
  let _volVisible = false;
  let _volTimeout = null;

  // ── SVG helpers ──────────────────────────────────────────────────────────

  const SVG = {
    note:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
    prev:   `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>`,
    next:   `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm2-8.14 5.5 3.64L8 18.14V9.86zM16 6h2v12h-2z"/></svg>`,
    play:   `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
    pause:  `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
    shuffle:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16 3h5v5M4 20l16-16M21 16v5h-5M4 4l7 7M14 14l7 7"/></svg>`,
    repeat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
    vol:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`,
    volOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`,
  };

  // ── Volume panel ─────────────────────────────────────────────────────────

  function _showVol() {
    if (_volTimeout) clearTimeout(_volTimeout);
    _volVisible = true;
    _container?.querySelector('#np-vol-panel')?.classList.add('np-vol-visible');
  }

  function _hideVol(delay = 800) {
    if (_volTimeout) clearTimeout(_volTimeout);
    _volTimeout = setTimeout(() => {
      _volVisible = false;
      _container?.querySelector('#np-vol-panel')?.classList.remove('np-vol-visible');
    }, delay);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  function renderIdle() {
    if (!_container) return;
    _container.innerHTML = `
      <div id="np-disc" class="np-disc-idle">
        <div class="np-disc-inner">${SVG.note}</div>
      </div>
      <span id="np-idle">No Music</span>
      <div id="np-vol-wrap">
        <button class="np-btn np-vol-btn" id="np-vol-btn" title="Volume">${SVG.vol}</button>
        <div id="np-vol-panel">
          <input type="range" id="np-vol-slider" min="0" max="100" value="${Math.round(Music.isPlaying ? 75 : 75)}" />
          <span id="np-vol-label">75%</span>
        </div>
      </div>
    `;
    _bindVolumeControls();
  }

  function renderPlaying(track, isPlaying) {
    if (!_container) return;
    const title   = track.title || 'Unknown Track';
    const artist  = track.artist || '';
    const shuffle = Music.getShuffle?.() ?? false;
    const repeat  = Music.getRepeat?.()  ?? false;
    const volPct  = Math.round(Music.getVolumeRaw?.() * 100 ?? 75);
    const total   = Music.getTracks().length;
    const idx     = Music.getIndex?.() ?? 0;

    _container.innerHTML = `
      <div id="np-disc" class="${isPlaying ? 'np-disc-spin' : ''}">
        ${track.artPath
          ? `<img src="file://${track.artPath}" alt="Art" />`
          : `<div class="np-disc-inner">${SVG.note}</div>`
        }
      </div>

      <div id="np-info">
        <div id="np-title" class="${title.length > 22 ? 'np-scrolling' : ''}">${title}</div>
        <div id="np-sub">${artist || (total > 1 ? `${idx + 1} / ${total}` : '')}</div>
      </div>

      <div id="np-controls">
        <button class="np-btn" id="np-prev"  title="Previous">${SVG.prev}</button>
        <button class="np-btn np-play" id="np-play-pause" title="${isPlaying ? 'Pause' : 'Play'}">
          ${isPlaying ? SVG.pause : SVG.play}
        </button>
        <button class="np-btn" id="np-next"  title="Next">${SVG.next}</button>
      </div>

      <div id="np-extras">
        <button class="np-btn np-toggle ${shuffle ? 'np-active' : ''}" id="np-shuffle" title="Shuffle">${SVG.shuffle}</button>
        <button class="np-btn np-toggle ${repeat  ? 'np-active' : ''}" id="np-repeat"  title="Repeat">${SVG.repeat}</button>
        <div id="np-vol-wrap">
          <button class="np-btn np-vol-btn" id="np-vol-btn" title="Volume">${volPct === 0 ? SVG.volOff : SVG.vol}</button>
          <div id="np-vol-panel">
            <input type="range" id="np-vol-slider" min="0" max="100" value="${volPct}" />
            <span id="np-vol-label">${volPct}%</span>
          </div>
        </div>
      </div>

      <div id="np-progress-wrap">
        <div id="np-progress-bg">
          <div id="np-progress-bar"></div>
        </div>
      </div>
    `;

    _bindPlayingControls(shuffle, repeat);
    _bindVolumeControls();
    _bindSeek();
  }

  // ── Event binding ─────────────────────────────────────────────────────────

  function _bindPlayingControls(shuffle, repeat) {
    document.getElementById('np-prev')?.addEventListener('click', () => {
      Music.prev(); Sfx?.play('track');
    });
    document.getElementById('np-next')?.addEventListener('click', () => {
      Music.next(); Sfx?.play('track');
    });
    document.getElementById('np-play-pause')?.addEventListener('click', () => {
      Music.toggle();
    });
    document.getElementById('np-shuffle')?.addEventListener('click', (e) => {
      const active = e.currentTarget.classList.toggle('np-active');
      Music.setShuffle(active);
      Sfx?.play('nav');
    });
    document.getElementById('np-repeat')?.addEventListener('click', (e) => {
      const active = e.currentTarget.classList.toggle('np-active');
      Music.setRepeat(active);
      Sfx?.play('nav');
    });
  }

  function _bindVolumeControls() {
    const btn    = document.getElementById('np-vol-btn');
    const panel  = document.getElementById('np-vol-panel');
    const slider = document.getElementById('np-vol-slider');
    const label  = document.getElementById('np-vol-label');
    if (!btn || !slider) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (_volVisible) _hideVol(0);
      else _showVol();
    });
    panel?.addEventListener('mouseenter', () => { if (_volTimeout) clearTimeout(_volTimeout); });
    panel?.addEventListener('mouseleave', () => _hideVol());

    const storedVol = parseInt(slider.value, 10);
    if (label) label.textContent = storedVol + '%';

    slider.addEventListener('input', () => {
      const v = parseInt(slider.value, 10);
      if (label) label.textContent = v + '%';
      Music.setVolume(v);
      Sfx?.setVolume(v / 100);
      btn.innerHTML = v === 0 ? SVG.volOff : SVG.vol;
    });
  }

  function _bindSeek() {
    const bar = document.getElementById('np-progress-bg');
    if (!bar) return;
    bar.addEventListener('click', (e) => {
      const rect = bar.getBoundingClientRect();
      const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const dur  = Music.getDuration();
      if (dur && window.MusicAudio) window.MusicAudio.currentTime = pct * dur;
    });
  }

  // ── Progress ticker ──────────────────────────────────────────────────────

  function _startTicker() {
    setInterval(() => {
      const bar = document.getElementById('np-progress-bar');
      if (bar) {
        const pct = Music.getProgress();
        bar.style.width = pct + '%';
      }
    }, 400);
  }

  // ── Public API ───────────────────────────────────────────────────────────

  function update(track, isPlaying) {
    if (!track) renderIdle();
    else renderPlaying(track, isPlaying);
  }

  function init() {
    _container = document.getElementById('now-playing-widget');
    if (!_container) return;

    renderIdle();
    _startTicker();

    Music.onChange((track, playing) => update(track, playing));

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#np-vol-wrap')) _hideVol(0);
    });
  }

  return { init, update };
})();
