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

  addNewLog(log) {
    this.logs.push(log);
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
}

class View {
  constructor() {
    this.logView = document.querySelector('log-view');
    this.saveLogBtn = document.querySelector('#saveLogBtn');
    this.notice = document.querySelector('.notice');

    this.extFilter = document.querySelector(
      'filter-container[filter-key="id"]'
    );
    this.viewTypeFilter = document.querySelector(
      'filter-container[filter-key="viewType"]'
    );
    this.apiTypeFilter = document.querySelector(
      'filter-container[filter-key="type"]'
    );

    this.saveLogBtn.addEventListener('click', this);
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

  handleNewLog(object) {
    this.logView.addNewRow(object);
    this.updateFilterOptions(object.log);
  }

  updateFilterOptions(log) {
    this.extFilter.updateFilterCheckboxes(log);
    this.viewTypeFilter.updateFilterCheckboxes(log);
    this.apiTypeFilter.updateFilterCheckboxes(log);
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
    this.view.extFilter.addEventListener('filter', this);
    this.view.viewTypeFilter.addEventListener('filter', this);
    this.view.apiTypeFilter.addEventListener('filter', this);

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

  handleNewLogs(logs) {
    for (const log of logs) {
      this.model.addNewLog(log);
      this.isFilterMatched(this.model.filter, log)
        ? this.view.handleNewLog({ log, isHidden: true })
        : this.view.handleNewLog({ log, isHidden: false });
    }
  }

  isFilterMatched(filter, log) {
    for (const key of Object.keys(filter)) {
      if (Object.keys(log).includes(key)) {
        if (filter[key].includes(log[key])) {
          return true;
        }
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

  handleEvent(event) {
    if (event.type === 'savelog') {
      this.saveLogs();
    } else if (event.type === 'filter') {
      this.filter(event.detail);
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

  filter(filterObject) {
    const { filterDetail, isFilterRemoved } = filterObject;

    this.model[isFilterRemoved ? 'removeFilter' : 'addFilter'](filterDetail);
    this.view.logView.filterLogViewItems({
      isFilterRemoved,
      existingFilters: this.model.filter,
      isFilterMatchedFn: this.isFilterMatched,
    });
  }
}

export default class ActivityLog {
  constructor() {
    new Controller(new Model(), new View());
  }
}
