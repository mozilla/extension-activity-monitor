import {
  areExtsBeingMonitored,
  initMonitorAll,
  stopMonitorAll,
  viewActivityLogs,
} from '../lib/ext-listen.js';

export default class Popup {
  renderErrorMsg(message) {
    this.errorMsgText.textContent = message;
    this.errorMsgText.style.display = 'block';
  }

  renderMonitorStartedUI() {
    this.startMonitorAllBtn.setAttribute('disabled', 'disabled');
    this.startMonitorAllBtn.classList.add('disabled');
    this.stopMonitorAllBtn.removeAttribute('disabled');
    this.stopMonitorAllBtn.classList.remove('disabled');

    this.monitorStatusText.textContent = 'Extensions are being monitored';
    this.monitorStatusText.classList.add('green');
    this.monitorStatusText.classList.remove('red');
  }

  renderMonitorStoppedUI() {
    this.stopMonitorAllBtn.setAttribute('disabled', 'disabled');
    this.stopMonitorAllBtn.classList.add('disabled');
    this.startMonitorAllBtn.removeAttribute('disabled');
    this.startMonitorAllBtn.classList.remove('disabled');

    this.monitorStatusText.textContent = 'No extensions are being monitored';
    this.monitorStatusText.classList.add('red');
    this.monitorStatusText.classList.remove('green');
  }

  async renderPopup() {
    const isMonitorStarted = await areExtsBeingMonitored();
    isMonitorStarted
      ? this.renderMonitorStartedUI()
      : this.renderMonitorStoppedUI();
  }

  addListenerPopup(element, event, listener) {
    element.addEventListener(event, listener);
  }

  initializeMonitoring = async () => {
    initMonitorAll()
      .then((monitorMsg) => {
        if (monitorMsg === 'ext-monitor-started') {
          this.renderPopup();
        }
      })
      .catch((error) => {
        this.renderErrorMsg(error?.message);
      });
  };

  viewExtPage() {
    viewActivityLogs();
    window.close();
  }

  stopMonitoring = async () => {
    stopMonitorAll()
      .then((monitorMsg) => {
        if (monitorMsg === 'ext-monitor-stopped') {
          this.renderPopup();
        }
      })
      .catch((error) => {
        this.renderErrorMsg(error?.message);
      });
  };

  async init() {
    this.startMonitorAllBtn = document.getElementById('startMonitorBtn');
    this.stopMonitorAllBtn = document.getElementById('stopMonitorBtn');
    this.viewActivityLogBtn = document.getElementById('actLogPage');
    this.monitorStatusText = document.getElementById('monitorStatus');
    this.errorMsgText = document.getElementById('errorText');

    await this.renderPopup();

    this.addListenerPopup(
      this.startMonitorAllBtn,
      'click',
      this.initializeMonitoring
    );
    this.addListenerPopup(this.stopMonitorAllBtn, 'click', this.stopMonitoring);
    this.addListenerPopup(this.viewActivityLogBtn, 'click', this.viewExtPage);
  }
}
