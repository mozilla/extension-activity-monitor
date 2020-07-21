class filterKeyword extends HTMLElement {
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
    this.inputBox.addEventListener(
      'input',
      this.delay(
        (event) => this.onKeywordSubmit(event.originalTarget.value),
        500
      )
    );
  }

  delay(fn, ms) {
    let timer = 0;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(fn.bind(this, ...args), ms || 0);
    };
  }

  onKeywordSubmit(keyword) {
    this.dispatchEvent(new CustomEvent('keywordchange', { detail: keyword }));
  }
}

window.customElements.define('filter-keyword', filterKeyword);
