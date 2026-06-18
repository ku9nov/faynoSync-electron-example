const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const { autoDownload } = require('./config.js');

autoUpdater.autoDownload = autoDownload;
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

  autoUpdater.on('update-available', async (info) => {
    const meta = { ...currentMeta, fromVersion: app.getVersion(), version: info.version };
    if (autoDownload) {
      send('update:meta', meta);
      return;
    }
    const win = BrowserWindow.getAllWindows()[0];
    const { response } = await dialog.showMessageBox(win && !win.isDestroyed() ? win : null, {
      type: 'info',
      title: 'Update available',
      message: `Version ${info.version} is available (current ${app.getVersion()}).`,
      detail: 'Do you want to download and install it now?',
      buttons: ['Download', 'Later'],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) {
      send('update:meta', meta);
      autoUpdater.downloadUpdate();
    }
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
  if (autoDownload) send('update:meta', currentMeta);
  autoUpdater.setFeedURL({ provider: 'generic', url: feedUrl });
  autoUpdater.checkForUpdates();
  return true;
}

module.exports = { startBackgroundUpdate };
