export default class LogItemView extends HTMLElement {
  constructor(log) {
    super();

    const shadow = this.attachShadow({ mode: 'open' });
    this._log = log;

    const newRow = document.createElement('tr');
    newRow.insertCell(0).textContent = log.id;
    newRow.insertCell(1).textContent = log.timeStamp;
    newRow.insertCell(2).textContent = log.type;
    newRow.insertCell(3).textContent = log.name;
    newRow.insertCell(4).textContent = log.viewType || 'undefined';

    const linkElement = document.createElement('link');
    linkElement.setAttribute('rel', 'stylesheet');
    linkElement.setAttribute(
      'href',
      '/lib/web-component/log-item-view/log-item-view.css'
    );

    shadow.appendChild(linkElement);
    shadow.appendChild(newRow);
  }
}

window.customElements.define('log-item-view', LogItemView);
