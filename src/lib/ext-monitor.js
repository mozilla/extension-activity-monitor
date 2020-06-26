import { getActivityLogPageURL } from './ext-listen.js';

export default class ExtensionMonitor {
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
    getMonitorStatus: () => ({ active: this.hasActivityListeners() }),
    startMonitor: () => this.startMonitor(),
    stopMonitor: () => this.stopMonitor(),
    sendAllLogs: () => ({ existingLogs: this.logs }),
  };

  messageListener = (message) => {
    const { requestType, requestTo } = message;
    if (requestTo !== 'ext-monitor') {
      return;
    }

    if (requestType in this.messageHandlers) {
      try {
        return Promise.resolve(this.messageHandlers[requestType]());
      } catch (error) {
        return Promise.reject(error);
      }
    } else {
      return Promise.reject(
        new Error('requestType ' + requestType + ' is not found')
      );
    }
  };

  init() {
    browser.runtime.onMessage.addListener(this.messageListener);
  }
}
