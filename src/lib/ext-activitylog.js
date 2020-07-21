import { save } from './save-load.js';

class Model {
  constructor() {
    this.logs = [];
    this.filter = {
      id: [],
      viewType: [],
      type: [],
      keyword: '',
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

  setFilterKeyword(keyword) {
    this.filter.keyword = keyword;
  }
}

class View {
  constructor() {
    this.logView = document.querySelector('log-view');
    this.saveLogBtn = document.querySelector('#saveLogBtn');
    this.notice = document.querySelector('.notice');

    this.extFilter = document.querySelector('filter-option[filter-key="id"]');
    this.viewTypeFilter = document.querySelector(
      'filter-option[filter-key="viewType"]'
    );
    this.apiTypeFilter = document.querySelector(
      'filter-option[filter-key="type"]'
    );
    this.keywordFilter = document.querySelector('filter-keyword');

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
}

class Controller {
  constructor(model, view) {
    this.model = model;
    this.view = view;

    this.init();
  }

  async init() {
    this.view.saveLogBtn.addEventListener('savelog', this);
    this.view.extFilter.addEventListener('filterchange', this);
    this.view.viewTypeFilter.addEventListener('filterchange', this);
    this.view.apiTypeFilter.addEventListener('filterchange', this);
    this.view.keywordFilter.addEventListener('keywordchange', this);

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
    switch (event.type) {
      case 'savelog':
        this.saveLogs();
        break;
      case 'filterchange':
        this.onFilterChange(event.detail);
        break;
      case 'keywordchange':
        this.onKeywordChange(event.detail);
        break;
      default:
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

  onKeywordChange(newKeyword) {
    this.model.setFilterKeyword(newKeyword);
    this.view.setLogFilter((log) => this.isFilterMatched(log));
  }

  isFilterMatched(log) {
    for (const key of Object.keys(this.model.filter)) {
      if (this.model.filter[key].includes(log[key])) {
        return true;
      } else if (key === 'keyword') {
        const dataStr = JSON.stringify(log.data);
        return !dataStr.includes(this.model.filter[key]);
      }
    }
    return false;
  }
}

export default class ActivityLog {
  constructor() {
    new Controller(new Model(), new View());
  }
}
