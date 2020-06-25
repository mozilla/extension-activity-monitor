import ExtensionMonitor from '../src/lib/ext-monitor';

describe('initialize extension monitoring', () => {
  test('while no extensions being monitoring', async () => {
    const addListener = jest.fn();
    const getAll = jest.fn();
    const getSelf = jest.fn();

    const extensions = [
      { id: '1', type: 'extension' },
      { id: '2', type: 'extension' },
      { id: '4', type: 'extension' },
    ];

    const finalExtensions = [
      { id: '1', type: 'extension' },
      { id: '2', type: 'extension' },
    ];

    window.browser = {
      activityLog: {
        onExtensionActivity: { addListener },
      },
      management: { getAll, getSelf },
    };

    getAll.mockImplementation(() => {
      return new Promise((resolve) => {
        resolve(extensions);
      });
    });

    getSelf.mockImplementation(() => {
      return new Promise((resolve) => {
        resolve({ id: '4' });
      });
    });

    const listeners = [];
    addListener.mockImplementation((callback) => {
      listeners.push(callback);
    });

    const extMonitor = new ExtensionMonitor();
    const startMonitorFn = jest.spyOn(extMonitor, 'startMonitor');
    const setExtensionsFn = jest.spyOn(extMonitor, 'setExtensions');

    const initMonitor = extMonitor.messageListener({
      requestType: 'startMonitorAllExts',
    });
    await expect(initMonitor).resolves.toBe('ext-monitor-started');

    expect(startMonitorFn.mock.calls[0]).toEqual(['1'], ['2']);
    expect(setExtensionsFn.mock.calls[0][0]).toEqual(finalExtensions);
    expect(extMonitor.getCurrentMonitoredExts()).toEqual(
      extMonitor.extensionMapList
    );

    expect(extMonitor.areExtsBeingMonitored()).toBeTruthy();
    expect(extMonitor.extensionMapList.size).toBe(finalExtensions.length);

    expect(addListener).toHaveBeenCalledTimes(finalExtensions.length);
    expect(addListener.mock.calls).toMatchObject([
      [listeners[0], '1'],
      [listeners[1], '2'],
    ]);
  });

  test('while extensions are being monitored', async () => {
    const extensions = [{ id: '1' }, { id: '2' }];

    const extMonitor = new ExtensionMonitor();
    const setExtensionsFn = jest.spyOn(extMonitor, 'setExtensions');

    // Having non-empty extensionMapList verfies that
    // there are extensions being monitored
    extMonitor.extensionMapList.set(extensions[0].id, extMonitor.logListener());

    // Initialize monitoring extensions
    // while extensions are already being monitored
    const initMonitorFail = extMonitor.messageListener({
      requestType: 'startMonitorAllExts',
    });
    await expect(initMonitorFail).rejects.toThrow('EAM is already running');

    expect(extMonitor.areExtsBeingMonitored()).toBeTruthy();
    expect(setExtensionsFn).not.toHaveBeenCalled();
  });
});

test('stop monitoring all extensions', async () => {
  const extensions = [{ id: '1' }, { id: '2' }];
  const removeListener = jest.fn();

  window.browser = {
    activityLog: {
      onExtensionActivity: { removeListener },
    },
  };

  const listeners = [];
  removeListener.mockImplementation((callback) => {
    listeners.push(callback);
  });

  const extMonitor = new ExtensionMonitor();
  extMonitor.extensionMapList.set(extensions[0].id, extMonitor.logListener());
  extMonitor.extensionMapList.set(extensions[1].id, extMonitor.logListener());

  const stopMonitor = extMonitor.messageListener({
    requestType: 'stopMonitorAllExts',
  });
  await expect(stopMonitor).resolves.toBe('ext-monitor-stopped');

  expect(removeListener).toHaveBeenCalledTimes(extensions.length);
  expect(removeListener.mock.calls).toMatchObject([
    [listeners[0], '1'],
    [listeners[1], '2'],
  ]);

  expect(extMonitor.extensionMapList.size).toBe(0);
  expect(extMonitor.areExtsBeingMonitored()).toBeFalsy();
});

test('send logs to extension page if it is opened and storing logs in background', async () => {
  const log = { log: '1' };
  const getURL = jest.fn();
  const sendMessage = jest.fn().mockResolvedValue();
  const query = jest.fn();

  window.browser = {
    runtime: { getURL, sendMessage },
    tabs: { query },
  };

  const extMonitor = new ExtensionMonitor();
  const sendLogsFn = jest.spyOn(extMonitor, 'sendLogs');

  // Extension page is not open
  query.mockResolvedValueOnce({ length: 0 });
  // Extension page is open
  query.mockResolvedValueOnce({ length: 1 });

  let listener = extMonitor.logListener();
  await listener(log);

  expect(extMonitor.logs[0]).toMatchObject(log);
  expect(sendLogsFn.mock.calls[0][0]).toBe(log);
  expect(sendMessage).not.toHaveBeenCalled();

  listener = extMonitor.logListener();
  await listener(log);

  expect(extMonitor.logs).toMatchObject([log, log]);
  expect(sendLogsFn.mock.calls[1][0]).toBe(log);

  expect(sendMessage).toHaveBeenCalled();
  expect(sendMessage.mock.calls[0][0]).toMatchObject({ updateLogs: log });
});

describe('modify monitoring status of an extension on the go', () => {
  test('add extension to monitor', async () => {
    const addListener = jest.fn();

    window.browser = {
      activityLog: {
        onExtensionActivity: { addListener },
      },
    };

    const extMonitor = new ExtensionMonitor();
    const startMonitorFn = jest.spyOn(extMonitor, 'startMonitor');

    const extensionsId = '1';
    extMonitor.extensionMapList.set(extensionsId, extMonitor.logListener());

    // calling modifyMonitor having that extension being monitored
    const monitorError = extMonitor.modifyMonitor(extensionsId, true);
    await expect(monitorError).rejects.toThrow(
      'Extension is already being monitored'
    );
    expect(addListener).not.toHaveBeenCalled();

    // removing extension from being monitored
    extMonitor.extensionMapList.delete(extensionsId);

    // calling modifyMonitor without having the extension being monitored
    extMonitor.modifyMonitor(extensionsId, true);

    expect(startMonitorFn).toHaveBeenCalledTimes(2);
    expect(addListener).toHaveBeenCalledTimes(1);
  });

  test('remove extension from monitoring', async () => {
    const removeListener = jest.fn();

    window.browser = {
      activityLog: {
        onExtensionActivity: { removeListener },
      },
    };

    const extMonitor = new ExtensionMonitor();
    const stopMonitorFn = jest.spyOn(extMonitor, 'stopMonitor');

    const extensionsId = '1';

    // calling modifyMonitor without having that extension monitored
    const monitorError = extMonitor.modifyMonitor(extensionsId, false);
    await expect(monitorError).rejects.toThrow(
      'Extension is not being monitored'
    );
    expect(removeListener).not.toHaveBeenCalled();

    extMonitor.extensionMapList.set(extensionsId, extMonitor.logListener());
    // calling modifyMonitor after having extension monitored
    extMonitor.modifyMonitor(extensionsId, false);

    expect(stopMonitorFn).toHaveBeenCalledTimes(2);
    expect(removeListener).toHaveBeenCalledTimes(1);
  });
});

describe('message handlers and listener', () => {
  test('extensions monitoring status', async () => {
    const extMonitor = new ExtensionMonitor();
    const areExtsBeingMntrFn = jest.spyOn(extMonitor, 'areExtsBeingMonitored');

    // while no extensions being monitored
    const statusPromiseNeg = extMonitor.messageListener({
      requestType: 'getMonitorStatus',
    });
    await expect(statusPromiseNeg).resolves.toMatchObject({ status: false });
    expect(areExtsBeingMntrFn).toHaveBeenCalled();

    areExtsBeingMntrFn.mockClear();

    extMonitor.extensionMapList.set(1, extMonitor.logListener());

    // while extensions are being monitored
    const statusPromisePos = extMonitor.messageListener({
      requestType: 'getMonitorStatus',
    });
    await expect(statusPromisePos).resolves.toMatchObject({ status: true });
    expect(areExtsBeingMntrFn).toHaveBeenCalled();
  });

  test('send existing logs from background', async () => {
    const extMonitor = new ExtensionMonitor();
    extMonitor.logs = { log: '1' };
    const sendAllExistingLogsFn = jest.spyOn(
      extMonitor.messageHandlers,
      'sendAllExistingLogs'
    );

    const existingLogsPromise = extMonitor.messageListener({
      requestType: 'sendAllExistingLogs',
    });
    await expect(existingLogsPromise).resolves.toMatchObject({
      existingLogs: extMonitor.logs,
    });
    expect(sendAllExistingLogsFn).toHaveBeenCalled();
  });

  test('wrong requestType is passed to messageHanlers', async () => {
    const extMonitor = new ExtensionMonitor();
    const defaultFn = jest.spyOn(extMonitor.messageHandlers, 'default');

    const rejectedPromise = extMonitor.messageListener({
      requestType: 'wrong-request',
    });
    await expect(rejectedPromise).rejects.toThrow('unexpected message');

    expect(defaultFn).toHaveBeenCalled();
  });
});

test('initialize listener for activitylogs', () => {
  const addListener = jest.fn();

  window.browser = {
    runtime: { onMessage: { addListener } },
  };

  const listeners = [];
  addListener.mockImplementation((callback) => {
    listeners.push(callback);
  });

  const extMonitor = new ExtensionMonitor();
  extMonitor.init();

  expect(addListener).toHaveBeenCalled();
});
