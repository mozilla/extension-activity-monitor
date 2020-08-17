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
  const dateTime = new Date(timestamp);
  return `${dateTime.toLocaleTimeString()}`;
}

export function dateTimeFormat(timestamp) {
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  const dateTime = new Date(timestamp);
  const formattedDate = new Intl.DateTimeFormat(undefined, options).format(
    dateTime
  );

  return `${formattedDate} ${dateTime.toLocaleTimeString()}`;
}
