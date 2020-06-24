export function extPageURL() {
  return browser.runtime.getURL('/activitylog/activitylog.html');
}

export async function getAllExtensions() {
  const extensions = await browser.management.getAll();
  const eam = await browser.management.getSelf();
  return extensions.filter((extension) => {
    return extension.type === 'extension' && extension.id !== eam.id;
  });
}

export async function areExtsBeingMonitored() {
  const { status } = await browser.runtime.sendMessage({
    requestType: 'getMonitorStatus',
  });
  return status;
}

export async function startMonitorAll() {
  return await browser.runtime.sendMessage({
    requestType: 'startMonitorAllExts',
  });
}

export async function stopMonitorAll() {
  return await browser.runtime.sendMessage({
    requestType: 'stopMonitorAllExts',
  });
}

export function viewActivityLogs() {
  browser.tabs.create({
    url: extPageURL(),
  });
}
