import {
  areExtsBeingMonitored,
  initMonitorAll,
  stopMonitorAll,
  viewActivityLogs,
} from '../lib/ext-listen.js';

let monitorStatusText,
  startMonitorAllBtn,
  stopMonitorAllBtn,
  viewActivityLogBtn,
  errorMsgText;

function renderErrorMsg(message) {
  errorMsgText.textContent = message;
  errorMsgText.style.display = 'block';
}

function renderMonitorStartedUI() {
  startMonitorAllBtn.setAttribute('disabled', 'disabled');
  startMonitorAllBtn.classList.add('disabled');
  stopMonitorAllBtn.removeAttribute('disabled');
  stopMonitorAllBtn.classList.remove('disabled');

  monitorStatusText.textContent = 'Extensions are being monitored';
  monitorStatusText.classList.add('green');
  monitorStatusText.classList.remove('red');
}

function renderMonitorStoppedUI() {
  stopMonitorAllBtn.setAttribute('disabled', 'disabled');
  stopMonitorAllBtn.classList.add('disabled');
  startMonitorAllBtn.removeAttribute('disabled');
  startMonitorAllBtn.classList.remove('disabled');

  monitorStatusText.textContent = 'No extensions are being monitored';
  monitorStatusText.classList.add('red');
  monitorStatusText.classList.remove('green');
}

async function renderPopup() {
  const status = await areExtsBeingMonitored();
  status ? renderMonitorStartedUI() : renderMonitorStoppedUI();
}

async function init() {
  startMonitorAllBtn = document.getElementById('startMonitorBtn');
  stopMonitorAllBtn = document.getElementById('stopMonitorBtn');
  viewActivityLogBtn = document.getElementById('actLogPage');
  monitorStatusText = document.getElementById('monitorStatus');
  errorMsgText = document.getElementById('errorText');

  renderPopup();

  startMonitorAllBtn.addEventListener('click', async () => {
    initMonitorAll()
      .then((monitorMsg) => {
        if (monitorMsg === 'ext-monitor-started') {
          renderPopup();
        }
      })
      .catch((error) => {
        renderErrorMsg(error?.message);
      });
  });

  stopMonitorAllBtn.addEventListener('click', async () => {
    stopMonitorAll()
      .then((monitorMsg) => {
        if (monitorMsg === 'ext-monitor-stopped') {
          renderPopup();
        }
      })
      .catch((error) => {
        renderErrorMsg(error?.message);
      });
  });

  viewActivityLogBtn.addEventListener('click', () => {
    viewActivityLogs();
    window.close();
  });
}

window.addEventListener('DOMContentLoaded', init);
