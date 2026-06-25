/* ── ENI Bexder — Profile Module ──────────────────────────────────────── */

const Profile = (() => {
  let _data = {};

  // SVG icon set as <img> src once; centering done entirely by CSS transform.
  const _SVG  = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">' +
    '<circle cx="12" cy="8" r="4"/>' +
    '<path d="M4 21c0-4.418 3.582-8 8-8s8 3.582 8 8"/>' +
    '</svg>';
  const _ICON_SRC = 'data:image/svg+xml;base64,' + btoa(_SVG);

  // Stamp the src onto every icon placeholder once at startup
  function _initIcons() {
    document.querySelectorAll('.avatar-icon-img').forEach(img => {
      img.src = _ICON_SRC;
    });
  }

  // ── Avatar background ─────────────────────────────────────────────────

  function _applyAvatarColor(color) {
    const c = color || '#7c5cfc';
    const mini  = document.getElementById('profile-avatar-mini');
    const large = document.getElementById('profile-avatar-large');
    if (mini)  mini.style.backgroundColor  = c;
    if (large) large.style.backgroundColor = c;
    const picker = document.getElementById('avatar-bg-color');
    if (picker) picker.value = c;
  }

  // ── Render ───────────────────────────────────────────────────────────

  function _render() {
    const hasCustom = !!_data.avatarPath;
    const color     = _data.avatarBgColor || '#7c5cfc';

    // Mini avatar — img covers the background when custom photo is set
    const imgMini = document.getElementById('profile-avatar-img');
    if (imgMini) {
      imgMini.style.display = hasCustom ? 'block' : 'none';
      if (hasCustom) imgMini.src = 'file://' + _data.avatarPath;
    }

    // Large avatar (modal)
    const imgLarge = document.getElementById('profile-large-img');
    if (imgLarge) {
      imgLarge.style.display = hasCustom ? 'block' : 'none';
      if (hasCustom) imgLarge.src = 'file://' + _data.avatarPath;
    }

    // Show/hide color row and remove button
    const colorRow  = document.getElementById('avatar-color-row');
    const removeBtn = document.getElementById('profile-remove-avatar-btn');
    if (colorRow)  colorRow.style.display  = hasCustom ? 'none' : 'flex';
    if (removeBtn) removeBtn.style.display = hasCustom ? 'inline-flex' : 'none';

    // Paint background (icon + color) on both containers
    _applyAvatarColor(color);

    // Username chip
    const usernameMini = document.getElementById('profile-username-mini');
    if (usernameMini) usernameMini.textContent = _data.username || 'Player';

    // Fill form fields
    const f = (id) => document.getElementById(id);
    if (f('profile-username-input'))   f('profile-username-input').value   = _data.username   || '';
    if (f('profile-birthday-input'))   f('profile-birthday-input').value   = _data.birthday   || '';
    if (f('profile-bio-input'))        f('profile-bio-input').value        = _data.bio        || '';
    if (f('profile-youtube-input'))    f('profile-youtube-input').value    = _data.youtube    || '';
    if (f('profile-discord-input'))    f('profile-discord-input').value    = _data.discord    || '';
    if (f('profile-twitch-input'))     f('profile-twitch-input').value     = _data.twitch     || '';
    if (f('profile-instagram-input'))  f('profile-instagram-input').value  = _data.instagram  || '';
  }

  // ── Public API ───────────────────────────────────────────────────────

  async function load() {
    _initIcons();
    _data = await Storage.loadProfile();
    _render();
  }

  async function save() {
    const f = (id) => document.getElementById(id);
    _data.username      = f('profile-username-input')?.value?.trim()   || 'Player';
    _data.birthday      = f('profile-birthday-input')?.value?.trim()  || '';
    _data.bio           = f('profile-bio-input')?.value?.trim()       || '';
    _data.youtube       = f('profile-youtube-input')?.value?.trim()   || '';
    _data.discord       = f('profile-discord-input')?.value?.trim()   || '';
    _data.twitch        = f('profile-twitch-input')?.value?.trim()    || '';
    _data.instagram     = f('profile-instagram-input')?.value?.trim() || '';
    _data.avatarBgColor = f('avatar-bg-color')?.value || '#7c5cfc';

    await Storage.saveProfile(_data);
    _render();

    const msg = f('profile-saved-msg');
    if (msg) {
      msg.classList.remove('hidden');
      setTimeout(() => msg.classList.add('hidden'), 2000);
    }
  }

  async function changeAvatar() {
    const filePath = await window.api.dialog.openFile([
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }
    ]);
    if (!filePath) return;
    _data.avatarPath = filePath;
    await Storage.saveProfile(_data);
    _render();
  }

  async function removeAvatar() {
    _data.avatarPath = '';
    await Storage.saveProfile(_data);
    _render();
  }

  function open() {
    Music.duck();
    _render();
    document.getElementById('profile-overlay').classList.remove('hidden');
  }

  function close() {
    Music.unduck();
    document.getElementById('profile-overlay').classList.add('hidden');
  }

  function init() {
    const $ = (id) => document.getElementById(id);

    $('profile-btn')?.addEventListener('click', open);
    $('profile-close')?.addEventListener('click', close);
    $('profile-cancel-btn')?.addEventListener('click', close);
    $('profile-save-btn')?.addEventListener('click', save);
    $('profile-avatar-btn')?.addEventListener('click', changeAvatar);
    $('profile-remove-avatar-btn')?.addEventListener('click', removeAvatar);

    // Live-preview avatar color without saving
    $('avatar-bg-color')?.addEventListener('input', (e) => {
      _applyAvatarColor(e.target.value);
    });

    $('profile-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'profile-overlay') close();
    });
  }

  return { load, init, getData: () => _data };
})();
