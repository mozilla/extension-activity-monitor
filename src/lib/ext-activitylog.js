import dropDownController from './DropDownController.js';
import { save } from './save-load.js';
import { serializeFilters, deSerializeFilters } from './formatters.js';

class Model {
  constructor() {
    this.logs = [];
    this.filter = {
      id: { exclude: new Set() },
      viewType: { exclude: new Set() },
      type: { exclude: new Set() },
      name: { exclude: new Set() },
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
   * `tabId` is not used.
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
    return !this.filter.id.exclude.has(id);
  }

  matchFilterViewType({ type, viewType }) {
    if (type === 'content_script') {
      // viewtype is undefined when log.type = content_script. We don't store
      // undefined in viewType Set. Hence, we don't filter here.
      return true;
    }
    return !this.filter.viewType.exclude.has(viewType);
  }

  matchFilterType(type) {
    return !this.filter.type.exclude.has(type);
  }

  matchFilterApiName({ name, type }) {
    if (type === 'content_script') {
      // name is a content script url when log.type = content_script. We don't
      // store content script urls in API name Set. Hence, we don't filter here.
      return true;
    }
    return !this.filter.name.exclude.has(name);
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

    if (logTimestamp < startTime || logTimestamp > stopTime) {
      return false;
    }

    return true;
  }

  matchFilterTabId({ tabId }) {
    if (this.filter.tabId == null) {
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
    this.contentWrapper = document.querySelector('.content-wrapper');
    this.logView = document.querySelector('log-view');
    this.optionsBtn = document.querySelector('.options-btn');
    this.clearLogBtn = document.querySelector('.clear-logs-btn');
    this.optionsDropdown = document.querySelector('.options-dropdown');
    this.saveLogBtn = document.querySelector('.save-log-btn');
    this.loadLogFile = document.querySelector('input[name="loadLogFile"]');
    this.notice = document.querySelector('.notice');
    this.filterIdTxt = document.querySelector('.filter-tabid');
    this.pageType = document.querySelector('.page-type');
    this.menuWrapper = document.querySelector('.menu-wrapper');

    const logCounter = document.querySelector('.logs-counter');
    this.visibleRows = logCounter.firstElementChild;
    this.totalLogs = logCounter.lastElementChild;

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

    this.optionsBtn.addEventListener('click', this);
    this.clearLogBtn.addEventListener('click', this);
    this.saveLogBtn.addEventListener('click', this);
    this.loadLogFile.addEventListener('change', this);
    this.logView.addEventListener('logcountchange', this);
  }

  setLogFilter(filterFunc) {
    this.logView.setLogFilter(filterFunc);
  }

  handleEvent(event) {
    try {
      if (event.type === 'click') {
        switch (event.target) {
          case this.clearLogBtn:
            this.clearLogBtn.dispatchEvent(new CustomEvent('clearlog'));
            break;
          case this.optionsBtn:
            dropDownController.toggleDropDown(this.optionsBtn);
            break;
          case this.saveLogBtn:
            this.saveLogBtn.dispatchEvent(new CustomEvent('savelog'));
            break;
        }
      } else if (event.type === 'change' && event.target === this.loadLogFile) {
        const logFile = event.target.files[0];
        this.loadLogFile.value = '';
        this.loadLogFile.dispatchEvent(
          new CustomEvent('loadlog', { detail: logFile })
        );
      } else if (event.type === 'logcountchange') {
        this.updateLogCounter(event.detail);
      } else {
        throw new Error(`wrong event type - ${event.type}`);
      }
    } catch (error) {
      this.setError(error.message);
    }
  }

  updateLogCounter({ visibleRows, totalLogs }) {
    this.visibleRows.textContent = visibleRows;
    this.totalLogs.textContent = totalLogs;
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

  setInitialFilters(updateFilter) {
    const {
      id,
      viewType,
      type,
      name,
      keyword,
      timeStamp,
      tabId,
    } = updateFilter;

    this.extFilter.setInitialFilter(id.exclude);
    this.viewTypeFilter.setInitialFilter(viewType.exclude);
    this.apiTypeFilter.setInitialFilter(type.exclude);
    this.apiNameFilter.setInitialFilter(name.exclude);
    this.keywordFilter.setInitialFilter(keyword);
    this.timestampFilter.setInitialFilter(timeStamp);

    if (tabId) {
      this.filterIdTxt.textContent = `Filtered By Tab Id: ${tabId}`;
      this.contentWrapper.classList.add('tabid');
      const filterDetail = { updateFilter: { tabId } };

      this.filterIdTxt.dispatchEvent(
        new CustomEvent('filterchange', { detail: filterDetail })
      );
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
    this.view.filterIdTxt.addEventListener('filterchange', this);
    this.view.loadLogFile.addEventListener('loadlog', this);

    const searchParams = new URLSearchParams(
      document.location.search.substring(1)
    );

    const loadedFileName = searchParams.get('file');

    if (loadedFileName) {
      const loadedLogsTxt = `Loaded Logs - ${loadedFileName}`;
      document.title = loadedLogsTxt;

      this.view.pageType.textContent = loadedLogsTxt;
      this.view.contentWrapper.classList.add('load-logs');

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
      this.view.clearLogBtn.addEventListener('clearlog', this);
      this.view.saveLogBtn.addEventListener('savelog', this);

      browser.runtime.connect({ name: 'monitor-realtime-logs' });
      browser.runtime.onMessage.addListener(this.onMessageListener);

      if (document.location.search) {
        const updateFilter = deSerializeFilters(searchParams);
        this.model.setFilter(updateFilter);
        this.view.setInitialFilters(updateFilter);
      }

      const existingLogs = await this.getExistingLogs();

      if (existingLogs.length) {
        this.handleNewLogs(existingLogs);
      }
    }
  }

  onMessageListener = (message) => {
    const { requestTo, requestType } = message;

    if (requestTo !== 'activity-log') {
      return;
    }

    if (requestType === 'appendLogs') {
      this.handleNewLogs([message.log]);
    } else {
      return Promise.reject(
        new Error(`wrong request type found - ${requestType}`)
      );
    }
  };

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
    try {
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
    } catch (error) {
      this.view.setError(error.message);
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
      await save.saveAsJSON();
      this.view.setError(null);
    } catch (error) {
      this.view.setError(error.message);
    }
  }

  onFilterChange(filterDetail) {
    const { updateFilter, newFilterOption } = filterDetail;
    this.model.setFilter(updateFilter);
    this.updateSearchParams(updateFilter);

    if (!newFilterOption) {
      this.view.setLogFilter((log) => this.isFilterMatched(log));
    }
  }

  updateSearchParams(updateFilter) {
    const currentURL = new URL(document.location.href);
    const currentSearchParams = new URLSearchParams(currentURL.search.slice(1));

    const updatedSearchParams = serializeFilters(
      currentSearchParams,
      updateFilter
    );

    history.replaceState(null, null, `?${updatedSearchParams}`);
  }

  isFilterMatched(log) {
    return this.model.matchLogWithFilterObj(log);
  }

  handleClearLogs() {
    this.clearBackgroundLogs();
    this.model.clearLogs();
    this.view.clearTable();
    this.view.updateLogCounter({ visibleRows: 0, totalLogs: 0 });
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
