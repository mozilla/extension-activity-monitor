import Popup from '../src/lib/ext-popup';
import * as ExtListen from '../src/lib/ext-listen';

test('test init popup when no extension is being monitored', async () => {
  document.body.innerHTML =
    '<div>' +
    '  <p id="monitorStatus"></p>' +
    '  <button id="startMonitorBtn"></button>' +
    '  <button id="stopMonitorBtn"></button>' +
    '  <button id="actLogPage"></button>' +
    '  <p id="errorText"></p>' +
    '</div>';

  const areExtsBeingMonitoredFn = jest.spyOn(
    ExtListen,
    'areExtsBeingMonitored'
  );

  const startBtn = document.getElementById('startMonitorBtn');
  const stopBtn = document.getElementById('stopMonitorBtn');
  const monitorStatus = document.getElementById('monitorStatus');
  const errorText = document.getElementById('errorText');

  const popup = new Popup();

  const renderMonitorStartedUIFn = jest.spyOn(popup, 'renderMonitorStartedUI');
  const addListenerPopupFn = jest.spyOn(popup, 'addListenerPopup');

  areExtsBeingMonitoredFn.mockImplementation(() => {
    return new Promise((resolve) => resolve(true));
  });

  await popup.init();
  expect(addListenerPopupFn).toBeCalledTimes(3);
  expect(renderMonitorStartedUIFn).toHaveBeenCalledTimes(1);

  expect(startBtn.classList.contains('disabled')).toBeTruthy();
  expect(startBtn.getAttribute('disabled')).toEqual('disabled');

  expect(stopBtn.classList.contains('disabled')).toBeFalsy();
  expect(stopBtn.getAttribute('disabled')).toBeNull();

  expect(monitorStatus.textContent).toBe('Extensions are being monitored');
  expect(monitorStatus.classList.contains('green')).toBeTruthy();
  expect(monitorStatus.classList.contains('red')).toBeFalsy();

  expect(errorText.textContent).toBe('');
});
