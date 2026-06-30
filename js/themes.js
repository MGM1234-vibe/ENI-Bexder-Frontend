/* ── ENI Bexder — Theme System ────────────────────────────────────────── */

const Themes = (() => {
  const body = document.getElementById('app-body');

  function apply(settings) {
    body.classList.remove('theme-dark', 'theme-light', 'theme-custom');
    const theme = settings.theme || 'dark';
    body.classList.add('theme-' + theme);

    // Live background
    body.classList.remove('live-bg-aurora', 'live-bg-pulse');
    const liveBg = settings.liveBg || 'off';
    if (liveBg !== 'off') body.classList.add('live-bg-' + liveBg);

    if (theme === 'custom') {
      document.documentElement.style.setProperty('--custom-bg',     settings.customBg     || '#0a0a0f');
      document.documentElement.style.setProperty('--custom-accent', settings.customAccent || '#7c5cfc');
      document.documentElement.style.setProperty('--custom-text',   settings.customText   || '#ffffff');
    } else {
      document.documentElement.style.removeProperty('--custom-bg');
      document.documentElement.style.removeProperty('--custom-accent');
      document.documentElement.style.removeProperty('--custom-text');
    }

    // Custom background image
    if (settings.bgImagePath) {
      const imgUrl = `url('file://${settings.bgImagePath.replace(/\\/g, '/')}')`;
      const bgImageEl = document.getElementById('bg-image');
      if (bgImageEl) {
        bgImageEl.style.backgroundImage = imgUrl;
        bgImageEl.style.backgroundSize = 'cover';
        bgImageEl.style.backgroundPosition = 'center';
        bgImageEl.style.backgroundRepeat = 'no-repeat';
        bgImageEl.style.filter = 'none';
      }
    } else {
      const bgImageEl = document.getElementById('bg-image');
      if (bgImageEl) {
        bgImageEl.style.backgroundImage = '';
        bgImageEl.style.filter = '';
      }
    }

    // Background video
    const videoWrap = document.getElementById('bg-video-wrap');
    const video     = document.getElementById('bg-video');
    if (settings.bgVideoPath && videoWrap && video) {
      const src = 'file://' + settings.bgVideoPath.replace(/\\/g, '/');
      if (video.getAttribute('src') !== src) {
        video.src = src;
        video.load();
        video.play().catch(() => {});
      }
      videoWrap.classList.remove('hidden');
    } else if (videoWrap && video) {
      videoWrap.classList.add('hidden');
      video.pause();
      video.removeAttribute('src');
    }
  }

  function toggleCustomColors(visible) {
    const el = document.getElementById('custom-colors');
    if (el) el.classList.toggle('hidden', !visible);
  }

  async function scanThemeFolder(appDir) {
    const themesDir = appDir + '/themes';
    const result = await window.api.fs.readDir(themesDir);
    if (!result.ok) return [];
    return result.files.filter(f => f.name.endsWith('.json')).map(f => f.fullPath);
  }

  async function loadExternalTheme(filePath) {
    const result = await window.api.fs.readFile(filePath);
    if (!result.ok) return null;
    try { return JSON.parse(result.data); }
    catch { return null; }
  }

  return { apply, toggleCustomColors, scanThemeFolder, loadExternalTheme };
})();
