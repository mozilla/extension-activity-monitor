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
    requestType: 'getMonitorStatus',
  });
  expect(sendMessage).toHaveBeenCalledTimes(1);
});

test('initialize monitoring and stop monitoring all extensions', async () => {
  const sendMessage = jest.fn();

  window.browser = {
    runtime: { sendMessage },
  };

  sendMessage.mockImplementation(() => {
    return new Promise((resolve) => {
      resolve();
    });
  });

  await ExtListen.initMonitorAll();
  expect(sendMessage).toHaveBeenCalledTimes(1);
  expect(sendMessage.mock.calls[0][0]).toMatchObject({
    requestType: 'startMonitorAllExts',
  });

  await ExtListen.stopMonitorAll();
  expect(sendMessage).toHaveBeenCalledTimes(2);
  expect(sendMessage.mock.calls[1][0]).toMatchObject({
    requestType: 'stopMonitorAllExts',
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
