import {
  getAllExtensions,
  areExtsBeingMonitored,
  initMonitorAll,
  stopMonitorAll,
  viewActivityLogs,
} from '../lib/ext-listen.js';

async function init() {
  const extensions = await getAllExtensions();
  const startMonitorAllBtn = document.getElementById('startMonitorBtn');
  const stopMonitorAllBtn = document.getElementById('stopMonitorBtn');
  const viewActivityLogBtn = document.getElementById('actLogPage');
  const monitorStatusText = document.getElementById('monitorStatus');

  startMonitorAllBtn.addEventListener('click', async () => {
    const monitorMsg = await initMonitorAll(extensions);
    if (monitorMsg === 'ext-monitor-started') {
      window.close();
    } else {
      alert("Extension monitoring couldn't be started");
    }
  });

  stopMonitorAllBtn.addEventListener('click', async () => {
    const monitorMsg = await stopMonitorAll();
    if (monitorMsg === 'ext-monitor-stopped') {
      window.close();
    } else {
      alert("Extension monitoring couldn't be stopped");
    }
  });

  viewActivityLogBtn.addEventListener('click', () => {
    viewActivityLogs();
    window.close();
  });

  const status = await areExtsBeingMonitored();

  if (status) {
    monitorStatusText.textContent = 'Extensions are being monitored';
    monitorStatusText.classList.add('green');

    startMonitorAllBtn.classList.add('disabled');
    startMonitorAllBtn.setAttribute('disabled', 'disabled');

    stopMonitorAllBtn.removeAttribute('disabled');
  } else {
    monitorStatusText.textContent = 'No extensions being monitored';
    monitorStatusText.classList.add('red');

    stopMonitorAllBtn.classList.add('disabled');
    stopMonitorAllBtn.setAttribute('disabled', 'disabled');

    startMonitorAllBtn.removeAttribute('disabled');
  }
}

window.addEventListener('DOMContentLoaded', init);
