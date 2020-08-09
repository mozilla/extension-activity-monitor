export class FilterTimestamp extends HTMLElement {
  constructor() {
    super();
    this.timeStamp = {};

    const shadow = this.attachShadow({ mode: 'open' });

    const filterWrapper = document
      .querySelector('#filterTimestampTemplate')
      .content.cloneNode(true);

    this.filterContainer = filterWrapper.querySelector(
      '.timestamp-filter-container'
    );

    this.startTimeLabel = filterWrapper.querySelector('#startTimeLabel');
    this.stopTimeLabel = filterWrapper.querySelector('#stopTimeLabel');

    this.clearFilterBtn = filterWrapper.querySelector('#clearFilter');
    this.clearStartTimeBtn = filterWrapper.querySelector('#clearStart');
    this.clearStopTimeBtn = filterWrapper.querySelector('#clearStop');

    shadow.appendChild(filterWrapper);
  }

  setFilterRange = (info) => {
    const selectedEl = browser.menus.getTargetElement(info.targetElementId);
    const selectedRow = selectedEl.closest('tr');

    if (!selectedRow) {
      return;
    }

    const chosenTimestamp = selectedRow.querySelector('.timestamp').textContent;
    if (info.menuItemId === 'startTime') {
      this.timeStamp.start = Date.parse(chosenTimestamp);
      this.startTimeLabel.textContent = chosenTimestamp;
      this.clearStartTimeBtn.hidden = false;
    } else if (info.menuItemId === 'stopTime') {
      this.timeStamp.stop = Date.parse(chosenTimestamp);
      this.stopTimeLabel.textContent = chosenTimestamp;
      this.clearStopTimeBtn.hidden = false;
    }

    this.filterContainer.hidden = false;
    this.dispatchFilterChange();
  };

  dispatchFilterChange() {
    const filterDetail = {
      updateFilter: {
        timeStamp: this.timeStamp,
      },
    };

    this.dispatchEvent(
      new CustomEvent('filterchange', { detail: filterDetail })
    );
  }

  onClearFilter(clearRequest) {
    if (clearRequest === 'startTime') {
      this.startTimeLabel.textContent = 'From Beginning';
      this.clearStartTimeBtn.hidden = true;
      delete this.timeStamp.start;
    } else if (clearRequest === 'stopTime') {
      this.stopTimeLabel.textContent = 'Up to End';
      this.clearStopTimeBtn.hidden = true;
      delete this.timeStamp.stop;
    } else {
      this.startTimeLabel.textContent = 'From Beginning';
      this.stopTimeLabel.textContent = 'Up to End';
      this.timeStamp = {};
    }

    if (Object.keys(this.timeStamp).length === 0) {
      this.filterContainer.hidden = true;
    }

    this.dispatchFilterChange();
  }

  onHiddenListener = () => {
    browser.menus.removeAll();
  };

  handleEvent(event) {
    if (event.type === 'click') {
      switch (event.target) {
        case this.clearFilterBtn:
          this.onClearFilter();
          break;
        case this.clearStartTimeBtn:
          this.onClearFilter('startTime');
          break;
        case this.clearStopTimeBtn:
          this.onClearFilter('stopTime');
          break;
      }
    }
  }

  connectedCallback() {
    browser.menus.onClicked.addListener(this.setFilterRange);
    browser.menus.onHidden.addListener(this.onHiddenListener);
    this.clearFilterBtn.addEventListener('click', this);
    this.clearStartTimeBtn.addEventListener('click', this);
    this.clearStopTimeBtn.addEventListener('click', this);
  }

  disconnectedCallback() {
    browser.menus.onClicked.removeListener(this.setFilterRange);
    browser.menus.onHidden.removeListener(this.onHiddenListener);
    this.clearFilterBtn.removeEventListener('click', this);
    this.clearStartTimeBtn.addEventListener('click', this);
    this.clearStopTimeBtn.addEventListener('click', this);
  }
}

window.customElements.define('filter-timestamp', FilterTimestamp);
