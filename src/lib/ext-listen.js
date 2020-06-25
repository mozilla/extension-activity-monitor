export function getActivityLogPageURL() {
  return browser.runtime.getURL('/activitylog/activitylog.html');
}

export async function getAllExtensions() {
  const extensions = await browser.management.getAll();
  const self = await browser.management.getSelf();
  return extensions.filter((extension) => {
    return extension.type === 'extension' && extension.id !== self.id;
  });
}

export async function getMonitorStatus() {
  const { active } = await browser.runtime.sendMessage({
    requestType: 'getMonitorStatus',
  });
  return active;
}

export async function startMonitor() {
  return await browser.runtime.sendMessage({
    requestType: 'startMonitor',
  });
}

export async function stopMonitor() {
  return await browser.runtime.sendMessage({
    requestType: 'stopMonitor',
  });
}

export function openActivityLogPage() {
  browser.tabs.create({
    url: getActivityLogPageURL(),
  });
}
