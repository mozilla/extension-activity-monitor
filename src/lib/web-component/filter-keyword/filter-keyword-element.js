export class FilterKeyword extends HTMLElement {
  constructor() {
    super();

    const shadow = this.attachShadow({ mode: 'open' });
    const filterContainer = document
      .querySelector('#filterKeywordTemplate')
      .content.cloneNode(true);

    this.inputBox = filterContainer.querySelector('input[name="keyword"]');

    shadow.appendChild(filterContainer);
  }

  connectedCallback() {
    let timer = 0;
    this.inputBoxListener = (event) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        this.onKeywordSubmit(event.target.inputBox.value);
      }, 500);
    };

    this.addEventListener('input', this.inputBoxListener);
  }

  onKeywordSubmit(keyword) {
    const filterDetail = { updateFilterProps: { keyword } };
    this.dispatchEvent(
      new CustomEvent('filterchange', { detail: filterDetail })
    );
  }

  disconnectedCallback() {
    this.removeEventListener('input', this.inputBoxListener);
  }
}

window.customElements.define('filter-keyword', FilterKeyword);
