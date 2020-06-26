import ExtensionMonitor from '../src/lib/ext-monitor';

test('getAllExtensions should return all extensions but themes and self', async () => {
  const selfExt = { id: 'ext4', type: 'extension' };
  const themeExt = { id: 'ext3', type: 'theme' };
  const expectedExts = [
    { id: 'ext1', type: 'extension' },
    { id: 'ext2', type: 'extension' },
  ];
  const allExts = [...expectedExts, themeExt, selfExt];

  const getAll = jest.fn(() => Promise.resolve(allExts));
  const getSelf = jest.fn(() => Promise.resolve(selfExt));

  window.browser = {
    management: { getAll, getSelf },
  };

  const extMonitor = new ExtensionMonitor();
  const extensionsPromise = extMonitor.getAllExtensions();
  await expect(extensionsPromise).resolves.toMatchObject(expectedExts);
});

describe('start extension monitoring', () => {
  test('while no extensions are being monitoring', async () => {
    const addListener = jest.fn();

    const extensions = [{ id: 'ext1' }, { id: 'ext2' }];

    window.browser = {
      activityLog: {
        onExtensionActivity: { addListener },
      },
    };

    const listeners = [];
    addListener.mockImplementation((callback) => {
      listeners.push(callback);
    });

    const extMonitor = new ExtensionMonitor();
    const getAllExtensionsFn = jest.spyOn(extMonitor, 'getAllExtensions');

    getAllExtensionsFn.mockImplementation(() => {
      return extensions;
    });

    const startMonitor = extMonitor.messageListener({
      requestType: 'startMonitor',
      requestTo: 'ext-monitor',
    });
    await expect(startMonitor).resolves.toBeUndefined();

    expect(extMonitor.extensionMapList.size).toBe(2);
    expect(addListener.mock.calls).toMatchObject([
      [listeners[0], 'ext1'],
      [listeners[1], 'ext2'],
    ]);
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
});

test('stop monitoring all extensions should make extensionMapList empty', async () => {
  const extensions = [{ id: 'ext1' }, { id: 'ext2' }];
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
    requestTo: 'ext-monitor',
  });

  await expect(stopMonitor).resolves.toBeUndefined();

  expect(removeListener.mock.calls).toMatchObject([
    [listeners[0], 'ext1'],
    [listeners[1], 'ext2'],
  ]);
  expect(extMonitor.extensionMapList.size).toBe(0);
});

test('send logs to extension page if it is opened, as well as storing logs in background', async () => {
  const log1 = { log: 'log1' };
  const log2 = { log: 'log2' };
  const getURL = jest.fn();
  const sendMessage = jest.fn().mockResolvedValue();
  const query = jest.fn();

  window.browser = {
    runtime: { getURL, sendMessage },
    tabs: { query },
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

  // extension page is open
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
});

test('onMessage listener is registered at initialization', () => {
  const addListener = jest.fn().mockResolvedValue();

  window.browser = {
    runtime: { onMessage: { addListener } },
  };

  const extMonitor = new ExtensionMonitor();
  extMonitor.init();

  expect(addListener).toHaveBeenCalled();
});
