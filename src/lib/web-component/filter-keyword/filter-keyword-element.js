export class FilterKeyword extends HTMLElement {
  constructor() {
    super();

    const shadow = this.attachShadow({ mode: 'open' });
    const filterContainer = document
      .querySelector('#filterKeywordTemplate')
      .content.cloneNode(true);

    this.inputBox = filterContainer.querySelector('input[name="keyword"]');

    this.timer = 0;
    this.inputBoxListener = (event) => {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        const filterDetail = {
          updateFilter: { keyword: event.target.inputBox.value },
        };

        this.dispatchEvent(
          new CustomEvent('filterchange', { detail: filterDetail })
        );
      }, 500);
    };

    shadow.appendChild(filterContainer);
  }

  connectedCallback() {
    this.addEventListener('input', this.inputBoxListener);
  }

  disconnectedCallback() {
    clearTimeout(this.timer);
    this.removeEventListener('input', this.inputBoxListener);
  }
}

window.customElements.define('filter-keyword', FilterKeyword);
