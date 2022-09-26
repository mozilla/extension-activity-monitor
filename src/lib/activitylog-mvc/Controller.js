import { deSerializeFilters, serializeFilters } from '../formatters.js';
import { save } from '../save-load.js';

export default class Controller {
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

      try {
        const currentTab = await browser.tabs.getCurrent();

        const logs = await browser.runtime.sendMessage({
          requestType: 'getLoadedLogs',
          requestTo: 'ext-monitor',
          requestParams: { tabId: currentTab.id },
        });

        if (logs?.length) {
          this.handleNewLogs(logs);
        }
      } catch (error) {
        this.view.setError(error.message);
      }
    } else {
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
          this.view.setError(`wrong request type found - ${requestType}`);
        }
      });

      if (document.location.search) {
        const updateFilter = deSerializeFilters(searchParams);
        this.model.setFilter(updateFilter);
        this.view.setInitialFilters(updateFilter);
      }

      try {
        const existingLogs = await this.getExistingLogs();

        if (existingLogs.length) {
          this.handleNewLogs(existingLogs);
        }
      } catch (error) {
        this.view.setError(error.message);
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

  async handleEvent(event) {
    this.view.setError(null);

    try {
      switch (event.type) {
        case 'loadlog':
          await this.loadLogs(event.detail);
          break;
        case 'savelog':
          await this.saveLogs();
          break;
        case 'filterchange':
          this.onFilterChange(event.detail);
          break;
        case 'clearlog':
          await this.handleClearLogs();
          break;
        default:
          throw new Error(`wrong event type found - ${event.type}`);
      }
    } catch (error) {
      this.view.setError(error.message);
    }
  }

  async loadLogs(file) {
    await browser.runtime.sendMessage({
      requestTo: 'ext-monitor',
      requestType: 'loadLogs',
      requestParams: { file },
    });
  }

  async saveLogs() {
    await save.saveAsJSON();
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

  async handleClearLogs() {
    await this.clearBackgroundLogs();
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
