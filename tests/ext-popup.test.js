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

test('test popup UI when extension is being monitored', async () => {
  document.body.innerHTML = popupBody;

  const areExtsBeingMonitoredFn = jest.spyOn(
    ExtListen,
    'areExtsBeingMonitored'
  );

  const popup = new Popup();

  const startBtn = popup.startMonitorAllBtn;
  const stopBtn = popup.stopMonitorAllBtn;
  const monitorStatus = popup.monitorStatusText;
  const errorText = popup.errorMsgText;

  areExtsBeingMonitoredFn.mockImplementation(() => {
    return new Promise((resolve) => resolve(true));
  });

  await popup.init();

  expect(startBtn.classList.contains('disabled')).toBeTruthy();
  expect(startBtn.getAttribute('disabled')).toEqual('disabled');

  expect(stopBtn.classList.contains('disabled')).toBeFalsy();
  expect(stopBtn.getAttribute('disabled')).toBeNull();

  expect(monitorStatus.textContent).toBe('Extensions are being monitored');
  expect(monitorStatus.classList.contains('green')).toBeTruthy();
  expect(monitorStatus.classList.contains('red')).toBeFalsy();

  expect(errorText.textContent).toBe('');
});
