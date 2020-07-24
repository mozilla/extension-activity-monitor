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
    this.inputBoxListener = this.delay(
      (event) => this.onKeywordSubmit(event.target.inputBox.value),
      500
    );

    this.addEventListener('input', this.inputBoxListener);
  }

  delay(fn, ms) {
    let timer = 0;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(fn.bind(this, ...args), ms || 0);
    };
  }

  onKeywordSubmit(keyword) {
    const filterDetail = {
      filterObject: {
        logKey: 'keyword',
        filterDescriptor: keyword,
      },
    };
    this.dispatchEvent(
      new CustomEvent('filterchange', { detail: filterDetail })
    );
  }

  disconnectedCallback() {
    this.removeEventListener('input', this.inputBoxListener);
  }
}

window.customElements.define('filter-keyword', FilterKeyword);
