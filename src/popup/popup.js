import {
  getAllExtensions,
  areExtsBeingMonitored,
  initMonitorAll,
  stopMonitorAll,
  viewActivityLogs,
} from '../lib/extListen.js';

async function init() {
  const extensions = await getAllExtensions();
  const startMonitorAllBtn = document.getElementById('startMonitorBtn');
  const stopMonitorAllBtn = document.getElementById('stopMonitorBtn');
  const viewActivityLogBtn = document.getElementById('actLogPage');
  const monitorStatusText = document.getElementById('monitorStatus');

  startMonitorAllBtn.addEventListener('click', () => {
    initMonitorAll(extensions);
  });

  stopMonitorAllBtn.addEventListener('click', () => {
    stopMonitorAll();
  });

  viewActivityLogBtn.addEventListener('click', () => {
    viewActivityLogs();
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
