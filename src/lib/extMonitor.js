export default class extMonitor {
  logs = [];
  extensionMapList = new Map([]);

  async isExtensionPageOpen() {
    const tab = await browser.tabs.query({
      url: browser.runtime.getURL('activitylog/activitylog.html'),
    });
    if (tab.length) return true;
    return false;
  }

  // If the extension page is open, each logs will be send to
  // extension page (as soon as it is encountered), if it is open.
  async sendLogs(details) {
    const isExtPageOpen = await this.isExtensionPageOpen();
    if (isExtPageOpen) {
      browser.runtime.sendMessage({
        updateLogs: details,
      });
    }
  }

  logListener() {
    const listener = (details) => {
      // console.log(details);
      // Everytime a log is encountered,
      // it is being pushed to activityLogs array.
      this.logs.push(details);
      //it checks if the extension page is open so that it can send log
      this.sendLogs(details);
    };
    return listener;
  }

  setExtensions(extensionsArray) {
    extensionsArray.forEach((extension) => {
      this.startMonitor(extension.id);
    });
  }

  startMonitor(extensionId) {
    const listener = this.logListener();
    this.extensionMapList.set(extensionId, listener);
    browser.activityLog.onExtensionActivity.addListener(listener, extensionId);
  }

  stopMonitor(extensionId, handler) {
    let listener = handler;
    if (!listener) {
      listener = this.extensionMapList.get(extensionId);
    }
    browser.activityLog.onExtensionActivity.removeListener(
      listener,
      extensionId
    );
    this.extensionMapList.delete(extensionId);
  }

  stopMonitorAll() {
    this.extensionMapList.forEach((listener, extensionId) => {
      this.stopMonitor(extensionId, listener);
    });
  }

  // On the go modifying an extension's monitoring status
  modifyMonitor(extensionId, isMonitor) {
    isMonitor ? this.startMonitor(extensionId) : this.stopMonitor(extensionId);
  }

  getCurrentMonitoredExts() {
    return this.extensionMapList;
  }

  areExtsBeingMonitored() {
    return this.extensionMapList.size > 0 ? true : false;
  }

  initMonitor(extenssions) {
    if (!this.areExtsBeingMonitored()) {
      this.setExtensions(extenssions);
    }
  }
}
