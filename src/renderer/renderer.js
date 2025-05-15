const { ipcRenderer } = require('electron');

// Update title
document.getElementById('title').textContent = document.title;

// Handle check updates button
document.getElementById('checkUpdateBtn').addEventListener('click', () => {
  ipcRenderer.send('check-updates');
});

// Handle update now button
document.getElementById('updateNowBtn').addEventListener('click', () => {
  ipcRenderer.send('update-now');
});

// Handle settings button
document.getElementById('settingsBtn').addEventListener('click', () => {
  ipcRenderer.send('open-settings');
});

// Listen for update available event
ipcRenderer.on('update-available', () => {
  document.getElementById('updateBanner').classList.remove('hidden');
});

// Listen for update not available event
ipcRenderer.on('update-not-available', () => {
  const statusCard = document.querySelector('.status-card');
  statusCard.innerHTML = `
    <div class="status-icon">
      <img src="../assets/check-circle.png" alt="Status" class="status-img">
    </div>
    <div class="status-content">
      <h2>You're up to date!</h2>
      <p class="status-description">Your application is running the latest version</p>
    </div>
  `;
}); 