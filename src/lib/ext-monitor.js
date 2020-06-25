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
      return new Promise((resolve) => {
        extensions.forEach((extension) => {
          const listener = this.createLogListener();
          this.extensionMapList.set(extension.id, listener);
          browser.activityLog.onExtensionActivity.addListener(
            listener,
            extension.id
          );
        });
        resolve(true);
      });
    } else {
      throw new Error('EAM is already running');
    }
  }

  async stopMonitor() {
    return new Promise((resolve) => {
      this.extensionMapList.forEach((listener, extensionId) => {
        browser.activityLog.onExtensionActivity.removeListener(
          listener,
          extensionId
        );
        this.extensionMapList.delete(extensionId);
      });
      resolve(true);
    });
  }

  messageHandlers = {
    getMonitorStatus: () => {
      return {
        active: this.hasActivityListeners(),
      };
    },
    startMonitor: () => {
      return this.startMonitor();
    },
    stopMonitor: () => {
      return this.stopMonitor();
    },
    sendAllLogs: () => {
      return {
        existingLogs: this.logs,
      };
    },
  };

  messageListener = async (message) => {
    const { requestType } = message;

    if (requestType in this.messageHandlers) {
      return this.messageHandlers[requestType]();
    } else {
      throw new Error('requestType ' + requestType + ' is not found');
    }
  };

  init() {
    browser.runtime.onMessage.addListener(this.messageListener);
  }
}
