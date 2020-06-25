export function getActivityLogPageURL() {
  return browser.runtime.getURL('/activitylog/activitylog.html');
}

export async function getMonitorStatus() {
  const { active } = await browser.runtime.sendMessage({
    requestType: 'getMonitorStatus',
  });
  return active;
}

export function startMonitor() {
  return browser.runtime.sendMessage({
    requestType: 'startMonitor',
  });
}

export function stopMonitor() {
  return browser.runtime.sendMessage({
    requestType: 'stopMonitor',
  });
}

export function openActivityLogPage() {
  browser.tabs.create({
    url: getActivityLogPageURL(),
  });
}
