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
    const createLogListenerFn = jest.spyOn(extMonitor, 'createLogListener');

    const initMonitor = extMonitor.messageListener({
      requestType: 'startMonitor',
    });
    await expect(initMonitor).resolves.toBeTruthy();
    expect(createLogListenerFn).toHaveBeenCalled();

    expect(extMonitor.hasActivityListeners()).toBeTruthy();
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

    // Having non-empty extensionMapList verfies that
    // there are extensions being monitored
    extMonitor.extensionMapList.set(
      extensions[0].id,
      extMonitor.createLogListener()
    );

    // Initialize monitoring extensions
    // while extensions are already being monitored
    const initMonitorFail = extMonitor.messageListener({
      requestType: 'startMonitor',
    });
    await expect(initMonitorFail).rejects.toThrow('EAM is already running');

    expect(extMonitor.hasActivityListeners()).toBeTruthy();
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
  });
  await expect(stopMonitor).resolves.toBeTruthy();

  expect(removeListener).toHaveBeenCalledTimes(extensions.length);
  expect(removeListener.mock.calls).toMatchObject([
    [listeners[0], '1'],
    [listeners[1], '2'],
  ]);

  expect(extMonitor.extensionMapList.size).toBe(0);
  expect(extMonitor.hasActivityListeners()).toBeFalsy();
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

  let listener = extMonitor.createLogListener();
  await listener(log);

  expect(extMonitor.logs[0]).toMatchObject(log);
  expect(sendLogsFn.mock.calls[0][0]).toBe(log);
  expect(sendMessage).not.toHaveBeenCalled();

  listener = extMonitor.createLogListener();
  await listener(log);

  expect(extMonitor.logs).toMatchObject([log, log]);
  expect(sendLogsFn.mock.calls[1][0]).toBe(log);

  expect(sendMessage).toHaveBeenCalled();
  expect(sendMessage.mock.calls[0][0]).toMatchObject({
    requestType: 'appendLogs',
    logs: log,
  });
});

describe('message handlers and listener', () => {
  test('extensions monitoring status', async () => {
    const extMonitor = new ExtensionMonitor();
    const hasActivityListenersFn = jest.spyOn(
      extMonitor,
      'hasActivityListeners'
    );

    // while no extensions being monitored
    const statusPromiseNeg = extMonitor.messageListener({
      requestType: 'getMonitorStatus',
    });
    await expect(statusPromiseNeg).resolves.toMatchObject({ active: false });
    expect(hasActivityListenersFn).toHaveBeenCalled();

    hasActivityListenersFn.mockClear();

    extMonitor.extensionMapList.set(1, extMonitor.createLogListener());

    // while extensions are being monitored
    const statusPromisePos = extMonitor.messageListener({
      requestType: 'getMonitorStatus',
    });
    await expect(statusPromisePos).resolves.toMatchObject({ active: true });
    expect(hasActivityListenersFn).toHaveBeenCalled();
  });

  test('send existing logs from background', async () => {
    const extMonitor = new ExtensionMonitor();
    extMonitor.logs = { log: '1' };
    const sendAllExistingLogsFn = jest.spyOn(
      extMonitor.messageHandlers,
      'sendAllLogs'
    );

    const existingLogsPromise = extMonitor.messageListener({
      requestType: 'sendAllLogs',
    });
    await expect(existingLogsPromise).resolves.toMatchObject({
      existingLogs: extMonitor.logs,
    });
    expect(sendAllExistingLogsFn).toHaveBeenCalled();
  });

  test('wrong requestType is passed to messageHanlers', async () => {
    const extMonitor = new ExtensionMonitor();

    const requestType = 'wrong-request';

    const error = () => {
      extMonitor.messageListener({
        requestType,
      });
    };

    expect(error).toThrow('requestType ' + requestType + ' is not found');
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
