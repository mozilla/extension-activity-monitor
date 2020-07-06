import { save } from '../lib/save-load.js';

export default class ActivityLog {
  constructor() {
    this.logs = [];

    this.saveLogBtn = document.getElementById('saveLogBtn');
    this.showLogDetailWrapper = document.querySelector(
      '.show-log-detail-wrapper'
    );
    this.showLogDetails = document.getElementById('showLogDetails');
    this.logTableWrapper = document.querySelector('.log-table');
    this.tableBody = document.querySelector('table tbody');
    this.notice = document.querySelector('.notice');
    this.closeBtn = document.querySelector('.close');
  }

  async init() {
    const existingLogs = await this.getExistingLogs();

    if (existingLogs.length) {
      this.addNewLogs(existingLogs);
    }

    this.saveLogBtn.addEventListener('click', this);
    this.closeBtn.addEventListener('click', this);
    this.tableBody.addEventListener('click', this);

    browser.runtime.onMessage.addListener((message) => {
      const { requestTo, requestType } = message;

      if (requestTo !== 'activity-log') {
        return;
      }

      if (requestType === 'appendLogs') {
        this.addNewLogs([message.log]);
      } else {
        throw new Error(`wrong request type found ${requestType}`);
      }
    });
  }

  async getExistingLogs() {
    const { existingLogs } = await browser.runtime.sendMessage({
      requestType: 'sendAllLogs',
      requestTo: 'ext-monitor',
    });
    return existingLogs;
  }

  addNewLogs(logs) {
    for (const log of logs) {
      const newRow = this.tableBody.insertRow(-1);
      newRow.insertCell(0).textContent = log.id;
      newRow.insertCell(1).textContent = log.timeStamp;
      newRow.insertCell(2).textContent = log.type;
      newRow.insertCell(3).textContent = log.name;
      newRow.insertCell(4).textContent = log.viewType || 'undefined';
      newRow._log = log;

      this.logs.push(log);
    }
  }

  setError(errorMessage) {
    if (errorMessage) {
      this.notice.textContent = errorMessage;
      this.notice.classList.add('failure');
    } else {
      this.notice.textContent = '';
      this.notice.classList.remove('failure');
    }
  }

  handleEvent(event) {
    if (event.type === 'click') {
      const logDetails = event.target.closest('tr')?._log;

      if (logDetails) {
        this.openDetailSidebar(logDetails);
        return;
      }

      switch (event.target) {
        case this.saveLogBtn:
          this.saveLogs();
          break;
        case this.closeBtn:
          this.closeDetailSidebar();
          break;
        default:
          throw new Error(`unexpected click event on ${event.target.tagName}`);
      }
    } else {
      throw new Error(`wrong event type found ${event.type}`);
    }
  }

  openDetailSidebar(logDetails) {
    const logString = JSON.stringify(logDetails);
    this.showLogDetails.textContent = logString;
    this.showLogDetailWrapper.removeAttribute('hidden');
    this.logTableWrapper.classList.add('width-60');
  }

  closeDetailSidebar() {
    this.showLogDetailWrapper.setAttribute('hidden', true);
    this.logTableWrapper.classList.remove('width-60');
  }

  async saveLogs() {
    try {
      await save.saveAsJSON(this.logs);
      this.setError(null);
    } catch (error) {
      this.setError(error.message);
    }
  }
}
