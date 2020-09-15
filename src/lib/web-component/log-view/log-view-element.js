import { dateTimeFormat } from '../../formatters.js';

let totalLogs = 0;

export class LogView extends HTMLElement {
  constructor() {
    super();
    this.isFilterMatched = () => true;

    const shadow = this.attachShadow({ mode: 'open' });

    this.logTableRow = document.querySelector(
      '#logTableRowTemplate'
    ).content.firstElementChild;

    this.logTableTemplate = document.querySelector('#logTableTemplate');

    const logTableInstance = this.logTableTemplate.content.cloneNode(true);
    this.logDetailWrapper = logTableInstance.querySelector(
      '.log-detail-wrapper'
    );
    this.logDetails = logTableInstance.querySelector('.log-details');
    this.closeBtn = logTableInstance.querySelector('.close');
    this.logTableWrapper = logTableInstance.querySelector('.log-table-wrapper');
    this.tableBody = logTableInstance.querySelector('tbody');

    shadow.appendChild(logTableInstance);
  }

  setLogFilter(filterFunc) {
    this.isFilterMatched = filterFunc;

    for (const row of this.tableBody.rows) {
      row.hidden = !this.isFilterMatched(row._log);
    }

    this.triggerLogCountChange();
  }

  triggerLogCountChange() {
    let visibleRows = 0;
    for (const row of this.tableBody.rows) {
      if (!row.hidden) {
        visibleRows++;
      }
    }

    this.dispatchEvent(
      new CustomEvent('logcountchange', {
        detail: { visibleRows, totalLogs },
      })
    );
  }

  addNewRows(logs) {
    const rowsFragment = document.createDocumentFragment();
    for (const log of logs) {
      const logTableRowInstance = this.logTableRow.cloneNode(true);
      logTableRowInstance._log = log;
      logTableRowInstance.hidden = !this.isFilterMatched(log);

      logTableRowInstance.querySelector('.id').textContent = log.id;

      const timestamp = logTableRowInstance.querySelector('.timestamp');

      timestamp.textContent = dateTimeFormat(log.timeStamp, { timeOnly: true });
      timestamp.title = dateTimeFormat(log.timeStamp);

      logTableRowInstance.querySelector('.api-type').textContent = log.type;

      if (log.type === 'content_script') {
        const contentScriptTD = logTableRowInstance.querySelector('.name');
        contentScriptTD.textContent = log.name;
        contentScriptTD.colSpan = 2;
        // view type is undefined for log.type = content_script
        logTableRowInstance.querySelector('.view-type').hidden = true;
      } else {
        logTableRowInstance.querySelector('.name').textContent = log.name;
        logTableRowInstance.querySelector('.view-type').textContent =
          log.viewType;
      }

      rowsFragment.appendChild(logTableRowInstance);
    }
    this.tableBody.appendChild(rowsFragment);

    totalLogs += logs.length;
    this.triggerLogCountChange();
  }

  handleEvent(event) {
    if (event.type === 'click') {
      const logDetails = event.target.closest('tr')?._log;

      if (logDetails) {
        this.openDetailSidebar(logDetails);
        return;
      }

      if (event.target === this.closeBtn) {
        this.closeDetailSidebar();
      }
    } else if (event.type === 'contextmenu') {
      // This event can only be triggered in table body.
      browser.menus.overrideContext({});
      this.createContextMenu();
      browser.menus.refresh();
    }
  }

  openDetailSidebar(logDetails) {
    const logString = JSON.stringify(logDetails, null, 2);
    this.logDetails.textContent = logString;
    this.logTableWrapper.classList.add('width-60');
    this.logDetailWrapper.hidden = false;
  }

  closeDetailSidebar() {
    this.logDetailWrapper.hidden = true;
    this.logTableWrapper.classList.remove('width-60');
  }

  createContextMenu() {
    browser.menus.create({
      id: 'startTime',
      title: 'Start from this timestamp',
      contexts: ['page'],
      viewTypes: ['tab'],
      documentUrlPatterns: [location.href],
    });

    browser.menus.create({
      id: 'stopTime',
      title: 'Stop at this timestamp',
      contexts: ['page'],
      viewTypes: ['tab'],
      documentUrlPatterns: [location.href],
    });
  }

  clearTable() {
    this.tableBody.textContent = '';
  }

  connectedCallback() {
    this.tableBody.addEventListener('click', this);
    this.closeBtn.addEventListener('click', this);

    // context menu doesn't work on devtool_page
    // see: https://github.com/mozilla/extension-activity-monitor/issues/43
    if (browser.menus?.overrideContext) {
      this.tableBody.addEventListener('contextmenu', this);
    }
  }

  disconnectedCallback() {
    this.tableBody.removeEventListener('click', this);
    this.tableBody.removeEventListener('contextmenu', this);
    this.closeBtn.removeEventListener('click', this);
  }
}

window.customElements.define('log-view', LogView);
