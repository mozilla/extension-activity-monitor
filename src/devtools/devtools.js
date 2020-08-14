const tabId = browser.devtools.inspectedWindow.tabId;

browser.devtools.panels
  .create(
    'Extension Activity',
    '/icons/eam-48.png',
    `/activitylog/activitylog.html?filterTabId=${tabId}`
  )
  .then((newPanel) => {
    newPanel.onShown.addListener(() => {
      browser.runtime.sendMessage({
        requestTo: 'ext-monitor',
        requestType: 'addPanelTabId',
        requestParams: { tabId },
      });
    });
    newPanel.onHidden.addListener(() => {
      browser.runtime.sendMessage({
        requestTo: 'ext-monitor',
        requestType: 'deletePanelTabId',
        requestParams: { tabId },
      });
    });
  });
