import { extPageURL, getAllExtensions } from './ext-listen.js';

export default class ExtensionMonitor {
  logs = [];
  // Map<string, Function>
  extensionMapList = new Map([]);

  async isExtensionPageOpen() {
    const tab = await browser.tabs.query({
      url: extPageURL(),
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

  async startMonitor(extensionId) {
    if (this.extensionMapList.has(extensionId)) {
      throw new Error('Extension is already being monitored');
    }
    const listener = this.logListener();
    this.extensionMapList.set(extensionId, listener);
    browser.activityLog.onExtensionActivity.addListener(listener, extensionId);
  }

  async stopMonitor(extensionId, handler) {
    if (!this.extensionMapList.has(extensionId)) {
      throw new Error('Extension is not being monitored');
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
    return isMonitor
      ? this.startMonitor(extensionId)
      : this.stopMonitor(extensionId);
  }

  getCurrentMonitoredExts() {
    return this.extensionMapList;
  }

  areExtsBeingMonitored() {
    return this.extensionMapList.size > 0;
  }

  async initMonitorAll() {
    if (!this.areExtsBeingMonitored()) {
      const extensions = await getAllExtensions();
      return this.setExtensions(extensions);
    }
    throw new Error('EAM is already running');
  }

  messageHandlers = {
    getMonitorStatus: () => {
      return Promise.resolve({
        status: this.areExtsBeingMonitored(),
      });
    },
    startMonitorAllExts: () => {
      return this.initMonitorAll();
    },
    stopMonitorAllExts: async () => {
      return this.stopMonitorAll();
    },
    sendAllExistingLogs: () => Promise.resolve({ existingLogs: this.logs }),
    default: async () => {
      throw new Error('unexpected message');
    },
  };

  messageListener = (message) => {
    const { requestType } = message;
    return this.messageHandlers[
      requestType in this.messageHandlers ? requestType : 'default'
    ]();
  };

  async init() {
    browser.runtime.onMessage.addListener(this.messageListener);
  }
}
