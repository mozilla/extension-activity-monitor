/* eslint no-unsanitized/property: "off" */
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

const MONITOR_DISABLED_MSG = 'No extensions are being monitored';
const MONITOR_ENABLED_MSG = 'Extensions are being monitored';

test('start monitoring all extensions from the popup', async () => {
  document.body.innerHTML = popupBody;

  const getMonitorStatusFn = jest.spyOn(ExtListen, 'getMonitorStatus');
  const startMonitorFn = jest.spyOn(ExtListen, 'startMonitor');

  getMonitorStatusFn.mockResolvedValueOnce(false);
  getMonitorStatusFn.mockResolvedValueOnce(true);
  startMonitorFn.mockResolvedValue(true);

  const popup = new Popup();

  const startBtn = popup.startMonitorAllBtn;
  const stopBtn = popup.stopMonitorAllBtn;
  const monitorStatus = popup.monitorStatusText;
  const errorText = popup.errorMsgText;

  await popup.init();

  // popup at initial - no extensions are being watched
  expect(startBtn.hasAttribute('disabled')).toBeFalsy();
  expect(stopBtn.hasAttribute('disabled')).toBeTruthy();

  expect(monitorStatus.textContent).toBe(MONITOR_DISABLED_MSG);
  expect(monitorStatus.classList.contains('failure')).toBeTruthy();
  expect(monitorStatus.classList.contains('success')).toBeFalsy();
  expect(errorText.textContent).toBe('');

  const monitorStatusChanged = observeChange(monitorStatus);
  startBtn.click();
  await monitorStatusChanged;

  // popup after clicking "Start Monitor" button (when extensions are being monitored)
  expect(startBtn.hasAttribute('disabled')).toBeTruthy();
  expect(stopBtn.hasAttribute('disabled')).toBeFalsy();

  expect(monitorStatus.textContent).toBe(MONITOR_ENABLED_MSG);
  expect(monitorStatus.classList.contains('failure')).toBeFalsy();
  expect(monitorStatus.classList.contains('success')).toBeTruthy();

  expect(errorText.textContent).toBe('');
});

test('stop monitoring all the extensions from popup', async () => {
  document.body.innerHTML = popupBody;

  const getMonitorStatusFn = jest.spyOn(ExtListen, 'getMonitorStatus');
  const stopMonitorFn = jest.spyOn(ExtListen, 'stopMonitor');

  getMonitorStatusFn.mockResolvedValueOnce(true);
  getMonitorStatusFn.mockResolvedValueOnce(false);
  stopMonitorFn.mockResolvedValue(true);

  const popup = new Popup();

  const startBtn = popup.startMonitorAllBtn;
  const stopBtn = popup.stopMonitorAllBtn;
  const monitorStatus = popup.monitorStatusText;
  const errorText = popup.errorMsgText;

  await popup.init();

  expect(startBtn.hasAttribute('disabled')).toBeTruthy();
  expect(stopBtn.hasAttribute('disabled')).toBeFalsy();

  expect(monitorStatus.textContent).toBe(MONITOR_ENABLED_MSG);
  expect(monitorStatus.classList.contains('failure')).toBeFalsy();
  expect(monitorStatus.classList.contains('success')).toBeTruthy();

  expect(errorText.textContent).toBe('');

  const monitorStatusChanged = observeChange(monitorStatus);
  stopBtn.click();
  await monitorStatusChanged;

  expect(startBtn.hasAttribute('disabled')).toBeFalsy();
  expect(stopBtn.hasAttribute('disabled')).toBeTruthy();

  expect(monitorStatus.textContent).toBe(MONITOR_DISABLED_MSG);
  expect(monitorStatus.classList.contains('failure')).toBeTruthy();
  expect(monitorStatus.classList.contains('success')).toBeFalsy();
  expect(errorText.textContent).toBe('');
});

test('errors on start/stopping monitoring should be shown in the popup UI', async () => {
  document.body.innerHTML = popupBody;
  const startMontiorErrorMsg = 'start monitoring error';
  const stopMontiorErrorMsg = 'stop monitoring error';

  const getMonitorStatusFn = jest.spyOn(ExtListen, 'getMonitorStatus');
  const startMonitorFn = jest.spyOn(ExtListen, 'startMonitor');
  const stopMonitorFn = jest.spyOn(ExtListen, 'stopMonitor');

  getMonitorStatusFn.mockResolvedValueOnce(false);
  getMonitorStatusFn.mockResolvedValueOnce(true);
  //Error at start monitor
  startMonitorFn.mockRejectedValueOnce(new Error(startMontiorErrorMsg));

  const popup = new Popup();

  const startBtn = popup.startMonitorAllBtn;
  const stopBtn = popup.stopMonitorAllBtn;
  const errorTextEle = popup.errorMsgText;

  await popup.init();

  const errorTextChanged = observeChange(errorTextEle);
  startBtn.click();
  await errorTextChanged;

  expect(errorTextEle.textContent).toBe(startMontiorErrorMsg);

  //Error handling at stop monitor
  getMonitorStatusFn.mockResolvedValue(true);
  stopMonitorFn.mockRejectedValueOnce(new Error(stopMontiorErrorMsg));

  await popup.init();

  const errorTextChangedAgain = observeChange(errorTextEle);
  stopBtn.click();
  await errorTextChangedAgain;

  expect(errorTextEle.textContent).toBe(stopMontiorErrorMsg);
});

test('Error message should be shown in the popup if wrong arg is passed to handleEvent', async () => {
  document.body.innerHTML = popupBody;

  const getMonitorStatusFn = jest.spyOn(ExtListen, 'getMonitorStatus');

  const popup = new Popup();

  getMonitorStatusFn.mockResolvedValue(false);

  await popup.init();

  const target = { id: 'invalid' };
  const invalidType = 'invalid-type';

  await popup.handleEvent({
    type: 'click',
    target,
  });

  expect(popup.errorMsgText.textContent).toBe(
    `wrong event target id found: ${JSON.stringify(target.id)}`
  );

  await popup.init();

  await popup.handleEvent({
    type: invalidType,
    target: { id: 'invalid' },
  });

  expect(popup.errorMsgText.textContent).toBe(
    `wrong event type found: ${JSON.stringify(invalidType)}`
  );
});

test('clicking the "view activity logs page" button should open the activitylog page', async () => {
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
