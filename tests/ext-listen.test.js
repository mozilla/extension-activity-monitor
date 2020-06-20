import * as ExtListen from '../src/lib/ext-listen';

test('getting all extensions', async () => {
  const getAll = jest.fn();
  const demoExtensions = [
    { id: '1', type: 'extension' },
    { id: '2', type: 'extension' },
    { id: '3', type: 'theme' },
  ];

  window.browser = {
    management: { getAll },
  };

  getAll.mockImplementation(() => {
    return new Promise((resolve) => {
      resolve(demoExtensions);
    });
  });

  const filteredExts = demoExtensions.filter((ext) => ext.type !== 'theme');

  const extensionsPromise = ExtListen.getAllExtensions();
  await expect(extensionsPromise).resolves.toMatchObject(filteredExts);
  expect(getAll).toHaveBeenCalledTimes(1);
});

test('if extensions are being monitored', async () => {
  const sendMessage = jest.fn();

  window.browser = {
    runtime: { sendMessage },
  };

  sendMessage.mockImplementation(() => {
    return new Promise((resolve) => {
      resolve({ status: true });
    });
  });

  const areExtsBeingMntrPromise = ExtListen.areExtsBeingMonitored();
  await expect(areExtsBeingMntrPromise).resolves.toBeTruthy();

  expect(sendMessage.mock.calls[0][0]).toMatchObject({
    getMonitoringStatus: true,
  });
  expect(sendMessage).toHaveBeenCalledTimes(1);
});

test('initialize monitoring and stop monitoring all extensions', async () => {
  const extensions = [{ id: '1' }];
  const sendMessage = jest.fn();

  window.browser = {
    runtime: { sendMessage },
  };

  sendMessage.mockImplementation(() => {
    return new Promise((resolve) => {
      resolve();
    });
  });

  await ExtListen.initMonitorAll(extensions);
  expect(sendMessage).toHaveBeenCalledTimes(1);
  expect(sendMessage.mock.calls[0][0]).toMatchObject({
    extStartMonitorAllExts: extensions,
  });

  await ExtListen.stopMonitorAll();
  expect(sendMessage).toHaveBeenCalledTimes(2);
  expect(sendMessage.mock.calls[1][0]).toMatchObject({
    extStopMonitorAll: true,
  });
});

test('intialize the extension page', async () => {
  const getURL = jest.fn();
  const create = jest.fn();

  window.browser = {
    runtime: { getURL },
    tabs: { create },
  };

  ExtListen.viewActivityLogs();
  expect(create).toHaveBeenCalledTimes(1);
  expect(getURL).toHaveBeenCalledTimes(1);
});
