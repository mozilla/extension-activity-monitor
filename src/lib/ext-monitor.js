import { openActivityLogPage } from './ext-listen.js';
import { load } from './save-load.js';

export default class ExtensionMonitor {
  // Map<number, Array>
  loadedLogsByTabId = new Map();
  logs = [];
  // Map<string, Function>
  extensionMapList = new Map([]);

  // Set<Port: Object>
  activityLogPorts = new Set();

  async getAllExtensions() {
    const extensions = await browser.management.getAll();
    return extensions.filter((extension) => {
      return (
        extension.type === 'extension' && extension.id !== browser.runtime.id
      );
    });
  }

  // If the Activity Log page is open, each logs will be send to
  // Activity Log page (as soon as it is encountered).
  async sendLogs(details) {
    if (this.activityLogPorts.size) {
      await browser.runtime.sendMessage({
        requestType: 'appendLogs',
        requestTo: 'activity-log',
        log: details,
      });
    }
  }

  createLogListener() {
    return async (details) => {
      // set a timestamp(number) as the value of timeStamp property
      // TODO: Stop using `Date.parse` when `details.timeStamp` is a numeric timestamp.
      // See https://bugzilla.mozilla.org/show_bug.cgi?id=1660460
      details.timeStamp = Date.parse(details.timeStamp);

      this.logs.push(details);
      await this.sendLogs(details);
    };
  }

  async startMonitor() {
    if (this.hasActivityListeners()) {
      throw new Error('EAM is already running');
    }

    const extensions = await this.getAllExtensions();
    extensions.forEach((extension) => {
      this.addMonitorListener(extension.id);
    });

    browser.management.onInstalled.addListener(this.onInstalledExtension);
    browser.management.onUninstalled.addListener(this.onUninstalledExtension);
  }

  hasActivityListeners() {
    return this.extensionMapList.size > 0;
  }

  addMonitorListener(extensionId) {
    const listener = this.createLogListener();
    this.extensionMapList.set(extensionId, listener);
    browser.activityLog.onExtensionActivity.addListener(listener, extensionId);
  }

  stopMonitor() {
    this.extensionMapList.forEach((listener, extensionId) => {
      this.removeMonitorListener(extensionId, listener);
    });

    browser.management.onInstalled.removeListener(this.onInstalledExtension);
    browser.management.onUninstalled.removeListener(
      this.onUninstalledExtension
    );
  }

  removeMonitorListener(extensionId, listener) {
    browser.activityLog.onExtensionActivity.removeListener(
      listener,
      extensionId
    );
    this.extensionMapList.delete(extensionId);
  }

  onInstalledExtension = ({ id, type }) => {
    if (type !== 'extension' || id === browser.runtime.id) {
      return;
    }

    this.addMonitorListener(id);
  };

  onUninstalledExtension = ({ id }) => {
    if (this.extensionMapList.has(id)) {
      const listener = this.extensionMapList.get(id);
      this.removeMonitorListener(id, listener);
    }
  };

  messageHandlers = {
    clearLogs: () => (this.logs = []),
    getMonitorStatus: () => ({ active: this.hasActivityListeners() }),
    startMonitor: () => this.startMonitor(),
    stopMonitor: () => this.stopMonitor(),
    sendAllLogs: () => ({ existingLogs: this.logs }),
    loadLogs: (requestParams) => this.loadLogs(requestParams),
    getLoadedLogs: (requestParams) => this.getLoadedLogs(requestParams),
    saveLogs: () => this.saveLogs(),
  };

  async loadLogs({ file }) {
    const loadedLogs = await load.loadLogAsJSON(file);

    const searchParams = `file=${file.name}`;
    const tab = await openActivityLogPage(searchParams);

    this.loadedLogsByTabId.set(tab.id, loadedLogs);
  }

  getLoadedLogs({ tabId }) {
    const logs = this.loadedLogsByTabId.get(tabId);
    if (!logs) {
      throw new Error(`No loaded logs found for tab id: ${tabId}`);
    }
    return logs;
  }

  async saveLogs() {
    const blob = new Blob([JSON.stringify(this.logs)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    let downloadId = null;
    let listener;

    const downloadDonePromise = new Promise((resolve, reject) => {
      listener = (result) => {
        if (result.state.current === 'complete' && result.id === downloadId) {
          resolve();
        }
        if (result.error) {
          reject(new Error(result.error));
        }
      };

      browser.downloads.onChanged.addListener(listener);
    });

    try {
      downloadId = await browser.downloads.download({
        url,
        filename: 'activitylogs.json',
      });
      return await downloadDonePromise;
    } finally {
      URL.revokeObjectURL(url);
      browser.downloads.onChanged.removeListener(listener);
    }
  }

  onConnectListener = (port) => {
    if (port.name !== 'monitor-realtime-logs') {
      return;
    }

    this.activityLogPorts.add(port);
    port.onDisconnect.addListener((port) => {
      this.activityLogPorts.delete(port);
    });
  };

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
    browser.runtime.onConnect.addListener(this.onConnectListener);
    browser.runtime.onMessage.addListener(this.messageListener);
    browser.tabs.onRemoved.addListener(this.onRemovedListener);
  }
}
