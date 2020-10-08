import { dateTimeFormat } from '../../formatters.js';

export class LogView extends HTMLElement {
  constructor() {
    super();
    this.isFilterMatched = () => true;
    this.highlightedRow = null;

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
    this.emptyTableLabel = logTableInstance.querySelector('.table-empty-label');

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
    const totalLogs = this.tableBody.rows.length;

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

      const timestamp = logTableRowInstance.querySelector('.timestamp');
      timestamp.textContent = dateTimeFormat(log.timeStamp, { timeOnly: true });
      timestamp.title = dateTimeFormat(log.timeStamp);

      logTableRowInstance.querySelector('.id').textContent = log.id;
      logTableRowInstance.querySelector('.api-type').textContent = log.type;
      logTableRowInstance.querySelector('.api-name').textContent = log.name;
      logTableRowInstance.querySelector('.view-type').textContent =
        log.viewType || '';

      rowsFragment.appendChild(logTableRowInstance);
    }

    this.emptyTableLabel.hidden = true;
    this.tableBody.appendChild(rowsFragment);
    this.triggerLogCountChange();
  }

  handleEvent(event) {
    if (event.type === 'click') {
      const logDetails = event.target.closest('tr')?._log;

      if (logDetails) {
        this.highlightedRow?.classList.remove('row-highlight');
        this.highlightedRow = event.target.closest('tr');
        this.highlightedRow?.classList.add('row-highlight');
        this.openDetailSidebar(logDetails);
        return;
      }

      if (event.target === this.closeBtn) {
        this.highlightedRow?.classList.remove('row-highlight');
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
    this.emptyTableLabel.hidden = false;
    this.closeDetailSidebar();
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
