export async function getAllExtensions() {
  const extensions = await browser.management.getAll();
  return extensions.filter((extension) => extension.type !== 'theme');
}

export async function areExtsBeingMonitored() {
  const { status } = await browser.runtime.sendMessage({
    getMonitoringStatus: true,
  });
  return status;
}

export async function initMonitorAll(extensions) {
  return await browser.runtime.sendMessage({
    extStartMonitorAllExts: extensions,
  });
}

export async function stopMonitorAll() {
  return await browser.runtime.sendMessage({
    extStopMonitorAll: true,
  });
}

export function viewActivityLogs() {
  browser.tabs.create({
    url: `${browser.runtime.getURL('../activitylog/activitylog.html')}`,
  });
}
