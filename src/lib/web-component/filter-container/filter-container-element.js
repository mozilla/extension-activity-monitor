class FilterContainer extends HTMLElement {
  constructor() {
    super();

    this.checkboxes = new Set([]);

    const shadow = this.attachShadow({ mode: 'open' });

    this.checkboxTemplate = document.querySelector(
      '#filterCheckboxTemplate'
    ).content;

    const filterTemplate = document
      .querySelector('#filterContainerTemplate')
      .content.cloneNode(true);

    this.toggleBtn = filterTemplate.querySelector('.toggle-btn');
    this.toggleBtn.classList.add(this.filterKey);
    this.toggleBtn.textContent = this.textContent;

    this.checkboxList = filterTemplate.querySelector('.checkbox-list');
    this.checkboxList.classList.add(this.filterKey);

    shadow.appendChild(filterTemplate);
  }

  updateFilterCheckboxes(log) {
    const checkboxLabel = log[this.filterKey];
    if (!this.checkboxes.has(checkboxLabel)) {
      this.checkboxes.add(checkboxLabel);
      this.addNewCheckbox(checkboxLabel);
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

      const filterEvent = new CustomEvent('filter', { detail: filterObject });
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

window.customElements.define('filter-container', FilterContainer);
