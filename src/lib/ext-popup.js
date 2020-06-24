import {
  areExtsBeingMonitored,
  startMonitorAll,
  stopMonitorAll,
  viewActivityLogs,
} from '../lib/ext-listen.js';

export default class Popup {
  constructor() {
    this.startMonitorAllBtn = document.getElementById('startMonitorBtn');
    this.stopMonitorAllBtn = document.getElementById('stopMonitorBtn');
    this.viewActivityLogBtn = document.getElementById('actLogPage');
    this.monitorStatusText = document.getElementById('monitorStatus');
    this.errorMsgText = document.getElementById('errorText');
  }

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

  async render() {
    const isMonitorStarted = await areExtsBeingMonitored();
    isMonitorStarted
      ? this.renderMonitorStartedUI()
      : this.renderMonitorStoppedUI();
  }

  viewExtPage() {
    viewActivityLogs();
    window.close();
  }

  async handleEvent(event) {
    if (event.type === 'click') {
      switch (event.target.id) {
        case 'startMonitorBtn':
          await this.startMonitor();
          break;
        case 'stopMonitorBtn':
          await this.stopMonitor();
          break;
        case 'actLogPage':
          this.viewExtPage();
          break;
        default:
          break;
      }
    }
  }

  async startMonitor() {
    try {
      const monitorMsg = await startMonitorAll();
      if (monitorMsg === 'ext-monitor-started') {
        this.render();
      }
    } catch (error) {
      this.renderErrorMsg(error?.message);
    }
  }

  async stopMonitor() {
    try {
      const monitorMsg = await stopMonitorAll();
      if (monitorMsg === 'ext-monitor-stopped') {
        this.render();
      }
    } catch (error) {
      this.renderErrorMsg(error?.message);
    }
  }

  async init() {
    await this.render();

    this.startMonitorAllBtn.addEventListener('click', this);
    this.stopMonitorAllBtn.addEventListener('click', this);
    this.viewActivityLogBtn.addEventListener('click', this);
  }
}
