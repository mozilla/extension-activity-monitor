import { save } from './save-load.js';

class Model {
  constructor() {
    this.logs = [];
    this.filter = {
      ids: [],
    };
  }

  addNewLogs(log) {
    this.logs.push(log);
  }
}

class View {
  constructor() {
    this.logView = document.querySelector('log-view');
    this.saveLogBtn = document.getElementById('saveLogBtn');
    this.notice = document.querySelector('.notice');

    this.extCheckboxTemplate = document.querySelector(
      '#filterExtCheckbox'
    ).content;

    this.extList = document.querySelector('.extension-list');

    this.saveLogBtn.addEventListener('click', function () {
      this.dispatchEvent(new CustomEvent('savelog'));
    });

    this.extFilterBtn = document.querySelector('.extension-selector');

    this.extFilterBtn.addEventListener('click', () => {
      if (this.extList.hidden) {
        this.extList.hidden = false;
        document
          .querySelector('.arrow-right')
          .classList.replace('arrow-right', 'arrow-down');
      } else {
        this.extList.hidden = true;
        document
          .querySelector('.arrow-down')
          .classList.replace('arrow-down', 'arrow-right');
      }
    });

    this.extList.addEventListener('change', function (event) {
      const filterObj = {
        id: event.target.closest('input').value,
        checked: event.target.closest('input').checked,
      };

      const filterRowEvent = new CustomEvent('filter-rows', {
        detail: { filterObj },
      });
      this.dispatchEvent(filterRowEvent);
    });
  }

  addTableRows(log) {
    this.logView.addNewRows(log);
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
    this.view.extList.addEventListener('filter-rows', this);

    browser.runtime.onMessage.addListener((message) => {
      const { requestTo, requestType } = message;

      if (requestTo !== 'activity-log') {
        return;
      }

      if (requestType === 'appendLogs') {
        this.handleNewLogs([message.log]);
        this.updateFilterOption([message.log]);
      } else {
        throw new Error(`wrong request type found - ${requestType}`);
      }
    });

    const existingLogs = await this.getExistingLogs();

    if (existingLogs.length) {
      this.handleNewLogs(existingLogs);
      this.updateFilterOption(this.model.logs);
    }
  }

  handleNewLogs(logs) {
    for (const log of logs) {
      this.model.addNewLogs(log);
      if (this.model.filter.ids.includes(log.id)) {
        this.view.addTableRows({ log, isHidden: true });
      } else {
        this.view.addTableRows({ log, isHidden: false });
      }
    }
  }

  updateFilterOption(logs) {
    for (const log of logs) {
      if (!this.existInFilterIds(log.id)) {
        const checkboxInstance = this.view.extCheckboxTemplate.cloneNode(true);
        checkboxInstance.querySelector('p.ext-id').textContent = log.id;
        checkboxInstance.querySelector('input').value = log.id;
        checkboxInstance.querySelector('input').checked = true;

        this.view.extList.appendChild(checkboxInstance);
      }
    }
  }

  existInFilterIds(id) {
    const allExtIdElement = this.view.extList.querySelectorAll(
      'label p.ext-id'
    );
    for (const eachElement of allExtIdElement) {
      if (eachElement.textContent === id) {
        return true;
      }
    }
    return false;
  }

  filterTableRows(filterOptions) {
    const { id, checked } = filterOptions;

    if (checked) {
      const hiddenRows = this.view.logView.logTableWrapper.querySelectorAll(
        'tbody tr[hidden]'
      );

      for (const row of hiddenRows) {
        if (row._log.id === id) {
          row.hidden = false;
        }
      }

      this.model.filter.ids.splice(this.model.filter.ids.indexOf(id), 1);
    } else {
      const visibleRows = this.view.logView.logTableWrapper.querySelectorAll(
        'tbody tr:not([hidden])'
      );

      for (const row of visibleRows) {
        if (row._log.id === id) {
          row.hidden = true;
        }
      }

      this.model.filter.ids.push(id);
    }
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
    } else if (event.type === 'filter-rows') {
      this.filterTableRows(event.detail.filterObj);
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
}

export default class ActivityLog {
  constructor() {
    new Controller(new Model(), new View());
  }
}
