/* eslint no-unsanitized/property: "off" */
import fs from 'fs';
import path from 'path';
import { setImmediate } from 'timers';

import ActivityLog from '../src/lib/ext-activitylog';
import { FilterOption } from '../src/lib/web-component/filter-option/filter-option-element';
import { LogView } from '../src/lib/web-component/log-view/log-view-element';
import { FilterKeyword } from '../src/lib/web-component/filter-keyword/filter-keyword-element';
import { FilterTimestamp } from '../src/lib/web-component/filter-timestamp/filter-timestamp-element';

const activityLogHtml = fs.readFileSync(
  path.resolve(__dirname, '../src/activitylog/activitylog.html'),
  'utf-8'
);

const domParser = new DOMParser();

const activityLogBody = domParser.parseFromString(activityLogHtml, 'text/html')
  .body.innerHTML;

function observeChange(element) {
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      observer.disconnect();
      resolve();
    });
    observer.observe(element, { attributes: true });
  });
}

// This applies for other filter options, such as - view type,
// api type, api name
test('show/hide logs associated with extension id that is checked/unchecked from filter option', async () => {
  expect(window.customElements.get('log-view')).toBe(LogView);
  expect(window.customElements.get('filter-option')).toBe(FilterOption);
  expect(window.customElements.get('filter-timestamp')).toBe(FilterTimestamp);

  const logs = [
    {
      /* renders 1st row in table */
      id: 'id1@test',
      viewType: 'viewType1@test',
      type: 'type1@test',
      data: [{ test: 'test1@data' }],
      timeStamp: 1597686226302,
    },
    {
      /* renders 2nd row in table */
      id: 'id2@test',
      viewType: 'viewType2@test',
      type: 'type2@test',
      data: [{ test: 'test2@data' }],
      timeStamp: 1597686226302,
    },
  ];

  const addListener = jest.fn();
  const removeListener = jest.fn();
  const sendMessage = jest.fn();
  const connect = jest.fn();

  window.browser = {
    runtime: {
      onMessage: { addListener },
      sendMessage,
      connect,
    },
    menus: {
      onClicked: { addListener, removeListener },
      onHidden: { addListener, removeListener },
    },
  };

  sendMessage.mockImplementation(() => {
    return Promise.resolve({ existingLogs: [] });
  });

  document.body.innerHTML = activityLogBody;

  const { activityLog } = new ActivityLog();
  const extFilterBtn =
    activityLog.view.extFilter.shadowRoot.querySelector('.toggle-btn');

  activityLog.handleNewLogs(logs);

  const tableBody = activityLog.view.logView.shadowRoot.querySelector('tbody');
  const getTableRows = () => tableBody.querySelectorAll('tr');
  let tableRows = getTableRows();

  // Initially filter checkbox list is hidden
  expect(activityLog.view.extFilter.classList.contains('expanded')).toBeFalsy();

  const extFilterBtnChanged = observeChange(activityLog.view.extFilter);
  extFilterBtn.click();
  await extFilterBtnChanged;

  // the filter checkbox list dropdown is displayed
  expect(
    activityLog.view.extFilter.classList.contains('expanded')
  ).toBeTruthy();

  const firstCheckbox = activityLog.view.extFilter.shadowRoot
    .querySelector('.checkbox-list')
    .querySelector('.filter-checkbox');

  const isCheckboxChecked = () => firstCheckbox.querySelector('input').checked;

  // Checkbox is checked by default
  expect(isCheckboxChecked()).toBeTruthy();

  // verify the id of first table row is same as in above defined log object.
  expect(tableRows[0]._log.id).toBe('id1@test');

  expect(tableRows[0].hidden).toBeFalsy();
  // first table row will be hidden once checkbox is unchecked
  const tableRowPropChanged = observeChange(tableRows[0]);
  // unchecked the first checkbox with id: id1@test
  firstCheckbox.click();
  await tableRowPropChanged;
  expect(isCheckboxChecked()).toBeFalsy();

  expect(tableRows[0].hidden).toBeTruthy();
  // second row has a different extension id, so it should not be hidden
  expect(tableRows[1].hidden).toBeFalsy();

  // Hides new logs with an extension id that is in unchecked condition.
  const newLog = {
    id: 'id1@test',
    viewType: 'randomViewType@test',
    type: 'randomtype@test',
    data: [{ test: 'randomTestData' }],
    timeStamp: new Date(),
  };

  activityLog.handleNewLogs([newLog]);

  tableRows = getTableRows();
  // the 3rd row should be hidden, since it bears the same id as first row.
  expect(tableRows[0]._log.id).toEqual(tableRows[2]._log.id);
  expect(tableRows[2].hidden).toBeTruthy();

  //To show the logs with id: id1@test again, we will check the filter option.
  firstCheckbox.click();
  await tableRowPropChanged;
  expect(isCheckboxChecked()).toBeTruthy();

  // First row and third row will be showed.
  expect(tableRows[0].hidden).toBeFalsy();
  expect(tableRows[2].hidden).toBeFalsy();
  // second row is not affacted.
  expect(tableRows[1].hidden).toBeFalsy();
});

test("keyword search show a row when the given keyword is matched in log's data, otherwise hides the row", async () => {
  expect(window.customElements.get('filter-keyword')).toBe(FilterKeyword);

  history.replaceState(null, null, document.location.origin);

  const logs = [
    {
      /* renders 1st row in table */
      id: 'id1@test',
      viewType: 'viewType1@test',
      type: 'type1@test',
      data: [{ test: 'test1@data' }],
      timeStamp: 1597686226302,
    },
    {
      /* renders 2nd row in table */
      id: 'id2@test',
      viewType: 'viewType2@test',
      type: 'type2@test',
      data: [{ test: 'matched@data' }],
      timeStamp: 1597686226302,
    },
  ];

  const addListener = jest.fn();
  const removeListener = jest.fn();
  const sendMessage = jest.fn();
  const connect = jest.fn();

  window.browser = {
    runtime: {
      onMessage: { addListener },
      sendMessage,
      connect,
    },
    menus: {
      onClicked: { addListener, removeListener },
      onHidden: { addListener, removeListener },
    },
  };

  sendMessage.mockImplementation(() => {
    return Promise.resolve({ existingLogs: [] });
  });

  document.body.innerHTML = activityLogBody;

  const { activityLog } = new ActivityLog();

  activityLog.handleNewLogs(logs);

  const tableBody = activityLog.view.logView.shadowRoot.querySelector('tbody');
  const getTableRows = () => tableBody.querySelectorAll('tr');
  let tableRows = getTableRows();

  expect(tableRows[0].hidden).toBeFalsy();
  expect(tableRows[1].hidden).toBeFalsy();

  const searchInput = activityLog.view.keywordFilter.shadowRoot.querySelector(
    'input[name="keyword"]'
  );
  searchInput.value = 'matched@data';

  const tableRowPropChanged = observeChange(tableRows[0]);
  activityLog.view.keywordFilter.dispatchEvent(new Event('input'));
  await tableRowPropChanged;

  // only 2nd row should be visible since the keyword
  // matches with 2nd row's data.
  expect(tableRows[0].hidden).toBeTruthy();
  expect(tableRows[1].hidden).toBeFalsy();
});

test('clearing logs from activitylog page', async () => {
  history.replaceState(null, null, document.location.origin);

  const logs = [
    {
      /* renders 1st row in table */
      id: 'id1@test',
      viewType: 'viewType@test',
      type: 'type@test',
      data: [{ test: 'test1@data' }],
      timeStamp: 1597686226302,
    },
    {
      /* renders 2nd row in table */
      id: 'id2@test',
      viewType: 'viewType2@test',
      type: 'type2@test',
      data: [{ test: 'test2@data' }],
      timeStamp: 1597686226302,
    },
  ];

  const addListener = jest.fn();
  const removeListener = jest.fn();
  const sendMessage = jest.fn();
  const connect = jest.fn();

  window.browser = {
    runtime: {
      onMessage: { addListener },
      sendMessage,
      connect,
    },
    menus: {
      onClicked: { addListener, removeListener },
      onHidden: { addListener, removeListener },
    },
  };

  // sendMessage is called by getExistingLogs method for first 2 times
  // and it is called by clearBackgroundLogs() method on third time.
  sendMessage.mockResolvedValueOnce({ existingLogs: logs });
  sendMessage.mockResolvedValueOnce({ existingLogs: logs });
  sendMessage.mockResolvedValueOnce();

  document.body.innerHTML = activityLogBody;

  const { activityLog } = new ActivityLog();
  const clearBackgroundLogsFn = jest.spyOn(activityLog, 'clearBackgroundLogs');

  const clearLogBtn = activityLog.view.clearLogBtn;
  const tableBody = activityLog.view.logView.shadowRoot.querySelector('tbody');
  const getTableRows = () => tableBody.querySelectorAll('tr');

  await expect(activityLog.getExistingLogs()).resolves.toMatchObject(logs);
  expect(activityLog.model.logs).toMatchObject(logs);
  expect(getTableRows().length).toBe(2);

  const [row] = getTableRows();
  const { logDetailWrapper } = activityLog.view.logView;
  expect(logDetailWrapper.hidden).toBe(true);
  row.click();
  expect(logDetailWrapper.hidden).toBe(false);

  clearLogBtn.click();

  setImmediate(() => {
    expect(logDetailWrapper.hidden).toBe(true);
    expect(activityLog.model.logs).toMatchObject([]);
    expect(getTableRows().length).toBe(0);
  });
  expect(clearBackgroundLogsFn).toHaveBeenCalled();
});

test('timestamp is formatted and rendered correctly', () => {
  const logs = [
    {
      /* renders 1st row in table */
      id: 'id1@test',
      viewType: 'viewType@test',
      type: 'type@test',
      data: [{ test: 'test1@data' }],
      timeStamp: 1597686226302,
    },
  ];

  const addListener = jest.fn();
  const removeListener = jest.fn();
  const sendMessage = jest.fn();
  const connect = jest.fn();

  window.browser = {
    runtime: {
      onMessage: { addListener },
      sendMessage,
      connect,
    },
    menus: {
      onClicked: { addListener, removeListener },
      onHidden: { addListener, removeListener },
    },
  };

  sendMessage.mockImplementation(() => {
    return Promise.resolve({ existingLogs: [] });
  });

  document.body.innerHTML = activityLogBody;

  const originalIntlDateTimeFormat = Intl.DateTimeFormat;
  const IntlDateTimeFormatFn = jest.spyOn(Intl, 'DateTimeFormat');

  // For log timestamp: 1597686226302
  const expectedTime = '5:43:46 PM';
  const expectedDateTime = `Aug 17, 2020, 5:43:46 PM`;

  const { activityLog } = new ActivityLog();
  // To have consistant date time format, we choose "en-US" date time formatting and UTC timezone.
  IntlDateTimeFormatFn.mockImplementation((zone, options) => {
    options = { ...options, timeZone: 'UTC' };
    return new originalIntlDateTimeFormat('en-US', options);
  });

  activityLog.handleNewLogs(logs);

  const tableBody = activityLog.view.logView.shadowRoot.querySelector('tbody');
  const tableRows = tableBody.querySelectorAll('tr');
  const firstRowTimestamp = tableRows[0].querySelector('.timestamp');

  expect(firstRowTimestamp.textContent).toEqual(expectedTime);
  expect(firstRowTimestamp.title).toEqual(expectedDateTime);
});
