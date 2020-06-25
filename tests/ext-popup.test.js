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

  const areExtsBeingMonitoredFn = jest.spyOn(
    ExtListen,
    'areExtsBeingMonitored'
  );
  const startMonitorAllFn = jest.spyOn(ExtListen, 'startMonitorAll');

  const popup = new Popup();

  const startBtn = popup.startMonitorAllBtn;
  const stopBtn = popup.stopMonitorAllBtn;
  const monitorStatus = popup.monitorStatusText;
  const errorText = popup.errorMsgText;

  // initially there will be no monitored extensions
  areExtsBeingMonitoredFn.mockResolvedValueOnce(false);
  areExtsBeingMonitoredFn.mockResolvedValueOnce(true);
  startMonitorAllFn.mockResolvedValue('ext-monitor-started');

  await popup.init();

  // popup at initial - no extensions being watched
  expect(startBtn.classList.contains('disabled')).toBeFalsy();
  expect(startBtn.getAttribute('disabled')).toBeNull();

  expect(stopBtn.classList.contains('disabled')).toBeTruthy();
  expect(stopBtn.getAttribute('disabled')).toEqual('disabled');

  expect(monitorStatus.textContent).toBe('No extensions are being monitored');
  expect(monitorStatus.classList.contains('red')).toBeTruthy();
  expect(monitorStatus.classList.contains('green')).toBeFalsy();
  expect(errorText.textContent).toBe('');

  const promiseElementChanged = observeChange(monitorStatus);
  startBtn.click();
  await promiseElementChanged;

  expect(startBtn.classList.contains('disabled')).toBeTruthy();
  expect(startBtn.getAttribute('disabled')).toEqual('disabled');

  expect(stopBtn.classList.contains('disabled')).toBeFalsy();
  expect(stopBtn.getAttribute('disabled')).toBeNull();

  expect(monitorStatus.textContent).toBe('Extensions are being monitored');
  expect(monitorStatus.classList.contains('red')).toBeFalsy();
  expect(monitorStatus.classList.contains('green')).toBeTruthy();

  expect(errorText.textContent).toBe('');

  areExtsBeingMonitoredFn.mockClear();
  startMonitorAllFn.mockClear();
});

test('stop monitoring all the extensions from popup', async () => {
  document.body.innerHTML = popupBody;

  const areExtsBeingMonitoredFn = jest.spyOn(
    ExtListen,
    'areExtsBeingMonitored'
  );
  const stopMonitorAllBtnFn = jest.spyOn(ExtListen, 'stopMonitorAll');

  const popup = new Popup();

  const startBtn = popup.startMonitorAllBtn;
  const stopBtn = popup.stopMonitorAllBtn;
  const monitorStatus = popup.monitorStatusText;
  const errorText = popup.errorMsgText;

  // initially there will be no monitored extensions
  areExtsBeingMonitoredFn.mockResolvedValueOnce(true);
  areExtsBeingMonitoredFn.mockResolvedValueOnce(false);
  stopMonitorAllBtnFn.mockResolvedValue('ext-monitor-stopped');

  await popup.init();

  expect(startBtn.classList.contains('disabled')).toBeTruthy();
  expect(startBtn.getAttribute('disabled')).toEqual('disabled');

  expect(stopBtn.classList.contains('disabled')).toBeFalsy();
  expect(stopBtn.getAttribute('disabled')).toBeNull();

  expect(monitorStatus.textContent).toBe('Extensions are being monitored');
  expect(monitorStatus.classList.contains('red')).toBeFalsy();
  expect(monitorStatus.classList.contains('green')).toBeTruthy();

  expect(errorText.textContent).toBe('');

  const promiseElementChanged = observeChange(monitorStatus);
  stopBtn.click();
  await promiseElementChanged;

  expect(stopBtn.classList.contains('disabled')).toBeTruthy();
  expect(stopBtn.getAttribute('disabled')).toEqual('disabled');

  expect(startBtn.classList.contains('disabled')).toBeFalsy();
  expect(startBtn.getAttribute('disabled')).toBeNull();

  expect(monitorStatus.textContent).toBe('No extensions are being monitored');
  expect(monitorStatus.classList.contains('red')).toBeTruthy();
  expect(monitorStatus.classList.contains('green')).toBeFalsy();
  expect(errorText.textContent).toBe('');

  areExtsBeingMonitoredFn.mockClear();
});

test('errors on start/stopping monitoring should be shown in the popup UI', async () => {
  document.body.innerHTML = popupBody;

  const areExtsBeingMonitoredFn = jest.spyOn(
    ExtListen,
    'areExtsBeingMonitored'
  );
  const startMonitorAllFn = jest.spyOn(ExtListen, 'startMonitorAll');
  const stopMonitorAllFn = jest.spyOn(ExtListen, 'stopMonitorAll');

  const popup = new Popup();

  const startBtn = popup.startMonitorAllBtn;
  const stopBtn = popup.stopMonitorAllBtn;
  const monitorStatus = popup.monitorStatusText;
  const errorText = popup.errorMsgText;

  // TEST: Error handling at start monitor

  areExtsBeingMonitoredFn.mockResolvedValueOnce(false);
  areExtsBeingMonitoredFn.mockResolvedValueOnce(true);
  startMonitorAllFn.mockResolvedValueOnce('wrong-message');

  await popup.init();

  const promiseErrorChanged1 = observeChange(errorText);
  startBtn.click();
  await promiseErrorChanged1;

  expect(errorText.textContent).toBe("Monitoring couldn't be started");

  // the following is not changed from earlier.
  expect(stopBtn.classList.contains('disabled')).toBeTruthy();
  expect(stopBtn.getAttribute('disabled')).toEqual('disabled');

  expect(startBtn.classList.contains('disabled')).toBeFalsy();
  expect(startBtn.getAttribute('disabled')).toBeNull();

  expect(monitorStatus.textContent).toBe('No extensions are being monitored');
  expect(monitorStatus.classList.contains('red')).toBeTruthy();
  expect(monitorStatus.classList.contains('green')).toBeFalsy();

  // TEST: Error handling at stop monitor

  areExtsBeingMonitoredFn.mockResolvedValue(true);
  stopMonitorAllFn.mockResolvedValueOnce('wrong-message');

  await popup.init();

  const promiseErrorChanged2 = observeChange(errorText);
  stopBtn.click();
  await promiseErrorChanged2;

  expect(errorText.textContent).toBe("Monitoring couldn't be stopped");

  expect(startBtn.classList.contains('disabled')).toBeTruthy();
  expect(startBtn.getAttribute('disabled')).toEqual('disabled');

  expect(stopBtn.classList.contains('disabled')).toBeFalsy();
  expect(stopBtn.getAttribute('disabled')).toBeNull();

  expect(monitorStatus.textContent).toBe('Extensions are being monitored');
  expect(monitorStatus.classList.contains('red')).toBeFalsy();
  expect(monitorStatus.classList.contains('green')).toBeTruthy();
});

test('wrong parameter is passed to handleEvent', async () => {
  document.body.innerHTML = popupBody;

  const areExtsBeingMonitoredFn = jest.spyOn(
    ExtListen,
    'areExtsBeingMonitored'
  );

  const popup = new Popup();
  // initially there will be no monitored extensions
  areExtsBeingMonitoredFn.mockResolvedValue(false);

  await popup.init();

  let thrownError = popup.handleEvent({
    type: 'click',
    target: { id: 'invalid' },
  });
  await expect(thrownError).rejects.toThrowError('wrong target id found');

  await popup.init();

  thrownError = popup.handleEvent({
    type: 'invalid',
    target: { id: 'invalid' },
  });
  await expect(thrownError).rejects.toThrowError('wrong event found');
});

test('clicking "view activity logs page" should open the activitylog extension page', async () => {
  document.body.innerHTML = popupBody;

  const areExtsBeingMonitoredFn = jest.spyOn(
    ExtListen,
    'areExtsBeingMonitored'
  );
  const viewExtPageFn = jest.spyOn(ExtListen, 'viewExtPage');

  viewExtPageFn.mockResolvedValue();

  const popup = new Popup();

  const startBtn = popup.startMonitorAllBtn;
  const stopBtn = popup.stopMonitorAllBtn;
  const viewExtPageBtn = popup.viewActivityLogBtn;
  const monitorStatus = popup.monitorStatusText;
  const errorText = popup.errorMsgText;

  // initially there will be no monitored extensions
  areExtsBeingMonitoredFn.mockResolvedValue(false);

  await popup.init();

  expect(stopBtn.classList.contains('disabled')).toBeTruthy();
  expect(stopBtn.getAttribute('disabled')).toEqual('disabled');

  expect(startBtn.classList.contains('disabled')).toBeFalsy();
  expect(startBtn.getAttribute('disabled')).toBeNull();

  expect(monitorStatus.textContent).toBe('No extensions are being monitored');
  expect(monitorStatus.classList.contains('red')).toBeTruthy();
  expect(monitorStatus.classList.contains('green')).toBeFalsy();
  expect(errorText.textContent).toBe('');

  viewExtPageBtn.click();

  expect(viewExtPageFn).toHaveBeenCalled();

  // nothing changes from previous check
  expect(startBtn.classList.contains('disabled')).toBeFalsy();
  expect(startBtn.getAttribute('disabled')).toBeNull();

  expect(stopBtn.classList.contains('disabled')).toBeTruthy();
  expect(stopBtn.getAttribute('disabled')).toEqual('disabled');

  expect(monitorStatus.textContent).toBe('No extensions are being monitored');
  expect(monitorStatus.classList.contains('red')).toBeTruthy();
  expect(monitorStatus.classList.contains('green')).toBeFalsy();
  expect(errorText.textContent).toBe('');
});
