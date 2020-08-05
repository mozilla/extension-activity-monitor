import { getActivityLogPageURL } from './ext-listen.js';

export default class ExtensionMonitor {
  // Map<string, Array>
  loadedLogs = new Map();
  logs = [];
  // Map<string, Function>
  extensionMapList = new Map([]);

  async getAllExtensions() {
    const extensions = await browser.management.getAll();
    const self = await browser.management.getSelf();
    return extensions.filter((extension) => {
      return extension.type === 'extension' && extension.id !== self.id;
    });
  }

  async isActivityLogPageOpen() {
    const tab = await browser.tabs.query({
      url: getActivityLogPageURL(),
    });
    return tab.length > 0;
  }

  // If the Activity Log page is open, each logs will be send to
  // Activity Log page (as soon as it is encountered).
  async sendLogs(details) {
    const isExtPageOpen = await this.isActivityLogPageOpen();
    if (isExtPageOpen) {
      await browser.runtime.sendMessage({
        requestType: 'appendLogs',
        requestTo: 'activity-log',
        log: details,
      });
    }
  }

  createLogListener() {
    return async (details) => {
      this.logs.push(details);
      await this.sendLogs(details);
    };
  }

  hasActivityListeners() {
    return this.extensionMapList.size > 0;
  }

  async startMonitor() {
    if (!this.hasActivityListeners()) {
      const extensions = await this.getAllExtensions();
      extensions.forEach((extension) => {
        const listener = this.createLogListener();
        this.extensionMapList.set(extension.id, listener);
        browser.activityLog.onExtensionActivity.addListener(
          listener,
          extension.id
        );
      });
    } else {
      throw new Error('EAM is already running');
    }
  }

  stopMonitor() {
    this.extensionMapList.forEach((listener, extensionId) => {
      browser.activityLog.onExtensionActivity.removeListener(
        listener,
        extensionId
      );
      this.extensionMapList.delete(extensionId);
    });
  }

  messageHandlers = {
    clearLogs: () => (this.logs = []),
    getMonitorStatus: () => ({ active: this.hasActivityListeners() }),
    startMonitor: () => this.startMonitor(),
    stopMonitor: () => this.stopMonitor(),
    sendAllLogs: () => ({ existingLogs: this.logs }),
    setLoadedLogs: (detail) => this.setLoadedLogs(detail),
    getLoadedLogs: (detail) => this.getLoadedLogs(detail),
  };

  setLoadedLogs({ fileName, logs }) {
    let repeatTimes = 0;
    for (const storedFileName of this.loadedLogs.keys()) {
      if (storedFileName.includes(fileName)) {
        repeatTimes++;
      }
    }

    // if file exists with same name
    if (repeatTimes) {
      fileName = `${fileName}-${repeatTimes}`;
    }

    this.loadedLogs.set(fileName, logs);
    return fileName;
  }

  getLoadedLogs({ fileName }) {
    const logs = this.loadedLogs.get(fileName);
    if (!logs) {
      throw new Error(`The following log file is not found: ${fileName}`);
    }

    return logs;
  }

  messageListener = (message) => {
    const { requestType, requestTo, detail } = message;
    if (requestTo !== 'ext-monitor') {
      return;
    }

    if (requestType in this.messageHandlers) {
      try {
        return Promise.resolve(this.messageHandlers[requestType](detail));
      } catch (error) {
        return Promise.reject(error);
      }
    } else {
      return Promise.reject(
        new Error('requestType ' + requestType + ' is not found')
      );
    }
  };

  onRemovedListener = (tabId) => {
    const url = new URL(this.tabToUrl[tabId]);
    const searchParams = new URLSearchParams(url.search);
    const fileName = searchParams.get('file');

    // When we close any tab which is loaded with logs from a log file.
    if (fileName && this.loadedLogs.has(fileName)) {
      this.loadedLogs.delete(fileName);
    }
  };

  init() {
    this.tabToUrl = {};

    browser.runtime.onMessage.addListener(this.messageListener);
    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.tabToUrl[tabId] = tab.url;
    });
    browser.tabs.onRemoved.addListener(this.onRemovedListener);
  }
}
