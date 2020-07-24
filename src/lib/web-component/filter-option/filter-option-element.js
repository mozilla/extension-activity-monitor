class FilterOption extends HTMLElement {
  constructor() {
    super();

    this.viewCheckboxLabels = new Set();

    // It contains the checked checkboxes
    this.activeCheckboxLabels = new Set();

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
      if (!this.viewCheckboxLabels.has(checkboxLabel)) {
        this.viewCheckboxLabels.add(checkboxLabel);
        this.addNewCheckbox(checkboxLabel);
        this.dispatchFilterChangeEvent({ isNewFilterAdded: true });
      }
    }
  }

  addNewCheckbox(checkboxLabel) {
    const newCheckbox = this.checkboxTemplate.cloneNode(true);
    newCheckbox.querySelector('label span').textContent =
      checkboxLabel || 'undefined';

    const inputCheckbox = newCheckbox.querySelector('input');
    inputCheckbox.value = checkboxLabel;
    inputCheckbox.checked = true;

    // adding to activeCheckboxLabels list since checkbox is checked
    this.activeCheckboxLabels.add(checkboxLabel);

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
      const checkboxLabel =
        event.target.value === 'undefined' ? undefined : event.target.value;
      const isChecked = event.target.checked;

      this.onCheckboxChange(checkboxLabel, isChecked);
    } else {
      throw new Error(`wrong event type - ${event.type}`);
    }
  }

  toggleFilterListDisplay(checkboxList) {
    checkboxList.hidden = !checkboxList.hidden;
    this.toggleBtn.classList.toggle('expanded');
  }

  onCheckboxChange(checkboxLabel, isChecked) {
    if (isChecked) {
      this.activeCheckboxLabels.add(checkboxLabel);
    } else {
      this.activeCheckboxLabels.delete(checkboxLabel);
    }
    this.dispatchFilterChangeEvent({ isNewFilterAdded: false });
  }

  dispatchFilterChangeEvent({ isNewFilterAdded }) {
    const filterDetail = {
      filterObject: {
        logKey: this.filterKey,
        filterDescriptor: new Set([...this.activeCheckboxLabels]),
      },
      isNewFilterAdded,
    };

    this.dispatchEvent(
      new CustomEvent('filterchange', { detail: filterDetail })
    );
  }

  disconnectedCallback() {
    this.toggleBtn.addEventListener('click', this);
    this.checkboxList.addEventListener('change', this);
  }
}

window.customElements.define('filter-option', FilterOption);
