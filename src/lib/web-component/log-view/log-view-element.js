import LogItemView from '../log-item-view/log-item-view-element.js';

class LogView extends HTMLElement {
  constructor() {
    super();

    const shadow = this.attachShadow({ mode: 'open' });

    this.logTableTemplate = document.querySelector('.log-table-template');
    const logTableInstance = document.importNode(
      this.logTableTemplate.content,
      true
    );

    this.logDetailWrapper = logTableInstance.querySelector(
      '.log-detail-wrapper'
    );
    this.logDetails = logTableInstance.querySelector('#logDetails');
    this.closeBtn = logTableInstance.querySelector('.close');
    this.logTableWrapper = logTableInstance.querySelector('.log-table-wrapper');
    this.tableBody = logTableInstance.querySelector('tbody');

    shadow.appendChild(logTableInstance);
  }

  addRows(logs) {
    for (const log of logs) {
      const logItemView = new LogItemView(log);
      this.tableBody.appendChild(logItemView);
    }
  }

  openDetailSidebar(logDetails) {
    const logString = JSON.stringify(logDetails);
    this.logDetails.textContent = logString;
    this.logTableWrapper.classList.add('width-60');
    this.logDetailWrapper.removeAttribute('hidden');
  }

  closeDetailSidebar() {
    this.logDetailWrapper.setAttribute('hidden', true);
    this.logTableWrapper.classList.remove('width-60');
  }

  handleEvent(event) {
    if (event.type === 'click') {
      const logDetails = event.target.closest('div')?._log;

      if (logDetails) {
        this.openDetailSidebar(logDetails);
        return;
      }

      if (event.target === this.closeBtn) {
        this.logTableWrapper.classList.remove('width-60');
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
