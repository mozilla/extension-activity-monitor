export function getActivityLogPageURL() {
  return browser.runtime.getURL('/activitylog/activitylog.html');
}

export async function getMonitorStatus() {
  const { active } = await browser.runtime.sendMessage({
    requestType: 'getMonitorStatus',
    requestTo: 'ext-monitor',
  });
  return active;
}

export function startMonitor() {
  return browser.runtime.sendMessage({
    requestType: 'startMonitor',
    requestTo: 'ext-monitor',
  });
}

export function stopMonitor() {
  return browser.runtime.sendMessage({
    requestType: 'stopMonitor',
    requestTo: 'ext-monitor',
  });
}

export function openActivityLogPage() {
  browser.tabs.create({
    url: getActivityLogPageURL(),
  });
}
