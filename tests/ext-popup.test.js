import fs from 'fs';
import path from 'path';
import Popup from '../src/lib/ext-popup';
import * as ExtListen from '../src/lib/ext-listen';

const popupHtml = fs.readFileSync(
  path.resolve(__dirname, '../src/popup/popup.html'),
  'utf-8'
);

const domParser = new DOMParser();
const popupBody = domParser.parseFromString(popupHtml, 'text/html').body
  .innerHTML;

function observeChange(element) {
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      observer.disconnect();
      resolve();
    });
    observer.observe(element, { attributes: true });
  });
}

test('start monitoring all extensions from the popup', async () => {
  document.body.innerHTML = popupBody;

  const getMonitorStatusFn = jest.spyOn(ExtListen, 'getMonitorStatus');
  const startMonitorFn = jest.spyOn(ExtListen, 'startMonitor');

  const popup = new Popup();

  const startBtn = popup.startMonitorAllBtn;
  const stopBtn = popup.stopMonitorAllBtn;
  const monitorStatus = popup.monitorStatusText;
  const errorText = popup.errorMsgText;

  getMonitorStatusFn.mockResolvedValueOnce(false);
  getMonitorStatusFn.mockResolvedValueOnce(true);
  startMonitorFn.mockResolvedValue(true);

  await popup.init();

  // popup at initial - no extensions being watched
  expect(startBtn.getAttribute('disabled')).toBeNull();
  expect(stopBtn.getAttribute('disabled')).toEqual('disabled');

  expect(monitorStatus.textContent).toBe('No extensions are being monitored');
  expect(monitorStatus.classList.contains('failure')).toBeTruthy();
  expect(monitorStatus.classList.contains('success')).toBeFalsy();
  expect(errorText.textContent).toBe('');

  const promiseElementChanged = observeChange(monitorStatus);
  startBtn.click();
  await promiseElementChanged;

  // popup after clicking "Start Monitor" button
  // all extensions are being watched
  expect(startBtn.getAttribute('disabled')).toEqual('disabled');
  expect(stopBtn.getAttribute('disabled')).toBeNull();

  expect(monitorStatus.textContent).toBe('Extensions are being monitored');
  expect(monitorStatus.classList.contains('failure')).toBeFalsy();
  expect(monitorStatus.classList.contains('success')).toBeTruthy();

  expect(errorText.textContent).toBe('');

  getMonitorStatusFn.mockClear();
  startMonitorFn.mockClear();
});

test('stop monitoring all the extensions from popup', async () => {
  document.body.innerHTML = popupBody;

  const getMonitorStatusFn = jest.spyOn(ExtListen, 'getMonitorStatus');
  const stopMonitorFn = jest.spyOn(ExtListen, 'stopMonitor');

  const popup = new Popup();

  const startBtn = popup.startMonitorAllBtn;
  const stopBtn = popup.stopMonitorAllBtn;
  const monitorStatus = popup.monitorStatusText;
  const errorText = popup.errorMsgText;

  getMonitorStatusFn.mockResolvedValueOnce(true);
  getMonitorStatusFn.mockResolvedValueOnce(false);
  stopMonitorFn.mockResolvedValue(true);

  await popup.init();

  expect(startBtn.getAttribute('disabled')).toEqual('disabled');
  expect(stopBtn.getAttribute('disabled')).toBeNull();

  expect(monitorStatus.textContent).toBe('Extensions are being monitored');
  expect(monitorStatus.classList.contains('failure')).toBeFalsy();
  expect(monitorStatus.classList.contains('success')).toBeTruthy();

  expect(errorText.textContent).toBe('');

  const promiseElementChanged = observeChange(monitorStatus);
  stopBtn.click();
  await promiseElementChanged;

  expect(stopBtn.getAttribute('disabled')).toEqual('disabled');
  expect(startBtn.getAttribute('disabled')).toBeNull();

  expect(monitorStatus.textContent).toBe('No extensions are being monitored');
  expect(monitorStatus.classList.contains('failure')).toBeTruthy();
  expect(monitorStatus.classList.contains('success')).toBeFalsy();
  expect(errorText.textContent).toBe('');

  getMonitorStatusFn.mockClear();
});

test('errors on start/stopping monitoring should be shown in the popup UI', async () => {
  document.body.innerHTML = popupBody;

  const getMonitorStatusFn = jest.spyOn(ExtListen, 'getMonitorStatus');
  const startMonitorFn = jest.spyOn(ExtListen, 'startMonitor');
  const stopMonitorFn = jest.spyOn(ExtListen, 'stopMonitor');

  const popup = new Popup();

  const startBtn = popup.startMonitorAllBtn;
  const stopBtn = popup.stopMonitorAllBtn;
  const errorText = popup.errorMsgText;

  //Error handling at start monitor
  getMonitorStatusFn.mockResolvedValueOnce(false);
  getMonitorStatusFn.mockResolvedValueOnce(true);
  startMonitorFn.mockResolvedValueOnce(false);

  await popup.init();

  const promiseErrorChanged1 = observeChange(errorText);
  startBtn.click();
  await promiseErrorChanged1;

  expect(errorText.textContent).toBe("Monitoring couldn't be started");

  // Error handling at stop monitor
  getMonitorStatusFn.mockResolvedValue(true);
  stopMonitorFn.mockResolvedValueOnce(false);

  await popup.init();

  const promiseErrorChanged2 = observeChange(errorText);
  stopBtn.click();
  await promiseErrorChanged2;

  expect(errorText.textContent).toBe("Monitoring couldn't be stopped");
});

test('Error is thrown while wrong parameter is passed to handleEvent', async () => {
  document.body.innerHTML = popupBody;

  const getMonitorStatusFn = jest.spyOn(ExtListen, 'getMonitorStatus');

  const popup = new Popup();

  getMonitorStatusFn.mockResolvedValue(false);

  await popup.init();

  const target = { id: 'invalid' };
  const invalidType = 'invalid';

  let thrownError = popup.handleEvent({
    type: 'click',
    target,
  });
  await expect(thrownError).rejects.toThrowError(
    'wrong event target found ' + target
  );

  await popup.init();

  thrownError = popup.handleEvent({
    type: invalidType,
    target: { id: 'invalid' },
  });
  await expect(thrownError).rejects.toThrowError(
    'wrong event type found ' + invalidType
  );
});

test('clicking on "view activity logs page" button should open the activitylog page', async () => {
  document.body.innerHTML = popupBody;

  const getMonitorStatusFn = jest.spyOn(ExtListen, 'getMonitorStatus');
  const openActivityLogPageFn = jest.spyOn(ExtListen, 'openActivityLogPage');

  getMonitorStatusFn.mockResolvedValue(false);
  openActivityLogPageFn.mockResolvedValue();

  const popup = new Popup();
  await popup.init();

  const openActivityLogBtn = popup.openActivityLogBtn;

  await popup.init();
  openActivityLogBtn.click();
  expect(openActivityLogPageFn).toHaveBeenCalled();
});
