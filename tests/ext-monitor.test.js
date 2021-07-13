import ExtensionMonitor from '../src/lib/ext-monitor';
import * as ExtListen from '../src/lib/ext-listen.js';

function getExpectedMessage(msgProps) {
  return { requestTo: 'ext-monitor', ...msgProps };
}

test('getAllExtensions should return all extensions but themes and self', async () => {
  const selfExt = { id: 'ext4', type: 'extension' };
  const themeExt = { id: 'ext3', type: 'theme' };
  const expectedExts = [
    { id: 'ext1', type: 'extension' },
    { id: 'ext2', type: 'extension' },
  ];
  const allExts = [...expectedExts, themeExt, selfExt];

  const getAll = jest.fn(() => Promise.resolve(allExts));

  const addListener = jest.fn();

  window.browser = {
    management: { getAll },
    runtime: {
      onMessage: { addListener },
      id: selfExt.id,
      onConnect: { addListener },
    },
    tabs: { onRemoved: { addListener } },
  };

  const extMonitor = new ExtensionMonitor();
  extMonitor.init();

  const extensionsPromise = extMonitor.getAllExtensions();
  await expect(extensionsPromise).resolves.toMatchObject(expectedExts);
});

describe('registering event listeners on start monitoring extensions', () => {
  test('onExtensionActivity listener should be registered on start monitoring extensions', async () => {
    const onExtActivityAddListener = jest.fn();
    const onInstalledAddListener = jest.fn();
    const onUninstalledAddListener = jest.fn();

    const extensions = [{ id: 'ext1' }, { id: 'ext2' }];

    window.browser = {
      activityLog: {
        onExtensionActivity: { addListener: onExtActivityAddListener },
      },
      management: {
        onInstalled: { addListener: onInstalledAddListener },
        onUninstalled: { addListener: onUninstalledAddListener },
      },
    };

    const listeners = [];
    onExtActivityAddListener.mockImplementation((callback) => {
      listeners.push(callback);
    });

    const extMonitor = new ExtensionMonitor();
    const getAllExtensionsFn = jest.spyOn(extMonitor, 'getAllExtensions');
    const onInstalledExtFn = jest.spyOn(extMonitor, 'onInstalledExtension');
    const onUninstalledExtFn = jest.spyOn(extMonitor, 'onUninstalledExtension');

    getAllExtensionsFn.mockImplementation(() => {
      return extensions;
    });

    const startMonitor = extMonitor.messageListener(
      getExpectedMessage({
        requestType: 'startMonitor',
      })
    );

    await expect(startMonitor).resolves.toBeUndefined();

    expect(extMonitor.extensionMapList.size).toBe(2);
    expect(onExtActivityAddListener.mock.calls).toMatchObject([
      [listeners[0], 'ext1'],
      [listeners[1], 'ext2'],
    ]);

    expect(onInstalledAddListener).toHaveBeenCalledWith(onInstalledExtFn);
    expect(onUninstalledAddListener).toHaveBeenCalledWith(onUninstalledExtFn);
  });

  test('trying to start monitoring extensions should throw error while some extensions are already being monitored', async () => {
    const extensions = [{ id: 'ext1' }];
    const expectedRejMsg = 'EAM is already running';

    const extMonitor = new ExtensionMonitor();

    // Having non-empty extensionMapList verifies that somes extensions are being monitored
    extMonitor.extensionMapList.set(
      extensions[0].id,
      extMonitor.createLogListener()
    );

    const initMonitor = extMonitor.messageListener(
      getExpectedMessage({
        requestType: 'startMonitor',
      })
    );

    await expect(initMonitor).rejects.toThrowError(expectedRejMsg);
  });

  test('newly installed extensions should be monitored instantly', async () => {
    const onExtActivityAddListener = jest.fn();
    const onInstalledAddListener = jest.fn();
    const onUninstalledAddListener = jest.fn();

    const selfExt = { id: 'ext1', type: 'extension' };
    const initialMonitoringExts = [
      { id: 'ext2', type: 'extension' },
      { id: 'ext3', type: 'extension' },
    ];
    const newExtension = { id: 'ext4', type: 'extension' };
    const newTheme = { id: 'ext5', type: 'theme' };
    const expectMonitorExtIds = ['ext2', 'ext3', 'ext4'];

    window.browser = {
      activityLog: {
        onExtensionActivity: { addListener: onExtActivityAddListener },
      },
      management: {
        onInstalled: { addListener: onInstalledAddListener },
        onUninstalled: { addListener: onUninstalledAddListener },
      },
      runtime: { id: selfExt.id },
    };

    const extMonitor = new ExtensionMonitor();
    const getAllExtensionsFn = jest.spyOn(extMonitor, 'getAllExtensions');

    getAllExtensionsFn.mockResolvedValue(initialMonitoringExts);

    expect(extMonitor.extensionMapList.size).toBe(0);
    await extMonitor.startMonitor();
    expect(extMonitor.extensionMapList.size).toBe(2);

    // When a new extension is installed, `onInstalledExtension` method is
    // being called with new extension's info.
    extMonitor.onInstalledExtension(newExtension);

    // Since this is a theme, it should not be monitored.
    extMonitor.onInstalledExtension(newTheme);

    const monitoringExtIds = [...extMonitor.extensionMapList.keys()];

    expect(extMonitor.extensionMapList.size).toBe(3);
    expect(monitoringExtIds).toMatchObject(expectMonitorExtIds);
  });
});

test('stop monitoring all extensions should make extensionMapList empty and unregister event listeners', async () => {
  const extensions = [{ id: 'ext1' }, { id: 'ext2' }];
  const onExtActivityRemoveListener = jest.fn();
  const onInstalledRemoveListener = jest.fn();
  const onUninstalledRemoveListener = jest.fn();

  window.browser = {
    activityLog: {
      onExtensionActivity: { removeListener: onExtActivityRemoveListener },
    },
    management: {
      onInstalled: { removeListener: onInstalledRemoveListener },
      onUninstalled: { removeListener: onUninstalledRemoveListener },
    },
  };

  const listeners = [];
  onExtActivityRemoveListener.mockImplementation((callback) => {
    listeners.push(callback);
  });

  const extMonitor = new ExtensionMonitor();
  const onInstalledExtFn = jest.spyOn(extMonitor, 'onInstalledExtension');
  const onUninstalledExtFn = jest.spyOn(extMonitor, 'onUninstalledExtension');

  // Having non-empty extensionMapList verifies that somes extensions are being monitored
  extMonitor.extensionMapList.set(
    extensions[0].id,
    extMonitor.createLogListener()
  );
  extMonitor.extensionMapList.set(
    extensions[1].id,
    extMonitor.createLogListener()
  );

  const stopMonitor = extMonitor.messageListener(
    getExpectedMessage({
      requestType: 'stopMonitor',
    })
  );

  await expect(stopMonitor).resolves.toBeUndefined();

  expect(onExtActivityRemoveListener.mock.calls).toMatchObject([
    [listeners[0], 'ext1'],
    [listeners[1], 'ext2'],
  ]);
  expect(extMonitor.extensionMapList.size).toBe(0);
  // listeners are removed
  expect(onInstalledRemoveListener).toHaveBeenCalledWith(onInstalledExtFn);
  expect(onUninstalledRemoveListener).toHaveBeenCalledWith(onUninstalledExtFn);
});

test('uninstalling a monitored extension should be stopped from being monitored', async () => {
  const removeListener = jest.fn();
  const fakeListener = () => jest.fn();

  const monitoringExts = [
    { id: 'ext1', type: 'extension' },
    { id: 'ext2', type: 'extension' },
    { id: 'ext3', type: 'extension' },
  ];

  const uninstalledExt = { id: 'ext3', type: 'extension' };
  const expectedMonitoringExtIds = ['ext1', 'ext2'];

  window.browser = {
    activityLog: {
      onExtensionActivity: { removeListener },
    },
  };

  const extMonitor = new ExtensionMonitor();

  // When no extensions are being monitored, uninstalling any extension won't
  // affact the extension monitoring status.
  extMonitor.onUninstalledExtension(uninstalledExt);

  // Having non-empty extensionMapList verifies that somes extensions are being monitored
  for (const ext of monitoringExts) {
    extMonitor.extensionMapList.set(ext.id, fakeListener());
  }

  expect(extMonitor.extensionMapList.size).toBe(3);
  // When an existing monitoring extension is uninstalled `onUninstalledExtension` method is being called with the extension's info.
  extMonitor.onUninstalledExtension(uninstalledExt);

  const monitoringExtIds = [...extMonitor.extensionMapList.keys()];

  expect(extMonitor.extensionMapList.size).toBe(2);
  expect(monitoringExtIds).toMatchObject(expectedMonitoringExtIds);
});

test('new logs should be stored in background and send to the activitylog page if it is opened', async () => {
  const log1 = { log: 'log1' };
  const log2 = { log: 'log2' };
  const getURL = jest.fn();
  const sendMessage = jest.fn().mockResolvedValue();
  const query = jest.fn();

  window.browser = {
    runtime: { getURL, sendMessage },
  };

  const extMonitor = new ExtensionMonitor();
  // Extension page is closed on first call but opened on second call
  query.mockResolvedValueOnce({ length: 0 });
  query.mockResolvedValueOnce({ length: 1 });

  // extension page is not open
  const logListener = extMonitor.createLogListener();
  await logListener(log1);

  expect(extMonitor.logs).toMatchObject([log1]);
  // since the activitylog page is not opened, it's not sending the newly listened log
  expect(sendMessage).not.toHaveBeenCalled();

  // activitylog page is opened when activityLogPorts contains port objects from runtime.onConnect API
  const port = { port: 'extension-page-open' };
  extMonitor.activityLogPorts.add(port);

  await logListener(log2);

  // logs stored in the background
  expect(extMonitor.logs).toMatchObject([log1, log2]);
  expect(sendMessage).toHaveBeenCalled();
  expect(sendMessage.mock.calls[0][0]).toMatchObject({
    requestType: 'appendLogs',
    log: log2,
  });
});

describe('messageListeners functionalities tests', () => {
  test('getMonitorStatus method should return the current monitoring status', async () => {
    const extMonitor = new ExtensionMonitor();

    // while no extensions being monitored
    const statusPromiseNeg = extMonitor.messageListener(
      getExpectedMessage({
        requestType: 'getMonitorStatus',
      })
    );

    await expect(statusPromiseNeg).resolves.toMatchObject({ active: false });

    extMonitor.extensionMapList.set('ext1', extMonitor.createLogListener());

    // while extensions are being monitored
    const statusPromisePos = extMonitor.messageListener(
      getExpectedMessage({
        requestType: 'getMonitorStatus',
      })
    );

    await expect(statusPromisePos).resolves.toMatchObject({ active: true });
  });

  test('sendAllLogs method should return all existing logs collected in the background', async () => {
    const extMonitor = new ExtensionMonitor();
    extMonitor.logs = { log: 'ex1' };

    const existingLogsPromise = extMonitor.messageListener(
      getExpectedMessage({
        requestType: 'sendAllLogs',
      })
    );

    await expect(existingLogsPromise).resolves.toMatchObject({
      existingLogs: extMonitor.logs,
    });
  });

  test('messageListener method should throw error when a wrong requestType is found', async () => {
    const extMonitor = new ExtensionMonitor();
    const wrongReqType = 'wrong-request';

    const errorPromise = extMonitor.messageListener(
      getExpectedMessage({
        requestType: wrongReqType,
      })
    );

    await expect(errorPromise).rejects.toThrowError(
      `requestType ${wrongReqType} is not found`
    );
  });

  test('startMonitor method should throw error when any proimse rejects', async () => {
    const extMonitor = new ExtensionMonitor();
    const monitorError = 'start-monitor-error';
    const startMonitorRejectsFn = jest.spyOn(extMonitor, 'startMonitor');

    startMonitorRejectsFn.mockImplementation(() => {
      // throwing an error intentionally
      throw new Error(monitorError);
    });

    const errorPromise = extMonitor.messageListener(
      getExpectedMessage({
        requestType: 'startMonitor',
      })
    );

    await expect(errorPromise).rejects.toThrowError(monitorError);
  });

  test('messageListener method should return undefined if requestTo arg is not "ext-monitor"', () => {
    const extMonitor = new ExtensionMonitor();
    const messageListenerFn = jest.spyOn(extMonitor, 'messageListener');

    extMonitor.messageListener(
      getExpectedMessage({
        requestType: 'startMonitor',
        requestTo: 'abc-monitor',
      })
    );

    expect(messageListenerFn).toHaveReturnedWith(undefined);
  });

  test("loadLogs method should store the logs by newly opened tab's id", async () => {
    const logs = [{ prop: 'log' }];
    const logsFile = JSON.stringify(logs);
    const tabId = 1098;
    const blob = new Blob([logsFile], {
      type: 'application/json',
    });
    Object.assign(blob, { name: 'activitylogs-test.json' });

    const openActivityLogPageFn = jest.spyOn(ExtListen, 'openActivityLogPage');
    const extMonitor = new ExtensionMonitor();

    openActivityLogPageFn.mockResolvedValue({ id: tabId });

    const loadLogsPromise = extMonitor.messageListener(
      getExpectedMessage({
        requestType: 'loadLogs',
        requestParams: { file: blob },
      })
    );

    await expect(loadLogsPromise).resolves.toBeUndefined();
    expect(extMonitor.loadedLogsByTabId.get(tabId)).toMatchObject(logs);
  });

  test('getLoadedLogs method should return logs if logs are found with given tab id otherwise throws error', async () => {
    const loadedLogs = [{ prop: 'log' }];
    const validTabId = 1099;

    const extMonitor = new ExtensionMonitor();

    // Logs available for tabId: 1099
    extMonitor.loadedLogsByTabId.set(validTabId, loadedLogs);

    const getLoadedLogsPromise = extMonitor.messageListener(
      getExpectedMessage({
        requestType: 'getLoadedLogs',
        requestParams: { tabId: validTabId },
      })
    );

    await expect(getLoadedLogsPromise).resolves.toMatchObject(loadedLogs);

    const wrongTabId = 212;
    const getLogsWithWrongTabIdPromise = extMonitor.messageListener(
      getExpectedMessage({
        requestType: 'getLoadedLogs',
        requestParams: { tabId: wrongTabId },
      })
    );

    await expect(getLogsWithWrongTabIdPromise).rejects.toThrowError(
      `No loaded logs found for tab id: ${wrongTabId}`
    );
  });
});

test('WebExtension API event listeners should be registered at initialization', () => {
  const runtimeMessageAddListener = jest.fn();
  const tabsRemovedAddListener = jest.fn();
  const onConnectAddListener = jest.fn();

  window.browser = {
    runtime: {
      onMessage: { addListener: runtimeMessageAddListener },
      onConnect: { addListener: onConnectAddListener },
    },
    tabs: { onRemoved: { addListener: tabsRemovedAddListener } },
  };

  const extMonitor = new ExtensionMonitor();
  const onConnectListenerFn = jest.spyOn(extMonitor, 'onConnectListener');
  const messageListenerFn = jest.spyOn(extMonitor, 'messageListener');
  const onRemovedListenerFn = jest.spyOn(extMonitor, 'onRemovedListener');

  extMonitor.init();
  expect(onConnectAddListener).toHaveBeenCalledWith(onConnectListenerFn);
  expect(runtimeMessageAddListener).toHaveBeenCalledWith(messageListenerFn);
  expect(tabsRemovedAddListener).toHaveBeenCalledWith(onRemovedListenerFn);
});

test('request for clearing logs should make the logs empty', async () => {
  const extMonitor = new ExtensionMonitor();

  extMonitor.logs = [{ log: 'test' }];

  expect(extMonitor.logs).not.toEqual([]);

  await extMonitor.messageListener(
    getExpectedMessage({
      requestType: 'clearLogs',
    })
  );

  expect(extMonitor.logs).toEqual([]);
});

test('saveLogs method should call the download API to save logs', async () => {
  const createObjectURL = jest.fn();
  const revokeObjectURL = jest.fn();
  window.URL = { createObjectURL, revokeObjectURL };

  const download = jest.fn();
  const addListener = jest.fn();
  const removeListener = jest.fn();

  window.browser = {
    downloads: {
      download,
      onChanged: { addListener, removeListener },
    },
  };

  createObjectURL.mockReturnValue('fake-blob-url');

  let listener;
  addListener.mockImplementation((callback) => {
    listener = callback;
  });

  download.mockImplementation(() => {
    const id = 123;
    setTimeout(() => {
      listener({
        state: { current: 'in_progress' },
        id,
      });
      listener({
        state: { current: 'complete' },
        id,
      });
    }, 0);
    return Promise.resolve(id);
  });

  const extMonitor = new ExtensionMonitor();
  const saveLogsFn = jest.spyOn(extMonitor, 'saveLogs');

  const saveLogPromise = extMonitor.messageListener(
    getExpectedMessage({
      requestType: 'saveLogs',
    })
  );

  await expect(saveLogPromise).resolves.toBeUndefined();

  expect(saveLogsFn).toHaveBeenCalled();
  expect(download).toHaveBeenCalledWith({
    url: 'fake-blob-url',
    filename: 'activitylogs.json',
  });

  expect(addListener).toHaveBeenCalled();
  expect(removeListener).toHaveBeenCalled();
  expect(revokeObjectURL).toHaveBeenCalledWith('fake-blob-url');

  saveLogsFn.mockClear();
});

test('saveLogs method should return error message if error is encountered', async () => {
  const createObjectURL = jest.fn();
  const revokeObjectURL = jest.fn();
  window.URL = { createObjectURL, revokeObjectURL };

  const download = jest.fn();
  const addListener = jest.fn();
  const removeListener = jest.fn();

  window.browser = {
    downloads: {
      download,
      onChanged: { addListener, removeListener },
    },
  };

  createObjectURL.mockReturnValue('fake-blob-url');

  let listener;
  addListener.mockImplementation((callback) => {
    listener = callback;
  });

  download.mockImplementation(() => {
    setTimeout(() => {
      listener({
        state: { current: 'interrupted' },
        error: 'save-error',
      });
    }, 0);
    return Promise.resolve(1);
  });

  const extMonitor = new ExtensionMonitor();
  const saveLogsFn = jest.spyOn(extMonitor, 'saveLogs');

  const saveLogPromise = extMonitor.messageListener(
    getExpectedMessage({
      requestType: 'saveLogs',
    })
  );

  await expect(saveLogPromise).rejects.toThrowError('save-error');

  expect(saveLogsFn).toHaveBeenCalled();
  expect(download).toHaveBeenCalledWith({
    url: 'fake-blob-url',
    filename: 'activitylogs.json',
  });
  expect(addListener).toHaveBeenCalled();
  expect(removeListener).toHaveBeenCalled();
  expect(revokeObjectURL).toHaveBeenCalledWith('fake-blob-url');

  saveLogsFn.mockClear();
});

test('onConnectListener should store the port objects of activityLog pages', () => {
  const addListener = jest.fn();
  const wrongNamedPort = {
    portProp: 'test@port',
    name: 'wrong-name',
  };
  const dummyPort = {
    portProp: 'test@port',
    name: 'monitor-realtime-logs',
    onDisconnect: { addListener },
  };

  const extMonitor = new ExtensionMonitor();

  let onDisconnectedCallback;
  addListener.mockImplementation((callback) => {
    onDisconnectedCallback = callback;
  });

  extMonitor.onConnectListener(wrongNamedPort);
  // with wrong port name, it will not be stored
  expect(extMonitor.activityLogPorts.size).toBe(0);

  extMonitor.onConnectListener(dummyPort);
  expect(extMonitor.activityLogPorts.size).toBe(1);
  // When the activitylog page is closed, the port will be removed
  onDisconnectedCallback(dummyPort);
  expect(extMonitor.activityLogPorts.size).toBe(0);
});

test('onRemovedListener should remove loaded logs along with tabId when that tab is closed', () => {
  const loadedLogs = [{ prop: 'test@log' }];
  const tabId = 20;
  const extMonitor = new ExtensionMonitor();

  extMonitor.loadedLogsByTabId.set(tabId, loadedLogs);
  expect(extMonitor.loadedLogsByTabId.size).toBe(1);

  const wrongTabId = 31;
  // If tab id doesn't exist in loadedLogsByTabId Map list, it will do nothing
  extMonitor.onRemovedListener(wrongTabId);
  expect(extMonitor.loadedLogsByTabId.size).toBe(1);

  extMonitor.onRemovedListener(tabId);
  expect(extMonitor.loadedLogsByTabId.size).toBe(0);
});
