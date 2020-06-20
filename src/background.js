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
    return extensionMonitor
      .initMonitor(extStartMonitorAllExts)
      .then((monitorMsg) => monitorMsg);
  }

  if (extStopMonitorAll) {
    return extensionMonitor.stopMonitorAll().then((monitorMsg) => monitorMsg);
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
