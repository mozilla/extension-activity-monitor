import ExtensionMonitor from './lib/ext-monitor.js';

const extensionMonitor = new ExtensionMonitor();

function messageHandler(message, sender, sendResponse) {
  const {
    extStartMonitorAllExts,
    extStopMonitorAll,
    sendAllExistingLogs,
    getMonitoringStatus,
  } = message;

  if (getMonitoringStatus) {
    sendResponse({
      status: extensionMonitor.areExtsBeingMonitored(),
    });
  }

  if (Array.isArray(extStartMonitorAllExts)) {
    extensionMonitor.initMonitor(extStartMonitorAllExts);
  }

  if (extStopMonitorAll) {
    extensionMonitor.stopMonitorAll();
  }

  // This is send all existing logs to activitylogs page
  // once activitylogs page is initialized
  if (sendAllExistingLogs) {
    sendResponse({
      existingLogs: extensionMonitor.logs,
    });
  }
}

browser.runtime.onMessage.addListener(messageHandler);
