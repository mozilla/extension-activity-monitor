class FilterOption extends HTMLElement {
  constructor() {
    super();

    this.checkboxLabels = new Set([]);

    const shadow = this.attachShadow({ mode: 'open' });

    this.checkboxTemplate = document.querySelector(
      '#filterCheckboxTemplate'
    ).content;

    const filterContainer = document
      .querySelector('#filterContainerTemplate')
      .content.cloneNode(true);

    this.toggleBtn = filterContainer.querySelector('.toggle-btn');
    this.toggleBtn.classList.add(this.filterKey);
    this.toggleBtn.textContent = this.textContent;

    this.checkboxList = filterContainer.querySelector('.checkbox-list');
    this.checkboxList.classList.add(this.filterKey);

    shadow.appendChild(filterContainer);
  }

  updateFilterCheckboxes(logs) {
    for (const log of logs) {
      const checkboxLabel = log[this.filterKey];
      if (!this.checkboxLabels.has(checkboxLabel)) {
        this.checkboxLabels.add(checkboxLabel);
        this.addNewCheckbox(checkboxLabel);
      }
    }
  }

  addNewCheckbox(labelText) {
    const newCheckbox = this.checkboxTemplate.cloneNode(true);
    newCheckbox.querySelector('label span').textContent =
      labelText || 'undefined';

    const inputCheckbox = newCheckbox.querySelector('input');
    inputCheckbox.value = labelText;
    inputCheckbox.checked = true;

    this.checkboxList.appendChild(newCheckbox);
  }

  get filterKey() {
    return this.getAttribute('filter-key');
  }

  connectedCallback() {
    this.toggleBtn.addEventListener('click', this);
    this.checkboxList.addEventListener('change', this);
  }

  handleEvent(event) {
    if (event.type === 'click' && event.currentTarget === this.toggleBtn) {
      this.toggleFilterListDisplay(this.checkboxList);
    } else if (
      event.type === 'change' &&
      event.currentTarget === this.checkboxList
    ) {
      const filterObject = {
        filterDetail: {
          logKey: this.filterKey,
          valueEquals:
            event.target.value === 'undefined' ? undefined : event.target.value,
        },
        isFilterRemoved: event.target.checked,
      };

      const filterEvent = new CustomEvent('filterchange', {
        detail: filterObject,
      });
      this.dispatchEvent(filterEvent);
    } else {
      throw new Error(`wrong event type - ${event.type}`);
    }
  }

  toggleFilterListDisplay(checkboxList) {
    checkboxList.hidden = !checkboxList.hidden;
    this.toggleBtn.classList.toggle('expanded');
  }

  disconnectedCallback() {
    this.toggleBtn.addEventListener('click', this);
    this.checkboxList.addEventListener('change', this);
  }
}

window.customElements.define('filter-option', FilterOption);
