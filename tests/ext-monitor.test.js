import ExtensionMonitor from '../src/lib/ext-monitor';
import * as ExtListen from '../src/lib/ext-listen.js';

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

describe('start extension monitoring and register event listeners', () => {
  test('while no extensions are being monitoring', async () => {
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

    const startMonitor = extMonitor.messageListener({
      requestType: 'startMonitor',
      requestTo: 'ext-monitor',
    });
    await expect(startMonitor).resolves.toBeUndefined();

    expect(extMonitor.extensionMapList.size).toBe(2);
    expect(onExtActivityAddListener.mock.calls).toMatchObject([
      [listeners[0], 'ext1'],
      [listeners[1], 'ext2'],
    ]);

    expect(onInstalledAddListener).toHaveBeenCalledWith(onInstalledExtFn);
    expect(onUninstalledAddListener).toHaveBeenCalledWith(onUninstalledExtFn);
  });

  test('throws error while extensions are already being monitored', async () => {
    const extensions = [{ id: 'ext1' }];

    const extMonitor = new ExtensionMonitor();

    // Having non-empty extensionMapList verfies that
    // there are extensions being monitored
    extMonitor.extensionMapList.set(
      extensions[0].id,
      extMonitor.createLogListener()
    );

    const initMonitorFail = extMonitor.messageListener({
      requestType: 'startMonitor',
      requestTo: 'ext-monitor',
    });
    await expect(initMonitorFail).rejects.toThrowError(
      'EAM is already running'
    );
  });

  test('start monitoring newly installed extensions automatically', async () => {
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

    let monitoringExtIds = [];
    for (const extId of extMonitor.extensionMapList.keys()) {
      monitoringExtIds.push(extId);
    }

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

  extMonitor.extensionMapList.set(
    extensions[0].id,
    extMonitor.createLogListener()
  );
  extMonitor.extensionMapList.set(
    extensions[1].id,
    extMonitor.createLogListener()
  );

  const stopMonitor = extMonitor.messageListener({
    requestType: 'stopMonitor',
    requestTo: 'ext-monitor',
  });

  await expect(stopMonitor).resolves.toBeUndefined();

  expect(onExtActivityRemoveListener.mock.calls).toMatchObject([
    [listeners[0], 'ext1'],
    [listeners[1], 'ext2'],
  ]);
  expect(extMonitor.extensionMapList.size).toBe(0);

  expect(onInstalledRemoveListener).toHaveBeenCalledWith(onInstalledExtFn);
  expect(onUninstalledRemoveListener).toHaveBeenCalledWith(onUninstalledExtFn);
});

test("stop monitoring uninstalled extension if it's already being monitored", async () => {
  const removeListener = jest.fn();
  const fakeListener = () => jest.fn();

  const monitoringExts = [
    { id: 'ext1', type: 'extension' },
    { id: 'ext2', type: 'extension' },
    { id: 'ext3', type: 'extension' },
  ];

  const uninstalledExt = { id: 'ext3', type: 'extension' };
  const expectMonitorExtIds = ['ext1', 'ext2'];

  window.browser = {
    activityLog: {
      onExtensionActivity: { removeListener },
    },
  };

  const extMonitor = new ExtensionMonitor();

  // When no extensions are being monitored, uninstalling any extension won't
  // affact the extension monitoring status.
  extMonitor.onUninstalledExtension(uninstalledExt);

  // set extensions to monitor
  for (const ext of monitoringExts) {
    extMonitor.extensionMapList.set(ext.id, fakeListener());
  }

  expect(extMonitor.extensionMapList.size).toBe(3);
  // When an existing monitoring extension is uninstalled,
  // `onUninstalledExtension` method is being called with the extension's info.
  extMonitor.onUninstalledExtension(uninstalledExt);

  let monitoringExtIds = [];
  for (const extId of extMonitor.extensionMapList.keys()) {
    monitoringExtIds.push(extId);
  }

  expect(extMonitor.extensionMapList.size).toBe(2);
  expect(monitoringExtIds).toMatchObject(expectMonitorExtIds);
});

test('send logs to extension page if it is opened, as well as storing logs in background', async () => {
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
  let listener = extMonitor.createLogListener();
  await listener(log1);

  expect(extMonitor.logs).toMatchObject([log1]);
  expect(sendMessage).not.toHaveBeenCalled();

  // extension page exist when activityLogPorts is not empty
  // activityLogPorts contains port objects from runtime.onConnect
  const port = { port: 'extension-page-open' };
  extMonitor.activityLogPorts.add(port);

  listener = extMonitor.createLogListener();
  await listener(log2);

  expect(extMonitor.logs).toMatchObject([log1, log2]);

  expect(sendMessage).toHaveBeenCalled();
  expect(sendMessage.mock.calls[0][0]).toMatchObject({
    requestType: 'appendLogs',
    log: log2,
  });
});

describe('messageListeners functionalities test', () => {
  test('getMonitorStatus should return the current monitoring status', async () => {
    const extMonitor = new ExtensionMonitor();

    // while no extensions being monitored
    const statusPromiseNeg = extMonitor.messageListener({
      requestType: 'getMonitorStatus',
      requestTo: 'ext-monitor',
    });
    await expect(statusPromiseNeg).resolves.toMatchObject({ active: false });

    extMonitor.extensionMapList.set('ext1', extMonitor.createLogListener());

    // while extensions are being monitored
    const statusPromisePos = extMonitor.messageListener({
      requestType: 'getMonitorStatus',
      requestTo: 'ext-monitor',
    });
    await expect(statusPromisePos).resolves.toMatchObject({ active: true });
  });

  test('sendAllLogs should return existing logs collected in background', async () => {
    const extMonitor = new ExtensionMonitor();
    extMonitor.logs = { log: 'ex1' };

    const existingLogsPromise = extMonitor.messageListener({
      requestType: 'sendAllLogs',
      requestTo: 'ext-monitor',
    });
    await expect(existingLogsPromise).resolves.toMatchObject({
      existingLogs: extMonitor.logs,
    });
  });

  test('throws error when wrong requestType is passed to messageHandlers', async () => {
    const extMonitor = new ExtensionMonitor();
    const requestType = 'wrong-request';

    const error = extMonitor.messageListener({
      requestType,
      requestTo: 'ext-monitor',
    });

    await expect(error).rejects.toThrowError(
      'requestType ' + requestType + ' is not found'
    );
  });

  test('throws error when promise rejects at startMonitor method', async () => {
    const extMonitor = new ExtensionMonitor();
    const startMonitorRejectsFn = jest.spyOn(extMonitor, 'startMonitor');

    startMonitorRejectsFn.mockImplementation(() => {
      throw new Error('start-monitor-error');
    });

    const error = extMonitor.messageListener({
      requestType: 'startMonitor',
      requestTo: 'ext-monitor',
    });

    await expect(error).rejects.toThrowError('start-monitor-error');
  });

  test('messageListener return void if requestTo is not "ext-monitor"', () => {
    const extMonitor = new ExtensionMonitor();
    const messageListenerFn = jest.spyOn(extMonitor, 'messageListener');

    extMonitor.messageListener({
      requestType: 'startMonitor',
      requestTo: 'invalid-request',
    });

    expect(messageListenerFn).toHaveReturnedWith(undefined);
  });

  test("loadLogs method should store the logs by newly opend tab's id", async () => {
    const logs = [{ prop: 'log' }];
    const logsFile = JSON.stringify(logs);
    const blob = new Blob([logsFile], {
      type: 'application/json',
    });
    Object.assign(blob, { name: 'activitylogs-test.json' });
    const tabId = 1098;

    const openActivityLogPageFn = jest.spyOn(ExtListen, 'openActivityLogPage');
    const extMonitor = new ExtensionMonitor();

    openActivityLogPageFn.mockResolvedValue({ id: tabId });

    const loadLogsPromise = extMonitor.messageListener({
      requestType: 'loadLogs',
      requestTo: 'ext-monitor',
      requestParams: { file: blob },
    });

    await expect(loadLogsPromise).resolves.toBeUndefined();
    expect(extMonitor.loadedLogsByTabId.get(tabId)).toMatchObject(logs);
  });

  test('getLoadedLogs method should return logs if logs are found with given tab id otherwise throw error', async () => {
    const loadedLogs = [{ prop: 'log' }];
    const tabId = 1099;

    const extMonitor = new ExtensionMonitor();

    extMonitor.loadedLogsByTabId.set(tabId, loadedLogs);

    const getLoadedLogsPromise = extMonitor.messageListener({
      requestType: 'getLoadedLogs',
      requestTo: 'ext-monitor',
      requestParams: { tabId },
    });

    await expect(getLoadedLogsPromise).resolves.toMatchObject(loadedLogs);

    const wrongTabId = 212;
    const getLogsWithWrongTabIdPromise = extMonitor.messageListener({
      requestType: 'getLoadedLogs',
      requestTo: 'ext-monitor',
      requestParams: { tabId: wrongTabId },
    });

    await expect(getLogsWithWrongTabIdPromise).rejects.toThrowError(
      `No loaded logs found for tab id: ${wrongTabId}`
    );
  });
});

test('listeners are registered at initialization', () => {
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

test('empty log array is found after clearing logs', async () => {
  const extMonitor = new ExtensionMonitor();

  extMonitor.logs = [{ log: 'test' }];
  expect(extMonitor.logs).toEqual([{ log: 'test' }]);

  await extMonitor.messageListener({
    requestType: 'clearLogs',
    requestTo: 'ext-monitor',
  });

  expect(extMonitor.logs).toEqual([]);
});

test('saveLogs function should call download API to save logs', async () => {
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

  const saveLogPromise = extMonitor.messageListener({
    requestTo: 'ext-monitor',
    requestType: 'saveLogs',
  });

  await expect(saveLogPromise).resolves.toBeUndefined();

  expect(saveLogsFn).toHaveBeenCalledTimes(1);
  expect(download).toHaveBeenCalledTimes(1);
  expect(download).toHaveBeenCalledWith({
    url: 'fake-blob-url',
    filename: 'activitylogs.json',
  });

  expect(addListener).toHaveBeenCalledTimes(1);
  expect(addListener).toHaveBeenCalledWith(listener);

  expect(removeListener).toHaveBeenCalledTimes(1);
  expect(removeListener).toHaveBeenCalledWith(listener);

  expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  expect(revokeObjectURL).toHaveBeenCalledWith('fake-blob-url');

  saveLogsFn.mockRestore();
});

test('saveLogs function should return error message if error is encountered', async () => {
  const extMonitor = new ExtensionMonitor();
  const saveLogsFn = jest.spyOn(extMonitor, 'saveLogs');

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

  const saveLogPromise = extMonitor.messageListener({
    requestTo: 'ext-monitor',
    requestType: 'saveLogs',
  });

  await expect(saveLogPromise).rejects.toThrowError('save-error');

  expect(saveLogsFn).toHaveBeenCalledTimes(1);
  expect(download).toHaveBeenCalledTimes(1);
  expect(download).toHaveBeenCalledWith({
    url: 'fake-blob-url',
    filename: 'activitylogs.json',
  });

  expect(addListener).toHaveBeenCalledTimes(1);
  expect(addListener).toHaveBeenCalledWith(listener);

  expect(removeListener).toHaveBeenCalledTimes(1);
  expect(removeListener).toHaveBeenCalledWith(listener);

  expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  expect(revokeObjectURL).toHaveBeenCalledWith('fake-blob-url');

  saveLogsFn.mockRestore();
});

test('onConnectListener should save the port of activityLog page', () => {
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
  // with wrong port name, it will not be saved
  expect(extMonitor.activityLogPorts.size).toBe(0);

  extMonitor.onConnectListener(dummyPort);
  expect(extMonitor.activityLogPorts.size).toBe(1);
  // When the activity log page is closed, the port is removed
  onDisconnectedCallback(dummyPort);
  expect(extMonitor.activityLogPorts.size).toBe(0);
});

test('onRemovedListener should remove loaded logs along with tabId when tab is closed', () => {
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
