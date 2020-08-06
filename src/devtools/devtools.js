const currentTabId = browser.devtools.inspectedWindow.tabId;

browser.devtools.panels
  .create(
    'Extension Activity',
    '/icons/eam-48.png',
    `/activitylog/activitylog.html?filterTabId=${currentTabId}`
  )
  .then((newPanel) => {
    newPanel.onShown.addListener(() => {
      browser.runtime.sendMessage({
        requestTo: 'ext-monitor',
        requestType: 'devToolsPanelShown',
      });
    });
    newPanel.onHidden.addListener(() => {
      browser.runtime.sendMessage({
        requestTo: 'ext-monitor',
        requestType: 'devToolsPanelHidden',
      });
    });
  });
