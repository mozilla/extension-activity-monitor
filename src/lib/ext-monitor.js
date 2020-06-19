export default class ExtensionMonitor {
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
      await browser.runtime.sendMessage({
        updateLogs: details,
      });
    }
  }

  logListener() {
    const listener = async (details) => {
      // Everytime a log is encountered,
      // it is being pushed to logs array.
      this.logs.push(details);
      //it checks if the extension page is open so that it can send log
      await this.sendLogs(details);
    };
    return listener;
  }

  setExtensions(extensionsArray) {
    extensionsArray.forEach((extension) => {
      this.startMonitor(extension.id);
    });
    return Promise.resolve('ext-monitor-started');
  }

  startMonitor(extensionId) {
    if (this.extensionMapList.has(extensionId)) {
      return;
    }
    const listener = this.logListener();
    this.extensionMapList.set(extensionId, listener);
    browser.activityLog.onExtensionActivity.addListener(listener, extensionId);
  }

  stopMonitor(extensionId, handler) {
    if (!this.extensionMapList.has(extensionId)) {
      return;
    }
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
    return Promise.resolve('ext-monitor-stopped');
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

  initMonitor(extensions) {
    if (!this.areExtsBeingMonitored()) {
      return this.setExtensions(extensions);
    }
    return Promise.reject(new Error('ext-monitor-init-failed'));
  }
}
