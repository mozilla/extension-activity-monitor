import * as ExtListen from '../src/lib/ext-listen';

test('getMonitorStatus should have requestType "getMonitorStatus" and resolves with current extension monitoring status', async () => {
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

test('startMonitor and stopMonitor should have their respective requestType', async () => {
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

test('openActivityLogPage should create tab with ActivityLogPageURL', async () => {
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
