import { save } from './save-load.js';

class Model {
  constructor() {
    this.logs = [];
    this.filter = {
      id: [],
      viewType: [],
    };
  }

  handleFilter(filterObj) {
    const { type, detail } = filterObj;

    if (type === 'addFilter') {
      this.filter[detail.target].push(detail.value);
    } else if (type === 'removeFilter') {
      this.filter[detail.target].splice(
        this.filter[detail.target].indexOf(detail.value),
        1
      );
    }
  }

  addNewLog(log) {
    this.logs.push(log);
  }
}

class View {
  constructor() {
    this.logView = document.querySelector('log-view');
    this.saveLogBtn = document.querySelector('#saveLogBtn');
    this.notice = document.querySelector('.notice');
    this.checkboxTemplate = document.querySelector('#filterCheckbox').content;

    this.extCheckboxList = document.querySelector('.checkbox-list.extension');
    this.toggleExtList = document.querySelector('.toggle-list.extension');

    this.viewTypeCheckboxList = document.querySelector(
      '.checkbox-list.viewtype'
    );
    this.toggleViewTypeList = document.querySelector('.toggle-list.viewtype');

    this.toggleExtList.addEventListener('click', this);
    this.extCheckboxList.addEventListener('change', this);

    this.toggleViewTypeList.addEventListener('click', this);
    this.viewTypeCheckboxList.addEventListener('change', this);

    this.saveLogBtn.addEventListener('click', this);
  }

  handleEvent(event) {
    if (event.type === 'click') {
      switch (event.currentTarget) {
        case this.saveLogBtn:
          this.saveLogBtn.dispatchEvent(new CustomEvent('savelog'));
          break;

        case this.toggleExtList:
          this.extCheckboxList.hidden = !this.extCheckboxList.hidden;
          this.toggleFilterBtnIcon(
            this.toggleExtList,
            this.extCheckboxList.hidden
          );
          break;

        case this.toggleViewTypeList:
          this.viewTypeCheckboxList.hidden = !this.viewTypeCheckboxList.hidden;
          this.toggleFilterBtnIcon(
            this.toggleViewTypeList,
            this.viewTypeCheckboxList.hidden
          );
          break;

        default:
          throw new Error(`wrong event target - ${event.target.tagName}`);
      }
    } else if (event.type === 'change') {
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
    } else {
      throw new Error(`wrong event type - ${event.type}`);
    }
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

  handleNewLog(logObj) {
    this.addTableRow(logObj);
    this.updateFilerOptions(logObj.log);
  }

  addTableRow(logObj) {
    this.logView.addNewRow(logObj);
  }

  updateFilerOptions(log) {
    function isCheckboxExist(checkboxWrapperElement, property) {
      const checkboxLabels = checkboxWrapperElement.querySelectorAll('label p');
      for (const label of checkboxLabels) {
        if (label.textContent === property) {
          return true;
        }
      }
      return false;
    }

    for (const key of Object.keys(log)) {
      switch (key) {
        case 'id':
          if (!isCheckboxExist(this.extCheckboxList, log.id)) {
            this.addNewCheckbox(this.extCheckboxList, log.id);
          }
          break;
        case 'viewType':
          if (!isCheckboxExist(this.viewTypeCheckboxList, log.viewType)) {
            this.addNewCheckbox(
              this.viewTypeCheckboxList,
              String(log.viewType)
            );
          }
          break;
        default:
          break;
      }
    }
  }

  addNewCheckbox(selector, labelText) {
    const checkboxInstance = this.checkboxTemplate.cloneNode(true);
    checkboxInstance.querySelector('label p').textContent = labelText;
    checkboxInstance.querySelector('input').value = labelText;
    checkboxInstance.querySelector('input').checked = true;

    selector.appendChild(checkboxInstance);
  }

  handleTableFilter(filterOption, filterModelObject, isFilterMatching) {
    const { display, detail } = filterOption;

    if (display === 'show') {
      const hiddenRows = this.logView.logTableWrapper.querySelectorAll(
        'tbody tr[hidden]'
      );

      for (const row of hiddenRows) {
        if (
          row._log[detail.target] === detail.value &&
          !isFilterMatching(filterModelObject, row._log)
        ) {
          row.hidden = false;
        }
      }
    } else if (display === 'hide') {
      const visibleRows = this.logView.logTableWrapper.querySelectorAll(
        'tbody tr:not([hidden])'
      );

      for (const row of visibleRows) {
        if (row._log[detail.target] === detail.value) {
          row.hidden = true;
        }
      }
    } else {
      throw new Error(`wrong display option - ${display}`);
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
      this.filterTableRows(event.detail);
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

  filterTableRows(filterOptions) {
    const { filterParam, checked } = filterOptions;

    const type = checked ? 'removeFilter' : 'addFilter';
    const display = checked ? 'show' : 'hide';

    this.model.handleFilter({ type, detail: filterParam });
    this.view.handleTableFilter(
      { display, detail: filterParam },
      this.model.filter,
      this.isFilterMatching
    );
  }
}

export default class ActivityLog {
  constructor() {
    new Controller(new Model(), new View());
  }
}
