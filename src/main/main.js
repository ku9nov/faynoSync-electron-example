const { app, BrowserWindow, dialog, shell, ipcMain } = require('electron');
const fetch = require('node-fetch');
const os = require('os');
const path = require('path');
const { version, app_name, channel, owner } = require('./config.js');
const fs = require('fs');
const { marked } = require('marked');

function getLinuxDistributionFamily() {
  let distroFamily = 'Linux';
  try {
    const releaseInfo = fs.readFileSync('/etc/os-release', 'utf8');
    const match = releaseInfo.match(/^ID(?:_LIKE)?=(.*)$/m);
    if (match) {
      const idLike = match[1].trim().toLowerCase();
      if (idLike.includes('rhel') || idLike.includes('fedora') || idLike.includes('centos')) {
        distroFamily = 'RHEL';
      } else if (idLike.includes('debian') || idLike.includes('ubuntu') || idLike.includes('kali')) {
        distroFamily = 'Debian';
      }
    }
  } catch (err) {
    console.error('Error getting Linux distribution family:', err);
  }
  return distroFamily;
}

function createChoiceWindow(updateOptions, data) {
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
          ${updateOptions
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

function checkUpdates() {
  let url = `http://localhost:9000/checkVersion?app_name=${app_name}&version=${version}&platform=${os.platform()}&arch=${os.arch()}&owner=${owner}`;

  // Check if the 'channel' variable is set
  if (channel !== undefined) {
    url += `&channel=${channel}`;
  }

  fetch(url, { method: 'GET' })
    .then((res) => res.json())
    .then((data) => {
      console.log(data);
      if (data.update_available) {
        const message = `You have an older version. Would you like to update your app?`;
        dialog.showMessageBox({
          type: 'question',
          title: 'Update available',
          message: message,
          buttons: ['Yes', 'No'],
          defaultId: 0,
        }).then(({ response }) => {
          if (response === 0) {
            const updateOptions = [];
            // Assuming 'data' contains different update URLs
            for (const key in data) {
              if (key.startsWith('update_url_')) {
                updateOptions.push({ name: key.substring(11).toUpperCase(), url: data[key] });
              }
            }
            const choiceWindow = createChoiceWindow(updateOptions, data);
          }
        });
      }
    })
    .catch(() => {});
}

function createWindow() {
  let osName = os.platform();
  let pcArch = os.arch();
  if (osName === 'linux') {
    osName = getLinuxDistributionFamily();
  }
  const title = `${app_name} - v${version} (${osName}-${pcArch})`;

  let win = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.setTitle(title);
  
  // Update the path to the renderer files
  const indexPath = path.join(__dirname, '../renderer/index.html');
  win.loadFile(indexPath);
  
  // Pass version to renderer
  win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript(`
      window.version = "${version}";
      document.getElementById('version').textContent = 'v${version}';
    `);
    // Check for updates after window is loaded
    checkUpdates();
  });

  win.on('closed', () => {
    win = null;
  });

  // Handle IPC events
  ipcMain.on('check-updates', () => {
    checkUpdates();
  });

  ipcMain.on('update-now', () => {
    const updateOptions = [];
    // Assuming 'data' contains different update URLs
    for (const key in data) {
      if (key.startsWith('update_url_')) {
        updateOptions.push({ name: key.substring(11).toUpperCase(), url: data[key] });
      }
    }
    const choiceWindow = createChoiceWindow(updateOptions, data);
  });

  ipcMain.on('open-settings', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Settings',
      message: 'This is a Hello World example application — what did you expect to see here?',
      buttons: ['OK']
    });
  });
}

app.whenReady().then(createWindow);