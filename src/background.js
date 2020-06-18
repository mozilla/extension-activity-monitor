import { extensionMonitor } from './lib/extMonitor.js';

function messageHandler(message, sender, sendResponse) {
  const {
    extStartMonitorAll,
    extStopMonitorAll,
    sendAllExistingLogs,
    getMonitoringStatus,
  } = message;

  if (getMonitoringStatus) {
    sendResponse({
      status: extensionMonitor.areExtsBeingMonitored(),
    });
  }

  if (Array.isArray(extStartMonitorAll)) {
    extensionMonitor.initMonitor(extStartMonitorAll);
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
