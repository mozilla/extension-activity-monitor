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

export function dateTimeFormat(timestamp, options) {
  const dateTime = new Date(timestamp);
  const time = dateTime.toLocaleTimeString();

  if (options?.timeOnly) {
    return time;
  }

  const dateFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  const date = new Intl.DateTimeFormat(undefined, dateFormatOptions).format(
    dateTime
  );

  return `${date} ${time}`;
}
