import { getActivityLogPageURL } from './ext-listen.js';
import { load, save } from './save-load.js';

class Model {
  constructor() {
    this.logs = [];
    this.filter = {
      id: new Set(),
      viewType: new Set(),
      type: new Set(),
      keyword: '',
    };
  }

  addNewLogs(logs) {
    this.logs.push(...logs);
  }

  /**
   * @param {object} updateFilter - It contains key and value to replace
   * the filter
   * @param {Set<string>} [updateFilter.id] - It contains the extension ids.
   * @param {Set<string|undefined>} [updateFilter.viewType] - It contains view
   * types that includes background, popup, sidebar, tab, devtools_page,
   * devtools_panel. It is undefined when [updateFilter.type] is content_script.
   * @param {Set<string>} [updateFilter.type] - It contains api types that
   * includes api_call, api_event, content_script, user_script.
   * @param {string} [updateFilter.keyword]
   */
  setFilter(updateFilter) {
    Object.assign(this.filter, updateFilter);
  }

  matchLogWithFilterObj(log) {
    return (
      this.matchFilterId(log.id) &&
      this.matchFilterViewType(log.viewType) &&
      this.matchFilterType(log.type) &&
      this.matchFilterKeyword(log.data)
    );
  }

  matchFilterId(logId) {
    return this.filter.id.has(logId);
  }

  matchFilterViewType(logViewType) {
    return this.filter.viewType.has(logViewType);
  }

  matchFilterType(logType) {
    return this.filter.type.has(logType);
  }

  matchFilterKeyword(logData) {
    const logDataStr = JSON.stringify(logData);
    return logDataStr.includes(this.filter.keyword);
  }

  clearLogs() {
    this.logs = [];
  }
}

class View {
  constructor() {
    this.logView = document.querySelector('log-view');
    this.menuContainer = document.querySelector('.menu-container');
    this.clearLogBtn = document.querySelector('#clearLogBtn');
    this.saveLogBtn = document.querySelector('#saveLogBtn');
    this.loadLogFile = document.querySelector('input[name="loadLogFile"]');
    this.clearLoadedLogBtn = document.querySelector('#clearLoadedLogs');
    this.notice = document.querySelector('.notice');

    this.extFilter = document.querySelector('filter-option[filter-key="id"]');
    this.viewTypeFilter = document.querySelector(
      'filter-option[filter-key="viewType"]'
    );
    this.apiTypeFilter = document.querySelector(
      'filter-option[filter-key="type"]'
    );
    this.keywordFilter = document.querySelector('filter-keyword');

    this.clearLogBtn.addEventListener('click', this);
    this.saveLogBtn.addEventListener('click', this);
    this.loadLogFile.addEventListener('change', this);
    this.clearLoadedLogBtn.addEventListener('click', this);
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
        case this.clearLoadedLogBtn:
          this.clearLoadedLogBtn.dispatchEvent(
            new CustomEvent('clearloadedlog')
          );
          break;
        default:
          throw new Error(`wrong event target - ${event.target.tagName}`);
      }
    } else if (event.type === 'change' && event.target === this.loadLogFile) {
      const logFile = event.target.files[0];
      this.loadLogFile.value = '';
      this.loadLogFile.dispatchEvent(
        new CustomEvent('loadlog', { detail: logFile })
      );
    } else {
      throw new Error(`wrong event type - ${event.type}`);
    }
  }

  addTableRows(logs) {
    this.updateFilterOptions(logs);
    this.logView.addNewRows(logs);
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
    this.view.keywordFilter.addEventListener('filterchange', this);
    this.view.extFilter.addEventListener('filterchange', this);
    this.view.viewTypeFilter.addEventListener('filterchange', this);
    this.view.apiTypeFilter.addEventListener('filterchange', this);
    const searchParams = window.location.search;

    if (searchParams.includes('page=loadLog&file=')) {
      this.view.menuContainer.hidden = true;

      const fileName = searchParams.substring(
        searchParams.indexOf('file=') + 5
      );
      if (!fileName) {
        return;
      }

      document.title = `Loaded Logs - ${fileName}`;

      const logs = await browser.runtime.sendMessage({
        requestType: 'getLoadedLogs',
        requestTo: 'ext-monitor',
        detail: { fileName },
      });

      if (logs.length) {
        this.handleNewLogs(logs);
      }
    } else {
      this.view.loadLogFile.addEventListener('loadlog', this);
      this.view.clearLogBtn.addEventListener('clearlog', this);
      this.view.saveLogBtn.addEventListener('savelog', this);
      this.view.clearLoadedLogBtn.addEventListener('clearloadedlog', this);

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
      case 'loadlog':
        this.loadLogs(event.detail);
        break;
      case 'savelog':
        this.saveLogs();
        break;
      case 'filterchange':
        this.onFilterChange(event.detail);
        break;
      case 'clearlog':
        this.handleClearLogs();
        break;
      case 'clearloadedlog':
        this.onClearLoadedLogs();
        break;
      default:
        throw new Error(`wrong event type found - ${event.type}`);
    }
  }

  async loadLogs(file) {
    try {
      const logStr = await load.loadLogAsText(file);
      const logs = JSON.parse(logStr);

      const storedFileName = await browser.runtime.sendMessage({
        requestTo: 'ext-monitor',
        requestType: 'loadLogs',
        detail: { logs, fileName: file.name },
      });
      const searchParams = `page=loadLog&file=${storedFileName}`;

      this.view.setError(null);

      browser.tabs.create({
        url: getActivityLogPageURL(searchParams),
      });
    } catch (error) {
      this.view.setError(error.message);
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

  onFilterChange(filterDetail) {
    const { updateFilter, isNewFilterAdded } = filterDetail;

    this.model.setFilter(updateFilter);
    // When new filter checkbox is added, it is in checked condition by default
    // No need to re-render the rows then.
    if (!isNewFilterAdded) {
      this.view.setLogFilter((log) => this.isFilterMatched(log));
    }
  }

  isFilterMatched(log) {
    return this.model.matchLogWithFilterObj(log);
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

  async onClearLoadedLogs() {
    await browser.runtime.sendMessage({
      requestType: 'clearLoadedLogs',
      requestTo: 'ext-monitor',
    });
  }
}

export default class ActivityLog {
  constructor() {
    this.activityLog = new Controller(new Model(), new View());
  }
}
