const tabId = browser.devtools.inspectedWindow.tabId;

browser.devtools.panels.create(
  'Extension Activity',
  '/icons/eam-48.png',
  `/activitylog/activitylog.html?tabId=${tabId}`
);
