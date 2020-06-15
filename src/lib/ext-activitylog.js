import { save, load } from '../lib/save-load.js';

export default class ActivityLog {
  constructor() {
    this.logs = [];
    this.loadedLogs = [];
    this.rowIndex = 0;

    this.loadLogBtn = document.getElementById('loadLogBtn');
    this.logInputFile = document.getElementById('logInputFile');
    this.saveLogBtn = document.getElementById('saveLogBtn');
    this.showLogDetailWrapper = document.querySelector(
      '.show-log-detail-wrapper'
    );
    this.showLogDetails = document.getElementById('showLogDetails');
    this.showLoadedLog = document.getElementById('showLoadedLog');
    this.logTableWrapper = document.querySelector('.log-table');
    this.table = document.querySelector('table');
    this.notice = document.querySelector('.notice');
    this.closeBtn = document.querySelector('.close');
  }

  async getExistingLogs() {
    const { existingLogs } = await browser.runtime.sendMessage({
      requestType: 'sendAllLogs',
      requestTo: 'ext-monitor',
    });
    return existingLogs;
  }

  async loadFile(file) {
    try {
      const loadedLogsAsText = await load.loadLogAsText(file);
      const loadedJSONLogs = JSON.parse(loadedLogsAsText);
      this.loadedLogs.push(...loadedJSONLogs);
      // TODO: Display loaded logs in table view

      if (this.notice.textContent.trim().length) {
        this.notice.textContent = '';
        this.notice.classList.remove('failure');
      }
    } catch (error) {
      this.notice.textContent = error.message;
      this.notice.classList.add('failure');
    }
  }

  async saveLogs(logs) {
    try {
      await save.saveAsJSON(logs);

      if (this.notice.textContent.trim().length) {
        this.notice.textContent = '';
        this.notice.classList.remove('failure');
      }
    } catch (error) {
      this.notice.textContent = error.message;
      this.notice.classList.add('failure');
    }
  }

  renderSideBar(logIndex) {
    const logStringfy = JSON.stringify(this.logs[logIndex]);
    this.showLogDetails.textContent = logStringfy;
    this.showLogDetailWrapper.style.display = 'block';
    this.logTableWrapper.classList.add('width-60');
  }

  handleEvent(event) {
    if (event.type === 'click') {
      const selectedRowIndex = event.target.closest('tr').attributes['index']
        .value;

      if (selectedRowIndex == null) {
        return;
      }

      this.renderSideBar(selectedRowIndex);
    } else {
      throw new Error('wrong event type found ' + event.type);
    }
  }

  renderNewRow(logs) {
    for (const log of logs) {
      const newRow = this.table.insertRow(1);
      newRow.insertCell(0).textContent = log.id;
      newRow.insertCell(1).textContent = log.timeStamp;
      newRow.insertCell(2).textContent = log.type;
      newRow.insertCell(3).textContent = log.name;
      newRow.insertCell(4).textContent = log.viewType || 'undefined';
      newRow.setAttribute('index', this.rowIndex++);

      newRow.addEventListener('click', this);
      this.logs.push(log);
    }
  }

  async init() {
    const existingLogs = await this.getExistingLogs();

    if (existingLogs.length) {
      this.renderNewRow(existingLogs);
    }

    this.saveLogBtn.addEventListener('click', () => {
      this.saveLogs(this.logs);
    });

    this.logInputFile.addEventListener('change', () => {
      this.loadLogBtn.removeAttribute('disabled');
    });

    this.loadLogBtn.addEventListener('click', () => {
      if (this.logInputFile.files.length > 0) {
        this.loadFile(this.logInputFile.files[0]);
        this.logInputFile.value = '';
        this.loadLogBtn.setAttribute('disabled', true);
      }
    });

    this.closeBtn.addEventListener('click', () => {
      if (this.showLogDetailWrapper.style.display === 'block') {
        this.showLogDetailWrapper.style.display = 'none';
        this.logTableWrapper.classList.remove('width-60');
      }
    });

    browser.runtime.onMessage.addListener((message) => {
      const { requestTo, requestType } = message;

      if (requestTo !== 'activity-log') {
        return;
      }

      if (requestType === 'appendLogs') {
        this.renderNewRow([message.log]);
      } else {
        throw new Error('wrong request type found ' + requestType);
      }
    });
  }
}
