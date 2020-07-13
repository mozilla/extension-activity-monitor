import { save } from './save-load.js';

class Model {
  constructor() {
    this.logs = [];
  }

  addNewLogs(logs) {
    this.logs.push(...logs);
  }
}

class View {
  constructor() {
    this.logTable = document.querySelector('log-view');
    this.saveLogBtn = document.getElementById('saveLogBtn');
    this.notice = document.querySelector('.notice');

    this.saveLogBtn.addEventListener('click', function () {
      this.dispatchEvent(new CustomEvent('savelog'));
    });
  }

  addTableRows(logs) {
    this.logTable.addNewRows(logs);
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

    browser.runtime.onMessage.addListener((message) => {
      const { requestTo, requestType } = message;

      if (requestTo !== 'activity-log') {
        return;
      }

      if (requestType === 'appendLogs') {
        this.model.addNewLogs([message.log]);
        this.view.addTableRows([message.log]);
      } else {
        throw new Error(`wrong request type found - ${requestType}`);
      }
    });

    const existingLogs = await this.getExistingLogs();

    if (existingLogs.length) {
      this.model.addNewLogs(existingLogs);
      this.view.addTableRows(this.model.logs);
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
