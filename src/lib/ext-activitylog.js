import { save } from './save-load.js';

class Model {
  constructor() {
    this.logs = [];
    this.filter = {
      id: new Set(),
      viewType: new Set(),
      type: new Set(),
      name: new Set(),
      tabId: null,
      keyword: '',
      timeStamp: null,
    };
  }

  addNewLogs(logs) {
    this.logs.push(...logs);
  }

  /**
   * @param {object} updateFilter - It contains key and value to replace
   * the filter.
   * @param {Set<string>} [updateFilter.id] - It contains the extension ids.
   * @param {Set<string|undefined>} [updateFilter.viewType] - It contains view
   * types that include background, popup, sidebar, tab, devtools_page,
   * devtools_panel. It is undefined when [updateFilter.type] is content_script.
   * @param {Set<string>} [updateFilter.type] - It contains api types that
   * includes api_call, api_event, content_script, user_script.
   * @param {Set<string>} [updateFilter.name] - It contains API names only.
   * @param {string} [updateFilter.keyword]
   * @param {null|object} [updateFilter.timeStamp] - It is null when timestamp
   * filter is not applied.
   * @param {number} [updateFilter.timeStamp.start]
   * @param {number} [updateFilter.timeStamp.stop]
   * @param {null|number} [updateFilter.tabId] - It's null when search paramter
   * `filterTabId` is not used.
   */
  setFilter(updateFilter) {
    Object.assign(this.filter, updateFilter);
  }

  matchLogWithFilterObj(log) {
    return (
      this.matchFilterId(log.id) &&
      this.matchFilterViewType(log) &&
      this.matchFilterType(log.type) &&
      this.matchFilterApiName(log) &&
      this.matchFilterKeyword(log.data) &&
      this.matchFilterTimestamp(log.timeStamp) &&
      this.matchFilterTabId(log.data)
    );
  }

  matchFilterId(id) {
    return this.filter.id.has(id);
  }

  matchFilterViewType({ type, viewType }) {
    if (type === 'content_script') {
      // viewtype is undefined when log.type = content_script. We don't store
      // undefined in viewType Set. Hence, we don't filter here.
      return true;
    }
    return this.filter.viewType.has(viewType);
  }

  matchFilterType(type) {
    return this.filter.type.has(type);
  }

  matchFilterApiName({ name, type }) {
    if (type === 'content_script') {
      // name is a content script url when log.type = content_script. We don't
      // store content script urls in API name Set. Hence, we don't filter here.
      return true;
    }
    return this.filter.name.has(name);
  }

  matchFilterKeyword(data) {
    const logDataStr = JSON.stringify(data);
    return logDataStr.includes(this.filter.keyword);
  }

  matchFilterTimestamp(logTimestamp) {
    if (!this.filter.timeStamp) {
      return true;
    }

    const startTime = this.filter.timeStamp?.start;
    const stopTime = this.filter.timeStamp?.stop;
    const logTime = Date.parse(logTimestamp);

    if (logTime < startTime || logTime > stopTime) {
      return false;
    }

    return true;
  }

  matchFilterTabId({ tabId }) {
    if (this.filter.tabId === null) {
      return true;
    }

    return this.filter.tabId === tabId;
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
    this.notice = document.querySelector('.notice');
    this.logHeading = document.querySelector('.log-heading');

    this.extFilter = document.querySelector('filter-option[filter-key="id"]');
    this.viewTypeFilter = document.querySelector(
      'filter-option[filter-key="viewType"]'
    );
    this.apiTypeFilter = document.querySelector(
      'filter-option[filter-key="type"]'
    );
    this.apiNameFilter = document.querySelector(
      'filter-option[filter-key="name"]'
    );
    this.keywordFilter = document.querySelector('filter-keyword');
    this.timestampFilter = document.querySelector('filter-timestamp');

    this.clearLogBtn.addEventListener('click', this);
    this.saveLogBtn.addEventListener('click', this);
    this.loadLogFile.addEventListener('change', this);
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

  handleNewLogs(logs) {
    this.updateFilterOptions(logs);
    this.logView.addNewRows(logs);
  }

  updateFilterOptions(logs) {
    // log.name contains a script URL instead of API name and log.viewtype is
    // undefined when log.type = content_script. Excluding them from being
    // rendered as filter option in api names and viewtypes.
    const filteredLogs = logs.filter((log) => log.type !== 'content_script');

    this.extFilter.updateFilterCheckboxes(logs);
    this.viewTypeFilter.updateFilterCheckboxes(filteredLogs);
    this.apiTypeFilter.updateFilterCheckboxes(logs);
    this.apiNameFilter.updateFilterCheckboxes(filteredLogs);
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
    this.view.apiNameFilter.addEventListener('filterchange', this);
    this.view.timestampFilter.addEventListener('filterchange', this);

    const searchParams = new URLSearchParams(
      document.location.search.substring(1)
    );
    const fileName = searchParams.get('file');
    const filterTabId = parseInt(searchParams.get('filterTabId'), 10);

    if (fileName) {
      this.view.menuContainer.hidden = true;
      document.title = `Loaded Logs - ${fileName}`;

      const currentTab = await browser.tabs.getCurrent();
      let logs;

      try {
        logs = await browser.runtime.sendMessage({
          requestType: 'getLoadedLogs',
          requestTo: 'ext-monitor',
          requestParams: { tabId: currentTab.id },
        });
      } catch (error) {
        this.view.setError(error.message);
      }

      if (logs?.length) {
        this.handleNewLogs(logs);
      }
    } else {
      this.view.loadLogFile.addEventListener('loadlog', this);
      this.view.clearLogBtn.addEventListener('clearlog', this);
      this.view.saveLogBtn.addEventListener('savelog', this);

      browser.runtime.connect({ name: 'monitor-realtime-logs' });
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

      if (filterTabId) {
        this.view.logHeading.textContent = `${this.view.logHeading.textContent} Filtered By Tab Id: ${filterTabId}`;

        const filterDetail = {
          updateFilter: { tabId: filterTabId },
        };

        this.onFilterChange(filterDetail);
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
    this.view.handleNewLogs(logs);
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
      default:
        throw new Error(`wrong event type found - ${event.type}`);
    }
  }

  async loadLogs(file) {
    try {
      await browser.runtime.sendMessage({
        requestTo: 'ext-monitor',
        requestType: 'loadLogs',
        requestParams: { file },
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
}

export default class ActivityLog {
  constructor() {
    this.activityLog = new Controller(new Model(), new View());
  }
}
