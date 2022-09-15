import { MONITOR_DISABLED_MSG, MONITOR_ENABLED_MSG } from './constant.js';
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
    this.openActivityLogBtn = document.getElementById('actLogPage');
    this.monitorStatusText = document.getElementById('monitorStatus');
    this.errorMsgText = document.getElementById('errorText');
  }

  renderErrorMsg(message) {
    this.errorMsgText.textContent = message;
    this.errorMsgText.style.display = 'block';
  }

  renderMonitorStartedUI() {
    this.startMonitorAllBtn.setAttribute('disabled', true);
    this.stopMonitorAllBtn.removeAttribute('disabled');

    this.monitorStatusText.textContent = MONITOR_ENABLED_MSG;
    this.monitorStatusText.classList.add('success');
    this.monitorStatusText.classList.remove('failure');
  }

  renderMonitorStoppedUI() {
    this.startMonitorAllBtn.removeAttribute('disabled');
    this.stopMonitorAllBtn.setAttribute('disabled', true);

    this.monitorStatusText.textContent = MONITOR_DISABLED_MSG;
    this.monitorStatusText.classList.add('failure');
    this.monitorStatusText.classList.remove('success');
  }

  async render() {
    const isMonitorStarted = await getMonitorStatus();
    isMonitorStarted
      ? this.renderMonitorStartedUI()
      : this.renderMonitorStoppedUI();
  }

  async handleViewActivityLog() {
    await openActivityLogPage();
    window.close();
  }

  async handleEvent(event) {
    try {
      switch (event.target) {
        case this.startMonitorAllBtn:
          await this.handleMonitor(startMonitor);
          break;
        case this.stopMonitorAllBtn:
          await this.handleMonitor(stopMonitor);
          break;
        case this.openActivityLogBtn:
          await this.handleViewActivityLog();
          break;
        default:
          break;
      }
    } catch (error) {
      this.renderErrorMsg(error.message);
    }
  }

  async handleMonitor(monitorFunc) {
    await monitorFunc();
    this.render();
  }

  async init() {
    await this.render();
    this.startMonitorAllBtn.addEventListener('click', this);
    this.stopMonitorAllBtn.addEventListener('click', this);
    this.openActivityLogBtn.addEventListener('click', this);
  }
}
