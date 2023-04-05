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

export async function openActivityLogPage(searchParams) {
  const url = browser.runtime.getURL(
    `/activitylog/activitylog.html${searchParams ? `?${searchParams}` : ''}`
  );

  const tab = await browser.tabs.create({ url });

  return tab;
}
