import { getActivityLogPageURL, getAllExtensions } from './ext-listen.js';

export default class ExtensionMonitor {
  logs = [];
  // Map<string, Function>
  extensionMapList = new Map([]);

  async isExtensionPageOpen() {
    const tab = await browser.tabs.query({
      url: getActivityLogPageURL(),
    });
    return tab.length > 0;
  }
  // If the extension page is open, each logs will be send to
  // extension page (as soon as it is encountered), if it is open.
  async sendLogs(details) {
    const isExtPageOpen = await this.isExtensionPageOpen();
    if (isExtPageOpen) {
      await browser.runtime.sendMessage({
        requestType: 'appendLogs',
        logs: details,
      });
    }
  }

  createLogListener() {
    return async (details) => {
      this.logs.push(details);
      //it checks if the extension page is open so that it can send log
      await this.sendLogs(details);
    };
  }

  hasActivityListeners() {
    return this.extensionMapList.size > 0;
  }

  async startMonitor() {
    if (!this.hasActivityListeners()) {
      const extensions = await getAllExtensions();
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
      return Promise.resolve({
        active: this.hasActivityListeners(),
      });
    },
    startMonitor: () => {
      return this.startMonitor();
    },
    stopMonitor: () => {
      return this.stopMonitor();
    },
    sendAllLogs: () => {
      return Promise.resolve({
        existingLogs: this.logs,
      });
    },
  };

  messageListener = (message) => {
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
