/* eslint no-unsanitized/property: "off" */
import fs from 'fs';
import path from 'path';
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

// This applies for other filter options, such as - view type, api type, api name
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
  const extFilterBtn = activityLog.view.extFilter.shadowRoot.querySelector(
    '.toggle-btn'
  );

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
  expect(logDetailWrapper.hidden).toBe(true);

  expect(clearBackgroundLogsFn).toHaveBeenCalled();
  expect(activityLog.model.logs).toMatchObject([]);
  expect(getTableRows().length).toBe(0);
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

test('the log detail view is displayed when a log is selected from log view', async () => {
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
      timeStamp: 1597686236402,
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
    return Promise.resolve({ existingLogs: logs });
  });

  document.body.innerHTML = activityLogBody;

  const emptyTableLabel = document
    .querySelector('log-view')
    .shadowRoot.querySelector('.table-empty-label');

  const emptyTableLabelHidden = observeChange(emptyTableLabel);
  const { activityLog } = new ActivityLog();
  await emptyTableLabelHidden;

  const tableBody = activityLog.view.logView.shadowRoot.querySelector('tbody');
  const tableRows = tableBody.querySelectorAll('tr');

  // log details section displayed
  const logDetailWrapper = activityLog.view.logView.shadowRoot.querySelector(
    '.log-detail-wrapper'
  );

  // log details is hidden initially
  expect(logDetailWrapper.hidden).toBeTruthy();

  const logDetailWrapperVisible = observeChange(logDetailWrapper);
  // Here a single row being clicked
  // The result is the same if any column of that row is clicked
  // the click event is triggered on the table body
  tableRows[0].dispatchEvent(new Event('click', { bubbles: true }));
  await logDetailWrapperVisible;

  const logDetails = JSON.parse(logDetailWrapper.firstElementChild.textContent);

  expect(logDetailWrapper.hidden).toBeFalsy();
  expect(logDetails).toMatchObject(tableRows[0]._log);

  // closing the log Detail viewer
  const logDetailWrapperHidden = observeChange(logDetailWrapper);
  logDetailWrapper.lastElementChild.click();
  await logDetailWrapperHidden;
  expect(logDetailWrapper.hidden).toBeTruthy();
});

describe('Filtering logs with timestamp', () => {
  test('context menu gets overrriden inside table body', () => {
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
        timeStamp: 1597686236402,
      },
      {
        /* renders 3rd row in table */
        id: 'id3@test',
        viewType: 'viewType3@test',
        type: 'type3@test',
        data: [{ test: 'test3@data' }],
        timeStamp: 1597686336402,
      },
      {
        /* renders 4th row in table */
        id: 'id4@test',
        viewType: 'viewType4@test',
        type: 'type4@test',
        data: [{ test: 'test4@data' }],
        timeStamp: 1597686436402,
      },
    ];

    const commonAddListener = jest.fn();
    const commonRemoveListener = jest.fn();
    const sendMessage = jest.fn();
    const connect = jest.fn();
    const overrideContext = jest.fn();
    const createMenu = jest.fn();
    const refreshMenu = jest.fn();
    const getTargetElement = jest.fn();

    window.browser = {
      runtime: {
        onMessage: { addListener: commonAddListener },
        sendMessage,
        connect,
      },
      menus: {
        onClicked: {
          addListener: commonAddListener,
          removeListener: commonRemoveListener,
        },
        onHidden: {
          addListener: commonAddListener,
          removeListener: commonRemoveListener,
        },
        create: createMenu,
        refresh: refreshMenu,
        overrideContext,
        getTargetElement,
      },
    };

    sendMessage.mockImplementation(() => {
      return Promise.resolve({ existingLogs: [] });
    });

    document.body.innerHTML = activityLogBody;

    const { activityLog } = new ActivityLog();
    activityLog.handleNewLogs(logs);

    const createContextMenuFn = jest.spyOn(
      activityLog.view.logView,
      'createContextMenu'
    );

    const tableBody = activityLog.view.logView.shadowRoot.querySelector(
      'tbody'
    );
    const tableRows = tableBody.querySelectorAll('tr');

    // note: we could even take other columns of the row
    const timestampColSecondRow = tableRows[1].querySelector('.timestamp');
    // generate a contextmenu event from timestamp column of the 2nd row of table body
    timestampColSecondRow.dispatchEvent(
      new Event('contextmenu', { bubbles: true })
    );

    expect(overrideContext).toHaveBeenCalled();
    expect(createContextMenuFn).toHaveBeenCalled();
    expect(createMenu).toHaveBeenCalled();
    expect(refreshMenu).toHaveBeenCalled();

    // Two menus have been added in context menu overrriding the existing menus
    // Those two menus are: "Start from this timestamp" and "Stop at this timestamp"
  });
  test('timestamp filter can be applied with the help of context menu', () => {
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
        timeStamp: 1597686236402,
      },
      {
        /* renders 3rd row in table */
        id: 'id3@test',
        viewType: 'viewType3@test',
        type: 'type3@test',
        data: [{ test: 'test3@data' }],
        timeStamp: 1597686336402,
      },
      {
        /* renders 4th row in table */
        id: 'id4@test',
        viewType: 'viewType4@test',
        type: 'type4@test',
        data: [{ test: 'test4@data' }],
        timeStamp: 1597686436402,
      },
    ];

    const commonAddListener = jest.fn();
    const commonRemoveListener = jest.fn();
    const sendMessage = jest.fn();
    const connect = jest.fn();
    const overrideContext = jest.fn();
    const createMenu = jest.fn();
    const refreshMenu = jest.fn();
    const getTargetElement = jest.fn();

    const expectedStartTime = 'Aug 17, 2020, 5:43:56 PM';
    const expectedStopTime = 'Aug 17, 2020, 5:45:36 PM';

    window.browser = {
      runtime: {
        onMessage: { addListener: commonAddListener },
        sendMessage,
        connect,
      },
      menus: {
        onClicked: {
          addListener: commonAddListener,
          removeListener: commonRemoveListener,
        },
        onHidden: {
          addListener: commonAddListener,
          removeListener: commonRemoveListener,
        },
        create: createMenu,
        refresh: refreshMenu,
        overrideContext,
        getTargetElement,
      },
    };

    sendMessage.mockImplementation(() => {
      return Promise.resolve({ existingLogs: [] });
    });

    document.body.innerHTML = activityLogBody;

    const { activityLog } = new ActivityLog();
    activityLog.handleNewLogs(logs);

    const tableBody = activityLog.view.logView.shadowRoot.querySelector(
      'tbody'
    );
    const tableRows = tableBody.querySelectorAll('tr');

    const timestampColSecondRow = tableRows[1].querySelector('.timestamp');
    const timestampColThirdRow = tableRows[2].querySelector('.timestamp');

    // We have generated the context menu event from second row, let's assume we clicked on the "Start from this timestamp" option from menu. This will trigger "setFilterRange" from filter-timestamp-element.js
    getTargetElement.mockImplementation((targetElementId) => {
      if (targetElementId === 123) {
        return timestampColSecondRow;
      } else if (targetElementId === 456) {
        return timestampColThirdRow;
      } else {
        return null;
      }
    });

    // when targetElementId is invalid, the request doesn't proceed
    activityLog.view.timestampFilter.setFilterRange({
      targetElementId: 912,
      menuItemId: 'startTime',
    });

    // applying the timestamp filter starting from second row
    // Thus rows before the second row i.e. first row will be hidden
    activityLog.view.timestampFilter.setFilterRange({
      targetElementId: 123,
      menuItemId: 'startTime',
    });

    expect(tableRows[0].hidden).toBeTruthy();
    expect(tableRows[1].hidden).toBeFalsy();
    expect(tableRows[2].hidden).toBeFalsy();
    expect(tableRows[3].hidden).toBeFalsy();

    // checking if the start is mentioned in dropdown
    const getStartTimeLabel = () =>
      activityLog.view.timestampFilter.startTimeLabel.textContent;
    expect(getStartTimeLabel()).toStrictEqual(expectedStartTime);

    // Now let's apply the stop timestamp to 3rd row of the table.
    // Thus it will hide the 4th row
    activityLog.view.timestampFilter.setFilterRange({
      targetElementId: 456,
      menuItemId: 'stopTime',
    });

    expect(tableRows[0].hidden).toBeTruthy();
    expect(tableRows[1].hidden).toBeFalsy();
    expect(tableRows[2].hidden).toBeFalsy();
    expect(tableRows[3].hidden).toBeTruthy();

    // checking if the stop is mentioned in dropdown
    const getStopTimeLabel = () =>
      activityLog.view.timestampFilter.stopTimeLabel.textContent;
    expect(getStopTimeLabel()).toStrictEqual(expectedStopTime);

    // Clearing timestamp filters
    activityLog.view.timestampFilter.clearStartTimeBtn.click();
    expect(getStartTimeLabel()).toStrictEqual('From Beginning');
    activityLog.view.timestampFilter.clearStopTimeBtn.click();
    expect(getStopTimeLabel()).toStrictEqual('Up to End');

    // since both the start and stop timestamp is cleared, all rows should be visible
    expect(tableRows[0].hidden).toBeFalsy();
    expect(tableRows[1].hidden).toBeFalsy();
    expect(tableRows[2].hidden).toBeFalsy();
    expect(tableRows[3].hidden).toBeFalsy();
  });
});
