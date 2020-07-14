class LogView extends HTMLElement {
  constructor() {
    super();

    const shadow = this.attachShadow({ mode: 'open' });

    this.logTableRow = document
      .querySelector('#logTableRowTemplate')
      .content.firstElementChild.cloneNode(true);

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

  addNewRows(logs) {
    const rowsFragment = document.createDocumentFragment();

    for (const log of logs) {
      const logTableRowInstance = this.logTableRow.cloneNode(true);
      logTableRowInstance._log = log;

      logTableRowInstance.querySelector('.id').textContent = log.id;
      logTableRowInstance.querySelector('.timestamp').textContent =
        log.timeStamp;
      logTableRowInstance.querySelector('.api-type').textContent = log.type;
      logTableRowInstance.querySelector('.name').textContent = log.name;
      logTableRowInstance.querySelector('.view-type').textContent =
        log.viewType || 'undefined';

      rowsFragment.appendChild(logTableRowInstance);
    }

    this.tableBody.appendChild(rowsFragment);
  }

  openDetailSidebar(logDetails) {
    const logString = JSON.stringify(logDetails);
    this.logDetails.textContent = logString;
    this.logTableWrapper.classList.add('width-60');
    this.logDetailWrapper.hidden = false;
  }

  closeDetailSidebar() {
    this.logDetailWrapper.hidden = true;
    this.logTableWrapper.classList.remove('width-60');
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
    }
  }

  connectedCallback() {
    this.tableBody.addEventListener('click', this);
    this.closeBtn.addEventListener('click', this);
  }

  disconnectedCallback() {
    this.tableBody.removeEventListener('click', this);
    this.closeBtn.removeEventListener('click', this);
  }
}

window.customElements.define('log-view', LogView);
