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
  await browser.runtime.sendMessage({
    extStartMonitorAllExts: extensions,
  });
  window.close();
}

export async function stopMonitorAll() {
  await browser.runtime.sendMessage({
    extStopMonitorAll: true,
  });
  window.close();
}

export async function viewActivityLogs() {
  browser.tabs.create({
    url: `${browser.runtime.getURL('../activitylog/activitylog.html')}`,
  });
  window.close();
}
