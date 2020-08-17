export function getActivityLogPageURL(searchParams) {
  return browser.runtime.getURL(
    `/activitylog/activitylog.html${searchParams ? `?${searchParams}` : ''}`
  );
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

export function timeFormat(timestamp) {
  const date = new Date(timestamp);
  return `${date.toLocaleTimeString()}`;
}

export function dateTimeFormat(timestamp) {
  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  return `${date.getDate()}-${month}-${date.getFullYear()} ${date.toLocaleTimeString()}`;
}
