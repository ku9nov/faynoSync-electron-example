const { BrowserWindow } = require('electron');
const { Client, systemPlatform, systemArch } = require('@faynosync/sdk-js');
const { startBackgroundUpdate } = require('./autoUpdate.js');
const { version, app_name, channel, owner, baseURL, edgeURL } = require('./config.js');

let client;
function getClient() {
  if (!client) {
    client = new Client({ baseURL, edgeURL: edgeURL || undefined });
  }
  return client;
}

let lastResult = null;

function createChoiceWindow(packageUrls, data) {
  const win = new BrowserWindow({
    width: 600,
    height: 400,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            background-color: #f5f5f5;
            margin: 0;
            padding: 20px;
            color: #333;
          }
          h2 {
            color: #2c3e50;
            margin-bottom: 20px;
            font-size: 24px;
            text-align: center;
          }
          ul {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          li {
            margin-bottom: 10px;
          }
          a {
            display: block;
            padding: 12px 20px;
            background-color: #fff;
            border: 1px solid #ddd;
            border-radius: 6px;
            color: #2c3e50;
            text-decoration: none;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          a:hover {
            background-color: #f8f9fa;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            border-color: #3498db;
          }
          a.critical {
            background-color: #dc2626;
            color: white;
            border-color: #dc2626;
          }
          a.critical:hover {
            background-color: #b91c1c;
            border-color: #b91c1c;
          }
          .changelog {
            margin-top: 20px;
            padding: 15px;
            background-color: #fff;
            border-radius: 6px;
            border: 1px solid #ddd;
          }
          .changelog h3 {
            margin-top: 0;
            color: #2c3e50;
          }
          .changelog-content {
            line-height: 1.6;
          }
          .changelog-content h3 {
            color: #2c3e50;
            margin: 1em 0 0.5em;
          }
          .changelog-content ul {
            list-style: disc;
            padding-left: 1.5em;
            margin: 0.5em 0;
          }
          .changelog-content li {
            margin-bottom: 0.5em;
          }
        </style>
      </head>
      <body>
        <h2>Choose an update package:</h2>
        <ul>
          ${packageUrls
            .map(
              (option, index) => {
                const fileName = option.url.split('/').pop();
                const isCritical = data.critical;
                return `<li><a id="option-${index}" href="${option.url}" class="${isCritical ? 'critical' : ''}">${fileName}</a></li>`;
              }
            )
            .join('')}
        </ul>
        ${data.changelog ? `
          <div class="changelog">
            <h3>Changelog:</h3>
            <div id="changelog-content" class="changelog-content"></div>
          </div>
        ` : ''}
        <script>
          const { shell } = require('electron');
          const { marked } = require('marked');
          document.addEventListener('click', (event) => {
            if (event.target.tagName === 'A') {
              event.preventDefault();
              shell.openExternal(event.target.href);
            }
          });

          // Render changelog markdown if it exists
          if (document.getElementById('changelog-content')) {
            const changelog = ${JSON.stringify(data.changelog)};
            document.getElementById('changelog-content').innerHTML = marked.parse(changelog);
          }
        </script>
      </body>
    </html>
  `;

  win.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(htmlContent)}`);

  return win;
}

async function checkForUpdates(deviceId) {
  try {
    const resp = await getClient().checkForUpdates({
      owner,
      appName: app_name,
      version,
      channel,
      platform: systemPlatform(),
      arch: systemArch(),
      deviceId,
    });
    console.log(resp);
    lastResult = resp;

    if (resp.updateAvailable) {
      const started = startBackgroundUpdate(resp, () => {
        createChoiceWindow(resp.packageUrls, resp);
      });
      if (!started) {
        createChoiceWindow(resp.packageUrls, resp);
      }
    } else {
      const win = BrowserWindow.getAllWindows()[0];
      if (win && !win.isDestroyed()) win.webContents.send('update-not-available');
    }
    return resp;
  } catch (err) {
    console.error('Update check failed:', err);
    return null;
  }
}

function openUpdateChoice() {
  if (lastResult && lastResult.updateAvailable) {
    return createChoiceWindow(lastResult.packageUrls, lastResult);
  }
}

module.exports = { checkForUpdates, openUpdateChoice, createChoiceWindow };
