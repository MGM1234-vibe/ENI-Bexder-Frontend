/* ── ENI Bexder — Update Checker ──────────────────────────────────────── */

const Updater = (() => {
  const CURRENT_VERSION = '1.0.0';

  async function check() {
    // Placeholder: in production, fetch from your update server
    // e.g. await fetch('https://enibexder.example.com/version.json')
    // For now, just logs that check ran
    console.log('[Updater] Version check ran. Current version:', CURRENT_VERSION);
    return null; // null = no update available
  }

  async function runIfEnabled(settings) {
    if (!settings.checkUpdates) return;
    const update = await check();
    if (update) {
      App.showToast('Update available: v' + update.version);
    }
  }

  return { check, runIfEnabled, CURRENT_VERSION };
})();
