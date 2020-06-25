import {
  getMonitorStatus,
  startMonitor,
  stopMonitor,
  openActivityLogPage,
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
    this.stopMonitorAllBtn.removeAttribute('disabled');

    this.monitorStatusText.textContent = 'Extensions are being monitored';
    this.monitorStatusText.classList.add('success');
    this.monitorStatusText.classList.remove('failure');
  }

  renderMonitorStoppedUI() {
    this.stopMonitorAllBtn.setAttribute('disabled', 'disabled');
    this.startMonitorAllBtn.removeAttribute('disabled');

    this.monitorStatusText.textContent = 'No extensions are being monitored';
    this.monitorStatusText.classList.add('failure');
    this.monitorStatusText.classList.remove('success');
  }

  async render() {
    const isMonitorStarted = await getMonitorStatus();
    if (isMonitorStarted) {
      this.renderMonitorStartedUI();
    } else {
      this.renderMonitorStoppedUI();
    }
  }

  viewExtPagePopup() {
    openActivityLogPage();
    window.close();
  }

  async handleEvent(event) {
    if (event.type === 'click') {
      switch (event.target) {
        case this.startMonitorAllBtn:
          this.startMonitor();
          break;
        case this.stopMonitorAllBtn:
          await this.stopMonitor();
          break;
        case this.viewActivityLogBtn:
          this.viewExtPagePopup();
          break;
        default:
          throw new Error('wrong event target found ' + event.target);
      }
    } else {
      throw new Error('wrong event type found ' + event.type);
    }
  }

  async startMonitor() {
    try {
      const monitorMsg = await startMonitor();
      if (monitorMsg) {
        this.render();
      } else {
        throw new Error("Monitoring couldn't be started");
      }
    } catch (error) {
      this.renderErrorMsg(error.message);
    }
  }

  async stopMonitor() {
    try {
      const monitorMsg = await stopMonitor();
      if (monitorMsg) {
        this.render();
      } else {
        throw new Error("Monitoring couldn't be stopped");
      }
    } catch (error) {
      this.renderErrorMsg(error.message);
    }
  }

  async init() {
    await this.render();

    this.startMonitorAllBtn.addEventListener('click', this);
    this.stopMonitorAllBtn.addEventListener('click', this);
    this.viewActivityLogBtn.addEventListener('click', this);
  }
}
