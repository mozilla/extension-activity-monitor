/* eslint no-unsanitized/property: "off" */
import fs from 'fs';
import path from 'path';
import { setImmediate } from 'timers';

import * as ExtListen from '../src/lib/ext-listen';
import Popup from '../src/lib/ext-popup';
import { MONITOR_DISABLED_MSG, MONITOR_ENABLED_MSG } from '../src/lib/constant';

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

const getMonitorStatusSpyFn = jest.spyOn(ExtListen, 'getMonitorStatus');
const startMonitorSpyFn = jest.spyOn(ExtListen, 'startMonitor');
const stopMonitorSpyFn = jest.spyOn(ExtListen, 'stopMonitor');

afterEach(() => {
  getMonitorStatusSpyFn.mockReset();
  startMonitorSpyFn.mockReset();
  stopMonitorSpyFn.mockReset();
});

test('clicking on start monitoring button should notify that the extensions are being monitored', async () => {
  document.body.innerHTML = popupBody;

  // no extensions are being monitored initially
  getMonitorStatusSpyFn.mockResolvedValueOnce(false);
  // extensions are being monitored after the start monitoring button is clicked
  getMonitorStatusSpyFn.mockResolvedValueOnce(true);
  startMonitorSpyFn.mockResolvedValue(true);

  const popup = new Popup();
  await popup.init();

  const startBtn = popup.startMonitorAllBtn;
  const stopBtn = popup.stopMonitorAllBtn;
  const monitorStatus = popup.monitorStatusText;
  const errorText = popup.errorMsgText;

  const observeMonitorStatusChanged = observeChange(monitorStatus);
  startBtn.click();
  await observeMonitorStatusChanged;

  // extensions are being monitored
  expect(startBtn.hasAttribute('disabled')).toBeTruthy();
  expect(stopBtn.hasAttribute('disabled')).toBeFalsy();

  expect(monitorStatus.textContent).toBe(MONITOR_ENABLED_MSG);
  expect(monitorStatus.classList.contains('failure')).toBeFalsy();
  expect(monitorStatus.classList.contains('success')).toBeTruthy();

  expect(errorText.textContent).toBe('');
});

test('clicking on stop monitoring button should notify that the extensions are not being monitored', async () => {
  document.body.innerHTML = popupBody;

  // assume, extensions are being monitored
  getMonitorStatusSpyFn.mockResolvedValueOnce(true);
  // extensions are not being monitored after the stop monitoring button is clicked
  getMonitorStatusSpyFn.mockResolvedValueOnce(false);
  stopMonitorSpyFn.mockResolvedValue(true);

  const popup = new Popup();
  await popup.init();

  const startBtn = popup.startMonitorAllBtn;
  const stopBtn = popup.stopMonitorAllBtn;
  const monitorStatus = popup.monitorStatusText;
  const errorText = popup.errorMsgText;

  const observeMonitorStatusChanged = observeChange(monitorStatus);
  stopBtn.click();
  await observeMonitorStatusChanged;

  expect(startBtn.hasAttribute('disabled')).toBeFalsy();
  expect(stopBtn.hasAttribute('disabled')).toBeTruthy();

  expect(monitorStatus.textContent).toBe(MONITOR_DISABLED_MSG);
  expect(monitorStatus.classList.contains('failure')).toBeTruthy();
  expect(monitorStatus.classList.contains('success')).toBeFalsy();
  expect(errorText.textContent).toBe('');
});

test('clicking on "view activity logs page" button should open a new tab with extension page', async () => {
  document.body.innerHTML = popupBody;

  const EXTENSION_PAGE_URL =
    'moz-extension://extension-page/activitylog/activitylog.html';

  const getURL = jest.fn().mockReturnValue(EXTENSION_PAGE_URL);
  const create = jest.fn();

  window.browser = {
    runtime: { getURL },
    tabs: { create },
  };

  // prevent window.close to trigger a failure due to jest teardown not expecting the jsdom window to be gone
  window.close = jest.fn(() => {});

  const popup = new Popup();
  await popup.init();

  popup.openActivityLogBtn.click();

  expect(getURL).toHaveBeenCalled();
  expect(create).toHaveBeenCalledWith({ url: EXTENSION_PAGE_URL });

  setImmediate(() => {
    // expect the browserAction popup to autoclose itself.
    expect(window.close).toHaveBeenCalled();
  });
});

test('errors at start monitoring extensions should be displayed', async () => {
  document.body.innerHTML = popupBody;

  const START_MONITOR_ERROR = 'start-monitor-error';

  // no extensions are being monitored initially
  getMonitorStatusSpyFn.mockResolvedValueOnce(false);

  // throwing error at start monitor
  startMonitorSpyFn.mockRejectedValueOnce(new Error(START_MONITOR_ERROR));

  const popup = new Popup();
  await popup.init();

  const startBtn = popup.startMonitorAllBtn;
  const errorText = popup.errorMsgText;

  const observeErrorTextChange = observeChange(errorText);
  startBtn.click();
  await observeErrorTextChange;

  expect(errorText.textContent).toBe(START_MONITOR_ERROR);
});

test('errors at stop monitoring extensions should be displayed', async () => {
  document.body.innerHTML = popupBody;

  const STOP_MONITOR_ERROR = 'stop-monitor-error';

  // assume, extensions are being monitored
  getMonitorStatusSpyFn.mockResolvedValueOnce(true);

  // throwing error at stop monitor
  stopMonitorSpyFn.mockRejectedValueOnce(new Error(STOP_MONITOR_ERROR));

  const popup = new Popup();
  await popup.init();

  const stopBtn = popup.stopMonitorAllBtn;
  const errorText = popup.errorMsgText;

  const observeErrorTextChange = observeChange(errorText);
  stopBtn.click();
  await observeErrorTextChange;

  expect(errorText.textContent).toBe(STOP_MONITOR_ERROR);
});
