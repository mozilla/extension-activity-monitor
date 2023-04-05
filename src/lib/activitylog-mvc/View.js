import dropDownController from "../DropDownController.js";

export default class View {
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
    const { id, viewType, type, name, keyword, timeStamp, tabId } =
      updateFilter;

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
