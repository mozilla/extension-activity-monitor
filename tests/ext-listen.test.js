import * as ExtListen from '../src/lib/ext-listen';

test('getting all extensions', async () => {
  const getAll = jest.fn();
  const getSelf = jest.fn();
  const selfId = '4';

  const demoExtensions = [
    { id: '1', type: 'extension' },
    { id: '2', type: 'extension' },
    { id: '3', type: 'theme' },
    { id: '4', type: 'extension' },
  ];

  window.browser = {
    management: { getAll, getSelf },
  };

  getAll.mockImplementation(() => {
    return new Promise((resolve) => {
      resolve(demoExtensions);
    });
  });

  getSelf.mockImplementation(() => {
    return new Promise((resolve) => {
      resolve({ id: selfId });
    });
  });

  const filteredExts = demoExtensions.filter((ext) => {
    return ext.type === 'extension' && ext.id !== selfId;
  });

  const extensionsPromise = ExtListen.getAllExtensions();
  await expect(extensionsPromise).resolves.toMatchObject(filteredExts);
  expect(getAll).toHaveBeenCalled();
});

test('if extensions are being monitored', async () => {
  const sendMessage = jest.fn();

  window.browser = {
    runtime: { sendMessage },
  };

  sendMessage.mockImplementation(() => {
    return new Promise((resolve) => {
      resolve({ active: true });
    });
  });

  const getMonitorStatusFn = ExtListen.getMonitorStatus();
  await expect(getMonitorStatusFn).resolves.toBeTruthy();

  expect(sendMessage.mock.calls[0][0]).toMatchObject({
    requestType: 'getMonitorStatus',
  });
  expect(sendMessage).toHaveBeenCalled();
});

test('start monitoring and stop monitoring all extensions', async () => {
  const sendMessage = jest.fn();

  window.browser = {
    runtime: { sendMessage },
  };

  sendMessage.mockImplementation(() => {
    return new Promise((resolve) => {
      resolve();
    });
  });

  await ExtListen.startMonitor();
  expect(sendMessage.mock.calls[0][0]).toMatchObject({
    requestType: 'startMonitor',
  });

  sendMessage.mockClear();

  await ExtListen.stopMonitor();
  expect(sendMessage.mock.calls[0][0]).toMatchObject({
    requestType: 'stopMonitor',
  });
});

test('intialize the extension page', async () => {
  const getURL = jest.fn();
  const create = jest.fn();

  window.browser = {
    runtime: { getURL },
    tabs: { create },
  };

  ExtListen.openActivityLogPage();
  expect(create).toHaveBeenCalled();
  expect(getURL).toHaveBeenCalled();
});
