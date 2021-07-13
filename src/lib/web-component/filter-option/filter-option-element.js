import dropDownController from '../../DropDownController.js';

// When viewtype is undefined for API calls
const FILTER_OPTION_UNDEFINED_LABEL = 'other';

export class FilterOption extends HTMLElement {
  constructor() {
    super();

    this.viewCheckboxLabels = new Set();
    this.uncheckedCheckboxLabels = new Set();

    const shadow = this.attachShadow({ mode: 'open' });

    this.checkboxTemplate = document.querySelector(
      '#filterCheckboxTemplate'
    ).content;

    const filterContainer = document
      .querySelector('#filterContainerTemplate')
      .content.cloneNode(true);

    this.toggleBtn = filterContainer.querySelector('.toggle-btn');
    this.toggleBtn.classList.add(this.filterKey);

    this.filterOptionTitle = filterContainer.querySelector('.title');
    this.filterOptionTitle.textContent = this.textContent;

    this.checkboxList = filterContainer.querySelector(
      '.checkbox-list.dropdown-list'
    );
    this.checkboxList.classList.add(this.filterKey);

    shadow.appendChild(filterContainer);
  }

  updateFilterCheckboxes(logs) {
    for (const log of logs) {
      const checkboxLabel = log[this.filterKey];
      if (!this.viewCheckboxLabels.has(checkboxLabel)) {
        this.addNewCheckbox(checkboxLabel);
      }
    }

    this.dispatchFilterChangeEvent({ newFilterOption: true });
  }

  setInitialFilter(searchParamLabels) {
    for (const label of searchParamLabels) {
      // the checkboxes with these labels will be in unchecked condition
      this.uncheckedCheckboxLabels.add(label);
    }
  }

  addNewCheckbox(checkboxLabel) {
    const newCheckbox = this.checkboxTemplate.cloneNode(true);
    newCheckbox.querySelector('label span').textContent =
      checkboxLabel || FILTER_OPTION_UNDEFINED_LABEL;

    const inputCheckbox = newCheckbox.querySelector('input');
    inputCheckbox.value = checkboxLabel || FILTER_OPTION_UNDEFINED_LABEL;
    inputCheckbox.checked = !this.uncheckedCheckboxLabels.has(checkboxLabel);

    this.viewCheckboxLabels.add(checkboxLabel);
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
      dropDownController.toggleDropDown(this);
    } else if (
      event.type === 'change' &&
      event.currentTarget === this.checkboxList
    ) {
      // when viewType is undefined, we display it as "other" in filter option.
      const checkboxLabel =
        event.target.value === FILTER_OPTION_UNDEFINED_LABEL
          ? undefined
          : event.target.value;
      const isChecked = event.target.checked;

      if (isChecked) {
        this.uncheckedCheckboxLabels.delete(checkboxLabel);
      } else {
        this.uncheckedCheckboxLabels.add(checkboxLabel);
      }

      this.dispatchFilterChangeEvent();
    }
  }

  dispatchFilterChangeEvent(options) {
    const filterDetail = {
      updateFilter: {
        [this.filterKey]: {
          exclude: new Set(this.uncheckedCheckboxLabels),
        },
      },
      newFilterOption: options?.newFilterOption || false,
    };

    this.dispatchEvent(
      new CustomEvent('filterchange', { detail: filterDetail })
    );
  }

  disconnectedCallback() {
    this.toggleBtn.removeEventListener('click', this);
    this.checkboxList.removeEventListener('change', this);
  }
}

window.customElements.define('filter-option', FilterOption);
