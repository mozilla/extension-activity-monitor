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

    this.startTimeLabel = filterWrapper.querySelector('#startTimeLabel');
    this.stopTimeLabel = filterWrapper.querySelector('#stopTimeLabel');
    this.clearBtn = filterWrapper.querySelector('#clearBtn');

    shadow.appendChild(filterWrapper);
  }

  setFilterRange = (info) => {
    const selectedEl = browser.menus.getTargetElement(info.targetElementId);
    const selectedRow = selectedEl.closest('tr');

    if (!selectedRow) {
      return;
    }

    // this.timestamp is null when timestamp filter is not applied.
    if (!this.timeStamp) {
      this.timeStamp = {};
    }

    const chosenTimestamp = selectedRow.querySelector('.timestamp').textContent;
    if (info.menuItemId === 'startTime') {
      this.timeStamp.start = Date.parse(chosenTimestamp);
      this.startTimeLabel.textContent = chosenTimestamp;
    } else if (info.menuItemId === 'stopTime') {
      this.timeStamp.stop = Date.parse(chosenTimestamp);
      this.stopTimeLabel.textContent = chosenTimestamp;
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

  onClearFilter = () => {
    this.startTimeLabel.textContent = 'From Beginning';
    this.stopTimeLabel.textContent = 'Up to End';
    this.filterContainer.hidden = true;

    this.timeStamp = null;
    this.dispatchFilterChange();
  };

  onHiddenListener = () => {
    browser.menus.removeAll();
  };

  connectedCallback() {
    browser.menus.onClicked.addListener(this.setFilterRange);
    browser.menus.onHidden.addListener(this.onHiddenListener);
    this.clearBtn.addEventListener('click', this.onClearFilter);
  }

  disconnectedCallback() {
    browser.menus.onClicked.removeListener(this.setFilterRange);
    browser.menus.onHidden.removeListener(this.onHiddenListener);
    this.clearBtn.removeEventListener('click', this.onClearFilter);
  }
}

window.customElements.define('filter-timestamp', FilterTimestamp);
