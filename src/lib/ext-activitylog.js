import { save } from './save-load.js';

class Model {
  constructor() {
    this.logs = [];
    this.filter = {
      id: [],
      viewType: [],
    };
  }

  addNewLog(log) {
    this.logs.push(log);
  }

  addFilter({ target, value }) {
    this.filter[target].push(value);
  }

  removeFilter({ target, value }) {
    this.filter[target].splice(this.filter[target].indexOf(value), 1);
  }
}

class View {
  constructor() {
    this.logView = document.querySelector('log-view');
    this.saveLogBtn = document.querySelector('#saveLogBtn');
    this.notice = document.querySelector('.notice');
    this.checkboxTemplate = document.querySelector('#filterCheckbox').content;

    this.extCheckboxList = document.querySelector('.checkbox-list.extension');
    this.extFilterBtn = document.querySelector('.toggle-btn.extension');

    this.viewTypeCheckboxList = document.querySelector(
      '.checkbox-list.viewtype'
    );
    this.viewTypeFilterBtn = document.querySelector('.toggle-btn.viewtype');

    this.extFilterBtn.addEventListener('click', this);
    this.extCheckboxList.addEventListener('change', this);
    this.viewTypeFilterBtn.addEventListener('click', this);
    this.viewTypeCheckboxList.addEventListener('change', this);
    this.saveLogBtn.addEventListener('click', this);
  }

  handleEvent(event) {
    if (event.type === 'click') {
      switch (event.currentTarget) {
        case this.saveLogBtn:
          this.saveLogBtn.dispatchEvent(new CustomEvent('savelog'));
          break;
        case this.extFilterBtn:
          this.toggleFilterListDisplay(this.extFilterBtn, this.extCheckboxList);
          break;
        case this.viewTypeFilterBtn:
          this.toggleFilterListDisplay(
            this.viewTypeFilterBtn,
            this.viewTypeCheckboxList
          );
          break;
        default:
          throw new Error(`wrong event target - ${event.target.tagName}`);
      }
    } else if (event.type === 'change') {
      this.handleChangeOnCheckbox(event);
    } else {
      throw new Error(`wrong event type - ${event.type}`);
    }
  }

  toggleFilterListDisplay(toggleBtn, checkboxList) {
    checkboxList.hidden = !checkboxList.hidden;
    this.toggleFilterBtnIcon(toggleBtn, checkboxList.hidden);
  }

  toggleFilterBtnIcon(element, isListHidden) {
    isListHidden
      ? element
          .querySelector('.arrow-down')
          .classList.replace('arrow-down', 'arrow-right')
      : element
          .querySelector('.arrow-right')
          .classList.replace('arrow-right', 'arrow-down');
  }

  handleChangeOnCheckbox(event) {
    let target = null;
    switch (event.currentTarget) {
      case this.extCheckboxList:
        target = 'id';
        break;
      case this.viewTypeCheckboxList:
        target = 'viewType';
        break;
      default:
        break;
    }

    if (target) {
      const filterObj = {
        filterParam: { value: event.target.closest('input').value, target },
        checked: event.target.closest('input').checked,
      };

      const filterEvent = new CustomEvent('filter', { detail: filterObj });
      event.currentTarget.dispatchEvent(filterEvent);
    }
  }

  handleNewLog(object) {
    this.logView.addNewRow(object);
    this.updateFilterCheckboxes(object.log);
  }

  updateFilterCheckboxes(log) {
    for (const key of Object.keys(log)) {
      switch (key) {
        case 'id':
          if (!this.isCheckboxExist(this.extCheckboxList, log.id)) {
            this.addNewCheckbox(this.extCheckboxList, log.id);
          }
          break;
        case 'viewType':
          if (!this.isCheckboxExist(this.viewTypeCheckboxList, log.viewType)) {
            this.addNewCheckbox(this.viewTypeCheckboxList, log.viewType);
          }
          break;
        default:
          break;
      }
    }
  }

  isCheckboxExist(checkboxWrapperElement, property) {
    const checkboxLabels = checkboxWrapperElement.querySelectorAll('label p');
    for (const label of checkboxLabels) {
      if (label.textContent === property) {
        return true;
      }
    }
    return false;
  }

  addNewCheckbox(selector, labelText) {
    const checkboxInstance = this.checkboxTemplate.cloneNode(true);
    checkboxInstance.querySelector('label p').textContent = labelText;
    checkboxInstance.querySelector('input').value = labelText;
    checkboxInstance.querySelector('input').checked = true;

    selector.appendChild(checkboxInstance);
  }

  showRows({ filterParam, filterObject, isFilterMatchingFn }) {
    const { target, value } = filterParam;

    const hiddenRows = this.logView.logTableWrapper.querySelectorAll(
      'tbody tr[hidden]'
    );

    for (const row of hiddenRows) {
      const log = row._log;
      if (log[target] === value && !isFilterMatchingFn(filterObject, log)) {
        row.hidden = false;
      }
    }
  }

  hideRows({ filterParam }) {
    const { target, value } = filterParam;

    const visibleRows = this.logView.logTableWrapper.querySelectorAll(
      'tbody tr:not([hidden])'
    );

    for (const row of visibleRows) {
      const log = row._log;
      if (log[target] === value) {
        row.hidden = true;
      }
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
}

class Controller {
  constructor(model, view) {
    this.model = model;
    this.view = view;

    this.init();
  }

  async init() {
    this.view.saveLogBtn.addEventListener('savelog', this);
    this.view.extCheckboxList.addEventListener('filter', this);
    this.view.viewTypeCheckboxList.addEventListener('filter', this);

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
      if (log.viewType === undefined) {
        log.viewType = 'undefined';
      }
      this.model.addNewLog(log);
      this.isFilterMatching(this.model.filter, log)
        ? this.view.handleNewLog({ log, isHidden: true })
        : this.view.handleNewLog({ log, isHidden: false });
    }
  }

  isFilterMatching(filter, log) {
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

  filter(filterOption) {
    const { filterParam, checked } = filterOption;

    const requestType = checked ? 'removeFilter' : 'addFilter';
    const display = checked ? 'showRows' : 'hideRows';

    this.handleFilterOnModel({ requestType, filterParam });
    this.handleFilterOnView({ display, filterParam });
  }

  handleFilterOnModel(filterOption) {
    const { requestType, filterParam } = filterOption;
    this.model[requestType](filterParam);
  }

  handleFilterOnView(filterOption) {
    const { display, filterParam } = filterOption;
    this.view[display]({
      filterParam,
      filterObject: this.model.filter,
      isFilterMatchingFn: this.isFilterMatching,
    });
  }
}

export default class ActivityLog {
  constructor() {
    new Controller(new Model(), new View());
  }
}
