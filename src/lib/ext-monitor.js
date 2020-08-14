import { getActivityLogPageURL } from './ext-listen.js';
import { load } from './save-load.js';

export default class ExtensionMonitor {
  // Map<number, Array>
  loadedLogsByTabId = new Map();
  logs = [];
  // Map<string, Function>
  extensionMapList = new Map([]);

  // Set<number>
  devToolsPanelTabIds = new Set();

  async getAllExtensions() {
    const extensions = await browser.management.getAll();
    return extensions.filter((extension) => {
      return (
        extension.type === 'extension' && extension.id !== browser.runtime.id
      );
    });
  }

  async isActivityLogPageOpen() {
    const activitylogPage = getActivityLogPageURL();
    const tab = await browser.tabs.query({
      url: [activitylogPage, `${activitylogPage}?filterTabId=*`],
    });

    return tab.length > 0;
  }

  // If the Activity Log page is open, each logs will be send to
  // Activity Log page (as soon as it is encountered).
  async sendLogs(details) {
    const isExtPageOpen = await this.isActivityLogPageOpen();
    if (isExtPageOpen || this.devToolsPanelTabIds.size) {
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
    addPanelTabId: ({ tabId }) => this.devToolsPanelTabIds.add(tabId),
    deletePanelTabId: ({ tabId }) => this.devToolsPanelTabIds.delete(tabId),
    saveLogs: (requestParams) => this.saveLogs(requestParams),
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

  async saveLogs({ blob, filename }) {
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
        filename,
      });
      return await downloadDonePromise;
    } finally {
      URL.revokeObjectURL(url);
      browser.downloads.onChanged.removeListener(listener);
    }
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
