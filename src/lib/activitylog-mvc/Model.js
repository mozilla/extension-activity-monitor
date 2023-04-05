export default class Model {
  constructor() {
    this.logs = [];
    this.filter = {
      id: { exclude: new Set() },
      viewType: { exclude: new Set() },
      type: { exclude: new Set() },
      name: { exclude: new Set() },
      tabId: null,
      keyword: '',
      timeStamp: null,
    };
  }

  addNewLogs(logs) {
    this.logs.push(...logs);
  }

  /**
   * @param {object} updateFilter - It contains key and value to replace
   * the filter.
   * @param {Set<string>} [updateFilter.id] - It contains the extension ids.
   * @param {Set<string|undefined>} [updateFilter.viewType] - It contains view
   * types that include background, popup, sidebar, tab, devtools_page,
   * devtools_panel. It is undefined when [updateFilter.type] is content_script.
   * @param {Set<string>} [updateFilter.type] - It contains api types that
   * includes api_call, api_event, content_script, user_script.
   * @param {Set<string>} [updateFilter.name] - It contains API names only.
   * @param {string} [updateFilter.keyword]
   * @param {null|object} [updateFilter.timeStamp] - It is null when timestamp
   * filter is not applied.
   * @param {number} [updateFilter.timeStamp.start]
   * @param {number} [updateFilter.timeStamp.stop]
   * @param {null|number} [updateFilter.tabId] - It's null when search paramter
   * `tabId` is not used.
   */
  setFilter(updateFilter) {
    Object.assign(this.filter, updateFilter);
  }

  matchLogWithFilterObj(log) {
    return (
      this.matchFilterId(log.id) &&
      this.matchFilterViewType(log) &&
      this.matchFilterType(log.type) &&
      this.matchFilterApiName(log) &&
      this.matchFilterKeyword(log.data) &&
      this.matchFilterTimestamp(log.timeStamp) &&
      this.matchFilterTabId(log.data)
    );
  }

  matchFilterId(id) {
    return !this.filter.id.exclude.has(id);
  }

  matchFilterViewType({ type, viewType }) {
    if (type === 'content_script') {
      // viewtype is undefined when log.type = content_script. We don't store
      // undefined in viewType Set. Hence, we don't filter here.
      return true;
    }
    return !this.filter.viewType.exclude.has(viewType);
  }

  matchFilterType(type) {
    return !this.filter.type.exclude.has(type);
  }

  matchFilterApiName({ name, type }) {
    if (type === 'content_script') {
      // name is a content script url when log.type = content_script. We don't
      // store content script urls in API name Set. Hence, we don't filter here.
      return true;
    }
    return !this.filter.name.exclude.has(name);
  }

  matchFilterKeyword(data) {
    const logDataStr = JSON.stringify(data);
    return logDataStr.includes(this.filter.keyword);
  }

  matchFilterTimestamp(logTimestamp) {
    if (!this.filter.timeStamp) {
      return true;
    }

    const startTime = this.filter.timeStamp?.start;
    const stopTime = this.filter.timeStamp?.stop;

    if (logTimestamp < startTime || logTimestamp > stopTime) {
      return false;
    }

    return true;
  }

  matchFilterTabId({ tabId }) {
    if (this.filter.tabId == null) {
      return true;
    }

    return this.filter.tabId === tabId;
  }

  clearLogs() {
    this.logs = [];
  }
}
