import * as ExtListen from '../src/lib/ext-listen';

function getExpectedMessage(msgProps) {
  return { requestTo: 'ext-monitor', ...msgProps };
}

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

  expect(sendMessage.mock.calls[0][0]).toMatchObject(
    getExpectedMessage({
      requestType: 'getMonitorStatus',
    })
  );
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
  expect(sendMessage.mock.calls[0][0]).toMatchObject(
    getExpectedMessage({
      requestType: 'startMonitor',
    })
  );

  sendMessage.mockClear();

  await ExtListen.stopMonitor();
  expect(sendMessage.mock.calls[0][0]).toMatchObject(
    getExpectedMessage({
      requestType: 'stopMonitor',
    })
  );
});

test('openActivityLogPage should create tab with ActivityLogPageURL and apply search params if it is passed as argument', async () => {
  const getURL = jest.fn();
  const create = jest.fn();

  window.browser = {
    runtime: { getURL },
    tabs: { create },
  };

  ExtListen.openActivityLogPage();

  expect(create).toHaveBeenCalled();
  expect(getURL).toHaveBeenCalled();
  expect(getURL.mock.calls[0][0]).toBe('/activitylog/activitylog.html');

  ExtListen.openActivityLogPage('test=123');
  expect(getURL.mock.calls[1][0]).toBe(
    '/activitylog/activitylog.html?test=123'
  );
});

test('ActivityLogPageURL method should return url with search params if search params are available', () => {
  const getURL = jest.fn();
  const create = jest.fn();

  window.browser = {
    runtime: { getURL },
    tabs: { create },
  };
});
