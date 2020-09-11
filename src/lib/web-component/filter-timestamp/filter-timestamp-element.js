import { dateTimeFormat } from '../../formatters.js';

export class FilterTimestamp extends HTMLElement {
  constructor() {
    super();
    this.timeStamp = null;

    const shadow = this.attachShadow({ mode: 'open' });

    const filterWrapper = document
      .querySelector('#filterTimestampTemplate')
      .content.cloneNode(true);

    this.filterContainer = filterWrapper.querySelector(
      '.timestamp-filter-container'
    );

    this.filterToggleBar = filterWrapper.querySelector('.filter-toggle-bar');

    this.timestampFilterOptions = filterWrapper.querySelector(
      '.timestamp-filter-options'
    );

    this.startTimeLabel = this.timestampFilterOptions.querySelector(
      '#startTimeLabel'
    );
    this.stopTimeLabel = this.timestampFilterOptions.querySelector(
      '#stopTimeLabel'
    );

    this.clearFilterBtn = filterWrapper.querySelector('#clearFilter');
    this.clearStartTimeBtn = this.timestampFilterOptions.querySelector(
      '#clearStart'
    );

    this.clearStopTimeBtn = this.timestampFilterOptions.querySelector(
      '#clearStop'
    );

    shadow.appendChild(filterWrapper);
  }

  setFilterRange = (info) => {
    const selectedEl = browser.menus.getTargetElement(info.targetElementId);
    const selectedRow = selectedEl?.closest('tr');

    if (!selectedRow) {
      return;
    }

    const timeStamp = this.timeStamp || {};

    const chosenTimestamp = selectedRow._log.timeStamp;

    if (info.menuItemId === 'startTime') {
      timeStamp.start = chosenTimestamp;
      this.startTimeLabel.textContent = dateTimeFormat(chosenTimestamp);
      this.clearStartTimeBtn.hidden = false;
    } else if (info.menuItemId === 'stopTime') {
      timeStamp.stop = chosenTimestamp;
      this.stopTimeLabel.textContent = dateTimeFormat(chosenTimestamp);
      this.clearStopTimeBtn.hidden = false;
    }

    this.timeStamp = timeStamp;
    this.filterContainer.hidden = false;

    this.setTimestampStatus();
    this.dispatchFilterChange();
  };

  setInitialFilter(timestamp) {
    if (timestamp == null) {
      return;
    }

    this.timeStamp = {};

    if (timestamp?.start != null) {
      this.timeStamp.start = timestamp.start;
      this.startTimeLabel.textContent = dateTimeFormat(timestamp.start);
      this.filterContainer.hidden = false;
      this.clearStartTimeBtn.hidden = false;
    }

    if (timestamp?.stop != null) {
      this.timeStamp.stop = timestamp.stop;
      this.stopTimeLabel.textContent = dateTimeFormat(timestamp.stop);
      this.filterContainer.hidden = false;
      this.clearStopTimeBtn.hidden = false;
    }
  }

  setTimestampStatus() {
    if (this.timeStamp != null || Object.keys(this.timeStamp).length !== 0) {
      this.timestampFilterOptions.hidden = false;
      this.filterToggleBar.classList.add('expanded');
    }
  }

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

  onClearFilter(clearStart = true, clearStop = true) {
    if (clearStart) {
      this.startTimeLabel.textContent = 'From Beginning';
      this.clearStartTimeBtn.hidden = true;
      delete this.timeStamp.start;
    }

    if (clearStop) {
      this.stopTimeLabel.textContent = 'Up to End';
      this.clearStopTimeBtn.hidden = true;
      delete this.timeStamp.stop;
    }

    if (Object.keys(this.timeStamp).length === 0) {
      this.timeStamp = null;
    }

    if (!this.timeStamp) {
      this.timestampFilterOptions.hidden = true;
      this.filterToggleBar.classList.remove('expanded');
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
          return;
        case this.clearStartTimeBtn:
          this.onClearFilter(true, false);
          return;
        case this.clearStopTimeBtn:
          this.onClearFilter(false, true);
          return;
      }
      if (event.currentTarget === this.filterContainer) {
        this.toggleFilterDetailView();
      }
    } else if (event.type === 'hidedropdown') {
      this.timestampFilterOptions.hidden = true;
      this.filterToggleBar.classList.remove('expanded');
    }
  }

  toggleFilterDetailView() {
    this.timestampFilterOptions.hidden = !this.timestampFilterOptions.hidden;
    this.filterToggleBar.classList.toggle('expanded');
  }

  connectedCallback() {
    // context menu doesn't work on devtool_page
    // see: https://github.com/mozilla/extension-activity-monitor/issues/43
    if (!browser.menus?.onClicked || !browser.menus?.onHidden) {
      return;
    }

    browser.menus.onClicked.addListener(this.setFilterRange);
    browser.menus.onHidden.addListener(this.onHiddenListener);
    this.filterContainer.addEventListener('click', this);
    this.timestampFilterOptions.addEventListener('click', this);
    this.addEventListener('hidedropdown', this);
  }

  disconnectedCallback() {
    browser.menus.onClicked.removeListener(this.setFilterRange);
    browser.menus.onHidden.removeListener(this.onHiddenListener);
    this.filterContainer.removeEventListener('click', this);
    this.timestampFilterOptions.addEventListener('click', this);
    this.removeEventListener('hidedropdown', this);
  }
}

window.customElements.define('filter-timestamp', FilterTimestamp);
