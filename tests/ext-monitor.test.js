import ExtensionMonitor from '../src/lib/ext-monitor';

describe('initialize extension monitoring', () => {
  test('while no extensions being monitoring', async () => {
    const extensions = [{ id: '1' }, { id: '2' }];
    const addListener = jest.fn();
    const removeListener = jest.fn();

    window.browser = {
      activityLog: {
        onExtensionActivity: { addListener, removeListener },
      },
    };

    const extMonitor = new ExtensionMonitor();
    const startMonitorFn = jest.spyOn(extMonitor, 'startMonitor');
    const setExtensionsFn = jest.spyOn(extMonitor, 'setExtensions');

    const initMonitor = extMonitor.initMonitor(extensions);
    await expect(initMonitor).resolves.toBe('ext-monitor-started');

    expect(startMonitorFn.mock.calls).toEqual([['1'], ['2']]);
    expect(setExtensionsFn.mock.calls[0][0]).toEqual(extensions);
    expect(extMonitor.getCurrentMonitoredExts()).toEqual(
      extMonitor.extensionMapList
    );

    expect(extMonitor.areExtsBeingMonitored()).toBeTruthy();
    expect(extMonitor.extensionMapList.size).toBe(extensions.length);

    expect(addListener).toHaveBeenCalledTimes(extensions.length);
    expect(addListener.mock.calls).toMatchObject([
      [extMonitor.extensionMapList.get('1'), '1'],
      [extMonitor.extensionMapList.get('2'), '2'],
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
    const initMonitorFail = extMonitor.initMonitor(extensions);
    await expect(initMonitorFail).rejects.toThrow('ext-monitor-init-failed');

    expect(setExtensionsFn).not.toHaveBeenCalled();
    expect(extMonitor.areExtsBeingMonitored()).toBeTruthy();
  });
});

test('stop monitoring all extensions', async () => {
  const extensions = [{ id: '1' }, { id: '2' }];
  const addListener = jest.fn();
  const removeListener = jest.fn();

  window.browser = {
    activityLog: {
      onExtensionActivity: { addListener, removeListener },
    },
  };

  const extMonitor = new ExtensionMonitor();
  const initMonitor = extMonitor.initMonitor(extensions);
  await expect(initMonitor).resolves.toBe('ext-monitor-started');

  const listeners = [];
  listeners.push(extMonitor.extensionMapList.get('1'));
  listeners.push(extMonitor.extensionMapList.get('2'));

  const stopMonitor = extMonitor.stopMonitorAll();
  await expect(stopMonitor).resolves.toBe('ext-monitor-stopped');

  expect(removeListener).toHaveBeenCalledTimes(extensions.length);
  expect(removeListener.mock.calls).toMatchObject([
    [listeners[0], '1'],
    [listeners[1], '2'],
  ]);

  expect(extMonitor.extensionMapList.size).toBe(0);
  expect(extMonitor.areExtsBeingMonitored()).toBeFalsy();
});

test('send logs to extension page if it is opened', async () => {
  const log = { log: '1' };
  const getURL = jest.fn();
  const sendMessage = jest.fn().mockResolvedValue();
  const query = jest.fn();

  window.browser = {
    runtime: {
      getURL,
      sendMessage,
    },
    tabs: {
      query,
    },
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

  expect(sendMessage).toHaveBeenCalledTimes(1);
  expect(sendMessage.mock.calls[0][0]).toMatchObject({ updateLogs: log });
});

describe('modify monitoring status of an extension on the go', () => {
  test('add extension to monitor', () => {
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
    extMonitor.modifyMonitor(extensionsId, true);
    expect(addListener).not.toHaveBeenCalled();
    extMonitor.extensionMapList.delete(extensionsId);

    // calling modifyMonitor without having the extension being monitored
    extMonitor.modifyMonitor(extensionsId, true);

    expect(startMonitorFn).toHaveBeenCalledTimes(2);
    expect(addListener).toHaveBeenCalledTimes(1);
  });

  test('remove extension from monitoring', () => {
    const removeListener = jest.fn();

    window.browser = {
      activityLog: {
        onExtensionActivity: { removeListener },
      },
    };

    const extMonitor = new ExtensionMonitor();
    const stopMonitorFn = jest.spyOn(extMonitor, 'stopMonitor');

    const extensionsId = '1';

    // calling modifyMonitor without having that extension monitoring
    extMonitor.modifyMonitor(extensionsId, false);
    expect(removeListener).not.toHaveBeenCalled();

    extMonitor.extensionMapList.set(extensionsId, extMonitor.logListener());
    // calling modifyMonitor after having extension monitoring
    extMonitor.modifyMonitor(extensionsId, false);

    expect(stopMonitorFn).toHaveBeenCalledTimes(2);
    expect(removeListener).toHaveBeenCalledTimes(1);
  });
});
