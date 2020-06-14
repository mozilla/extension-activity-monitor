const activityLogs = [];

const extensionMonitor = {
  extensionMapList: new Map([]),
  isMonitorRunning: false,

  async isExtensionPageOpen() {
    const tab = await browser.tabs.query({
      url: ['moz-extension://*/activitylog/activitylog.html'],
    });
    if (tab.length) return true;
    return false;
  },

  // If the extension page is open, each logs will be send to
  // extension page (as soon as it is encountered), if it is open.
  async sendLogs(details) {
    const isExtPageOpen = await this.isExtensionPageOpen();
    if (isExtPageOpen) {
      browser.runtime.sendMessage({
        eam_updateLogs: details,
      });
    }
  },

  logListener() {
    const detailFunc = (details) => {
      console.log(details);
      // Everytime a log is encountered,
      // it is being pushed to activityLogs array.
      activityLogs.push(details);
      //it checks if the extension page is open so that it can send log
      this.sendLogs(details);
    };
    return detailFunc;
  },

  setExtensions(extensionsArray) {
    extensionsArray.forEach((extension) => {
      this.extensionMapList.set(extension.id, this.logListener());
    });
    this.startMonitorAll();
  },

  startMonitorAll() {
    this.isMonitorRunning = true;
    this.extensionMapList.forEach((listener, extensionId) => {
      browser.activityLog.onExtensionActivity.addListener(
        listener,
        extensionId
      );
    });
  },

  stopMonitorAll() {
    this.extensionMapList.forEach((listener, extensionId) => {
      browser.activityLog.onExtensionActivity.removeListener(
        listener,
        extensionId
      );
    });
    this.isMonitorRunning = false;
  },

  startMonitor(extensionId, listener) {
    const status = this.hasListener(extensionId, listener);
    if (!status) {
      browser.activityLog.onExtensionActivity.addListener(
        listener,
        extensionId
      );
    }
  },

  stopMonitor(extensionId, listener) {
    const status = this.hasListener(extensionId, listener);
    if (status) {
      browser.activityLog.onExtensionActivity.removeListener(
        listener,
        extensionId
      );
    }
  },

  // On the go modifying an extension's monitoring status
  modifyMonitor(extensionId, modify) {
    const listener = this.extensionMapList.get(extensionId);
    if (modify === 0) {
      this.startMonitor(extensionId, listener);
    } else if (modify === 1) {
      this.stopMonitor(extensionId, listener);
    }
  },

  // activitylog/popup may need it.
  // It will send the current monitoring status
  // of all extensions along with extension id.
  extsCurrentMonitoringStatus() {
    const extensions = new Map([]);
    this.extensionMapList.forEach((listener, extensionId) => {
      const status = extensions.set(extensionId, status);
    });
    return extensions;
  },

  initMonitor(extenssions) {
    if (!this.isMonitorRunning) {
      this.setExtensions(extenssions);
    }
  },

  areExtsBeingMonitored() {
    this.isMonitorRunning = false;
    for (const [extensionId, listener] of this.extensionMapList) {
      const status = this.hasListener(extensionId, listener);
      if (status) {
        this.isMonitorRunning = true;
        break;
      }
    }
    return this.isMonitorRunning;
  },

  hasListener(extensionId, listener) {
    return browser.activityLog.onExtensionActivity.hasListener(
      listener,
      extensionId
    );
  },
};

function messageHandler(message, sender, sendResponse) {
  const {
    extStartMonitorAll,
    extStopMonitorAll,
    sendAllExistingLogs,
    getMonitoringStatus,
  } = message;

  if (getMonitoringStatus) {
    sendResponse({
      status: extensionMonitor.areExtsBeingMonitored(),
    });
  }

  if (Array.isArray(extStartMonitorAll)) {
    extensionMonitor.initMonitor(extStartMonitorAll);
  }

  if (extStopMonitorAll) {
    extensionMonitor.stopMonitorAll();
  }

  // This is send all existing logs to activitylogs page
  // once activitylogs page is initialized
  if (sendAllExistingLogs) {
    sendResponse({
      existingLogs: activityLogs,
    });
  }
}

browser.runtime.onMessage.addListener(messageHandler);
