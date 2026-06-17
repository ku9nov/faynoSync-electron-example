const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

let wired = false;
let manualFallback = null;
let currentMeta = null;

function send(channel, payload) {
  const win = BrowserWindow.getAllWindows()[0];
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function feedDirFromPackageUrls(packageUrls) {
  const yml = (packageUrls || []).find((p) => p.package === 'yml');
  if (!yml || !yml.url) return null;
  return yml.url.substring(0, yml.url.lastIndexOf('/'));
}

function wire() {
  if (wired) return;
  wired = true;

  autoUpdater.on('update-available', (info) => {
    send('update:meta', { ...currentMeta, fromVersion: app.getVersion(), version: info.version });
  });

  autoUpdater.on('update-not-available', () => {
    send('update:error', { message: 'No matching update found in feed metadata.' });
  });

  autoUpdater.on('download-progress', (p) => {
    send('update:progress', {
      percent: p.percent,
      transferred: p.transferred,
      total: p.total,
      bytesPerSecond: p.bytesPerSecond,
    });
  });

  autoUpdater.on('update-downloaded', () => {
    send('update:ready');
  });

  autoUpdater.on('error', (err) => {
    console.error('autoUpdater error:', err);
    send('update:error', { message: String((err && err.message) || err) });
  });

  ipcMain.on('update:restart', () => autoUpdater.quitAndInstall());
  ipcMain.on('update:manual', () => {
    if (manualFallback) manualFallback();
  });
}

// Starts a silent background download for the update described by the faynoSync
// response and drives the in-app update modal via IPC. onManual is invoked when
// the user asks for a manual download (error state). Returns false when
// background update is not possible (dev mode or missing feed metadata).
function startBackgroundUpdate(resp, onManual) {
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
  manualFallback = onManual || null;
  currentMeta = {
    changelog: resp.changelog || '',
    critical: Boolean(resp.critical),
    source: resp.source || '',
    fromVersion: app.getVersion(),
  };
  wire();
  send('update:meta', currentMeta);
  autoUpdater.setFeedURL({ provider: 'generic', url: feedUrl });
  autoUpdater.checkForUpdates();
  return true;
}

module.exports = { startBackgroundUpdate };
