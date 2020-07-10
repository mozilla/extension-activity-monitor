export default class LogItemView extends HTMLDivElement {
  constructor(log) {
    super();
    this._log = log;

    const shadow = this.attachShadow({ mode: 'open' });

    const id = document.createElement('div');
    id.textContent = log.id;
    const timeStamp = document.createElement('div');
    timeStamp.textContent = log.timeStamp;
    const type = document.createElement('div');
    type.textContent = log.type;
    const name = document.createElement('div');
    name.textContent = log.name;
    const viewType = document.createElement('div');
    viewType.textContent = log.viewType || 'undefined';

    const linkElement = document.createElement('link');
    linkElement.setAttribute('rel', 'stylesheet');
    linkElement.setAttribute(
      'href',
      '/lib/web-component/log-item-view/log-item-view.css'
    );

    shadow.appendChild(linkElement);
    shadow.appendChild(id);
    shadow.appendChild(timeStamp);
    shadow.appendChild(type);
    shadow.appendChild(name);
    shadow.appendChild(viewType);
  }
}

window.customElements.define('log-item-view', LogItemView, { extends: 'div' });
