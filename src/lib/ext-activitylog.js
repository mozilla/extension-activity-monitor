import { save } from './save-load.js';

class Model {
  constructor() {
    this.logs = [];
    this.filter = {
      id: [],
      viewType: [],
      type: [],
    };
  }

  addNewLogs(logs) {
    this.logs.push(...logs);
  }

  addFilter({ logKey, valueEquals }) {
    this.filter[logKey].push(valueEquals);
  }

  removeFilter({ logKey, valueEquals }) {
    const logKeyIndex = this.filter[logKey].indexOf(valueEquals);
    if (logKeyIndex > -1) {
      this.filter[logKey].splice(logKeyIndex, 1);
    }
  }

  clearLogs() {
    this.logs = [];
  }
}

class View {
  constructor() {
    this.logView = document.querySelector('log-view');
    this.clearLogBtn = document.querySelector('#clearLogBtn');
    this.saveLogBtn = document.querySelector('#saveLogBtn');
    this.notice = document.querySelector('.notice');

    this.extFilter = document.querySelector('filter-option[filter-key="id"]');
    this.viewTypeFilter = document.querySelector(
      'filter-option[filter-key="viewType"]'
    );
    this.apiTypeFilter = document.querySelector(
      'filter-option[filter-key="type"]'
    );

    this.clearLogBtn.addEventListener('click', this);
    this.saveLogBtn.addEventListener('click', this);
  }

  setLogFilter(filterFunc) {
    this.logView.setLogFilter(filterFunc);
  }

  handleEvent(event) {
    if (event.type === 'click') {
      switch (event.target) {
        case this.saveLogBtn:
          this.saveLogBtn.dispatchEvent(new CustomEvent('savelog'));
          break;
        case this.clearLogBtn:
          this.clearLogBtn.dispatchEvent(new CustomEvent('clearlog'));
          break;
        default:
          throw new Error(`wrong event target - ${event.target.tagName}`);
      }
    } else {
      throw new Error(`wrong event type - ${event.type}`);
    }
  }

  addTableRows(logs) {
    this.logView.addNewRows(logs);
    this.updateFilterOptions(logs);
  }

  updateFilterOptions(logs) {
    this.extFilter.updateFilterCheckboxes(logs);
    this.viewTypeFilter.updateFilterCheckboxes(logs);
    this.apiTypeFilter.updateFilterCheckboxes(logs);
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

  clearTable() {
    this.logView.clearTable();
  }
}

class Controller {
  constructor(model, view) {
    this.model = model;
    this.view = view;

    this.init();
  }

  async init() {
    this.view.clearLogBtn.addEventListener('clearlog', this);
    this.view.saveLogBtn.addEventListener('savelog', this);
    this.view.extFilter.addEventListener('filterchange', this);
    this.view.viewTypeFilter.addEventListener('filterchange', this);
    this.view.apiTypeFilter.addEventListener('filterchange', this);

    browser.runtime.onMessage.addListener((message) => {
      const { requestTo, requestType } = message;

      if (requestTo !== 'activity-log') {
        return;
      }

      if (requestType === 'appendLogs') {
        this.handleNewLogs([message.log]);
      } else {
        throw new Error(`wrong request type found - ${requestType}`);
      }
    });

    const existingLogs = await this.getExistingLogs();

    if (existingLogs.length) {
      this.handleNewLogs(existingLogs);
    }
  }

  isFilterMatched(log) {
    for (const key of Object.keys(this.model.filter)) {
      if (this.model.filter[key].includes(log[key])) {
        return true;
      }
    }
    return false;
  }

  async getExistingLogs() {
    const { existingLogs } = await browser.runtime.sendMessage({
      requestType: 'sendAllLogs',
      requestTo: 'ext-monitor',
    });
    return existingLogs;
  }

  handleNewLogs(logs) {
    this.model.addNewLogs(logs);
    this.view.addTableRows(logs);
  }

  handleEvent(event) {
    if (event.type === 'savelog') {
      this.saveLogs();
    } else if (event.type === 'filterchange') {
      this.onFilterChange(event.detail);
    } else if (event.type === 'clearlog') {
      this.handleClearLogs();
    } else {
      throw new Error(`wrong event type found - ${event.type}`);
    }
  }

  async saveLogs() {
    try {
      await save.saveAsJSON(this.model.logs);
      this.view.setError(null);
    } catch (error) {
      this.view.setError(error.message);
    }
  }

  onFilterChange(filterObject) {
    const { filterDetail, isFilterRemoved } = filterObject;

    this.model[isFilterRemoved ? 'removeFilter' : 'addFilter'](filterDetail);
    this.view.setLogFilter((log) => this.isFilterMatched(log));
  }

  handleClearLogs() {
    this.clearBackgroundLogs();
    this.model.clearLogs();
    this.view.clearTable();
  }

  async clearBackgroundLogs() {
    await browser.runtime.sendMessage({
      requestType: 'clearLogs',
      requestTo: 'ext-monitor',
    });
  }
}

export default class ActivityLog {
  constructor() {
    new Controller(new Model(), new View());
  }
}
