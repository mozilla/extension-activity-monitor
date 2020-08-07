import { getActivityLogPageURL } from './ext-listen.js';
import { load } from './save-load.js';

export default class ExtensionMonitor {
  // Map<number, Array>
  loadedLogsByTabId = new Map();
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
    loadLogs: (requestParams) => this.loadLogs(requestParams),
    getLoadedLogs: (requestParams) => this.getLoadedLogs(requestParams),
  };

  async loadLogs({ file }) {
    const loadedLogs = await load.loadLogAsJSON(file);

    const searchParams = `file=${file.name}`;
    const tab = await browser.tabs.create({
      url: getActivityLogPageURL(searchParams),
    });

    this.loadedLogsByTabId.set(tab.id, loadedLogs);
  }

  getLoadedLogs({ tabId }) {
    const logs = this.loadedLogsByTabId.get(tabId);
    if (!logs) {
      throw new Error(`No loaded logs found for tab id: ${tabId}`);
    }
    return logs;
  }

  messageListener = (message) => {
    const { requestType, requestTo, requestParams } = message;
    if (requestTo !== 'ext-monitor') {
      return;
    }

    if (requestType in this.messageHandlers) {
      try {
        return Promise.resolve(
          this.messageHandlers[requestType](requestParams)
        );
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
    // Remove the loaded logs related to the closed tab
    if (this.loadedLogsByTabId.has(tabId)) {
      this.loadedLogsByTabId.delete(tabId);
    }
  };

  init() {
    browser.runtime.onMessage.addListener(this.messageListener);
    browser.tabs.onRemoved.addListener(this.onRemovedListener);
  }
}
