const { app, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

let wired = false;
let onError = null;

function feedDirFromPackageUrls(packageUrls) {
  const yml = (packageUrls || []).find((p) => p.package === 'yml');
  if (!yml || !yml.url) return null;
  return yml.url.substring(0, yml.url.lastIndexOf('/'));
}

function wire() {
  if (wired) return;
  wired = true;

  autoUpdater.on('download-progress', (p) => {
    console.log(`Update download: ${Math.round(p.percent)}% (${p.transferred}/${p.total})`);
  });

  autoUpdater.on('update-downloaded', async () => {
    const { response } = await dialog.showMessageBox({
      type: 'question',
      title: 'Update ready',
      message: 'The update has been downloaded. Restart now to install?',
      buttons: ['Restart', 'Later'],
      defaultId: 0,
    });
    if (response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('autoUpdater error:', err);
    if (onError) onError(err);
  });
}

// Starts a silent background download for the update described by the faynoSync
// response. Calls onErrorFallback(err) if electron-updater fails so the caller
// can fall back to manual download. Returns false when background update is not
// possible (dev mode or missing feed metadata).
function startBackgroundUpdate(resp, onErrorFallback) {
  if (!app.isPackaged) {
    // autoUpdater requires a packaged app. For local testing use a
    // dev-app-update.yml + autoUpdater.forceDevUpdateConfig = true.
    console.log('Skipping background update: app is not packaged (dev mode).');
    return false;
  }
  const feedUrl = feedDirFromPackageUrls(resp.packageUrls);
  if (!feedUrl) {
    console.log('No yml in packageUrls, cannot configure feed.');
    return false;
  }
  onError = onErrorFallback || null;
  wire();
  autoUpdater.setFeedURL({ provider: 'generic', url: feedUrl });
  autoUpdater.checkForUpdates();
  return true;
}

module.exports = { startBackgroundUpdate };
