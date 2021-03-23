/* eslint no-unsanitized/property: "off" */
import fs from 'fs';
import path from 'path';
import ActivityLog from '../src/lib/ext-activitylog';
import { FilterOption } from '../src/lib/web-component/filter-option/filter-option-element';
import { LogView } from '../src/lib/web-component/log-view/log-view-element';
import { FilterKeyword } from '../src/lib/web-component/filter-keyword/filter-keyword-element';
import { FilterTimestamp } from '../src/lib/web-component/filter-timestamp/filter-timestamp-element';
import { save } from '../src/lib/save-load';

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

describe('Filtering logs with filter-option component', () => {
  // This applies to filter options as well, such as - extension id, view type, api type, api name
  test('show/hide logs associated with extension id that is checked/unchecked from filter option', async () => {
    expect(window.customElements.get('log-view')).toBe(LogView);
    expect(window.customElements.get('filter-option')).toBe(FilterOption);
    expect(window.customElements.get('filter-timestamp')).toBe(FilterTimestamp);

    const logs = [
      {
        /* renders the 1st row in the table */
        id: 'id1@test',
        viewType: 'viewType1@test',
        type: 'type1@test',
        data: { test: 'test1@data' },
        timeStamp: 1597686226302,
      },
      {
        /* renders the 2nd row in the table */
        id: 'id2@test',
        viewType: 'viewType2@test',
        type: 'type2@test',
        data: { test: 'test2@data' },
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

    const tableBody = activityLog.view.logView.shadowRoot.querySelector(
      'tbody'
    );
    const getTableRows = () => tableBody.querySelectorAll('tr');
    let tableRows = getTableRows();

    // Initially filter checkbox list is hidden
    expect(
      activityLog.view.extFilter.classList.contains('expanded')
    ).toBeFalsy();

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

    const isCheckboxChecked = () =>
      firstCheckbox.querySelector('input').checked;

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
      data: { test: 'randomTestData' },
      timeStamp: new Date(),
    };

    activityLog.handleNewLogs([newLog]);

    tableRows = getTableRows();
    expect(tableRows[0]._log.id).toEqual(tableRows[2]._log.id);
    // the 3rd row should be hidden, since it bears the same id as first row.
    expect(tableRows[2].hidden).toBeTruthy();

    // To show the logs with id: id1@test again, we will check the filter option.
    firstCheckbox.click();
    await tableRowPropChanged;
    expect(isCheckboxChecked()).toBeTruthy();

    // First row and third row will be showed.
    expect(tableRows[0].hidden).toBeFalsy();
    expect(tableRows[2].hidden).toBeFalsy();
    // second row is not be affacted.
    expect(tableRows[1].hidden).toBeFalsy();
  });

  test('unchecking the "other" filter option should hide the logs with undefined viewType', async () => {
    const logs = [
      {
        /* renders the 1st row in the table */
        id: 'id1@test',
        viewType: 'viewType1@test',
        type: 'type1@test',
        data: { test: 'test1@data' },
        timeStamp: 1597686226302,
      },
      {
        /* renders the 2nd row in the table */
        id: 'id2@test',
        viewType: 'viewType2@test',
        type: 'type2@test',
        data: { test: 'test2@data' },
        timeStamp: 1597686226302,
      },
      {
        /* renders the 3rd row in the table */
        /* viewType is undefined */
        id: 'id3@test',
        viewType: undefined,
        type: 'api_event',
        data: { test: 'test2@data' },
        timeStamp: 1597989926302,
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

    const viewTypesFilterBtn = activityLog.view.viewTypeFilter.shadowRoot.querySelector(
      '.toggle-btn'
    );

    const tableBody = activityLog.view.logView.shadowRoot.querySelector(
      'tbody'
    );
    const getTableRows = () => tableBody.querySelectorAll('tr');
    let tableRows = getTableRows();

    // Initially filter checkbox list is hidden
    expect(
      activityLog.view.extFilter.classList.contains('expanded')
    ).toBeFalsy();

    const viewTypeFilterBtnChanged = observeChange(
      activityLog.view.viewTypeFilter
    );
    viewTypesFilterBtn.click();
    await viewTypeFilterBtnChanged;

    // the filter checkbox list dropdown is displayed
    expect(
      activityLog.view.viewTypeFilter.classList.contains('expanded')
    ).toBeTruthy();

    const otherLabledCheckbox = activityLog.view.viewTypeFilter.shadowRoot.querySelector(
      '.filter-checkbox input[value="other"]'
    );

    expect(otherLabledCheckbox.checked).toBeTruthy();

    expect(tableRows[0].hidden).toBeFalsy();
    expect(tableRows[1].hidden).toBeFalsy();
    expect(tableRows[2].hidden).toBeFalsy();

    const tableRowPropChanged = observeChange(tableRows[2]);
    otherLabledCheckbox.click();
    await tableRowPropChanged;

    expect(tableRows[0].hidden).toBeFalsy();
    expect(tableRows[1].hidden).toBeFalsy();
    // 3rd row contains the log with undefined viewType
    expect(tableRows[2].hidden).toBeTruthy();
  });
});

test('Searching by keyword should search in the data object of the log to filter out the logs', async () => {
  expect(window.customElements.get('filter-keyword')).toBe(FilterKeyword);

  history.replaceState(null, null, document.location.origin);

  const logs = [
    {
      /* renders the 1st row in the table */
      id: 'id1@test',
      viewType: 'viewType1@test',
      type: 'type1@test',
      data: { test: 'test1@data' },
      timeStamp: 1597686226302,
    },
    {
      /* renders the 2nd row in the table */
      id: 'id2@test',
      viewType: 'viewType2@test',
      type: 'type2@test',
      data: { test: 'test2@data' },
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
  const tableRows = getTableRows();

  expect(tableRows[0].hidden).toBeFalsy();
  expect(tableRows[1].hidden).toBeFalsy();

  const searchInput = activityLog.view.keywordFilter.shadowRoot.querySelector(
    'input[name="keyword"]'
  );
  searchInput.value = 'test2@data';

  const tableRowPropChanged = observeChange(tableRows[0]);
  activityLog.view.keywordFilter.dispatchEvent(new Event('input'));
  await tableRowPropChanged;

  // only 2nd row should be visible since the keyword is found in the stringify version of data object of the 2nd row .
  expect(tableRows[0].hidden).toBeTruthy();
  expect(tableRows[1].hidden).toBeFalsy();
});

test('clicking the clear logs button should remove all logs from activitylog page', async () => {
  history.replaceState(null, null, document.location.origin);

  const logs = [
    {
      /* renders the 1st row in the table */
      id: 'id1@test',
      viewType: 'viewType1@test',
      type: 'type1@test',
      data: { test: 'test1@data' },
      timeStamp: 1597686226302,
    },
    {
      /* renders the 2nd row in the table */
      id: 'id2@test',
      viewType: 'viewType2@test',
      type: 'type2@test',
      data: { test: 'test2@data' },
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

  // sendMessage is called by getExistingLogs method on the 1st time.
  // sendMessage is called by clearBackgroundLogs() method on the 2nd time.
  sendMessage.mockResolvedValueOnce({ existingLogs: logs });
  sendMessage.mockResolvedValueOnce();

  document.body.innerHTML = activityLogBody;

  const emptyTableLabel = document
    .querySelector('log-view')
    .shadowRoot.querySelector('.table-empty-label');

  const emptyTableLabelHidden = observeChange(emptyTableLabel);
  const { activityLog } = new ActivityLog();
  await emptyTableLabelHidden;

  const clearBackgroundLogsFn = jest.spyOn(activityLog, 'clearBackgroundLogs');

  const clearLogBtn = activityLog.view.clearLogBtn;
  const tableBody = activityLog.view.logView.shadowRoot.querySelector('tbody');
  const getTableRows = () => tableBody.querySelectorAll('tr');

  // expecting 2 rows appended in the table
  expect(getTableRows().length).toBe(2);

  const [row] = getTableRows();

  const { logDetailWrapper } = activityLog.view.logView;
  // Initially the log details is hidden (when no table is clicked)
  expect(logDetailWrapper.hidden).toBe(true);
  // clicking a row in the table to show logs details
  row.click();
  expect(logDetailWrapper.hidden).toBe(false);

  clearLogBtn.click();
  // the log details should be hidden after clearing all the logs.
  expect(logDetailWrapper.hidden).toBe(true);

  expect(clearBackgroundLogsFn).toHaveBeenCalled();
  expect(activityLog.model.logs).toMatchObject([]);
  expect(getTableRows().length).toBe(0);
});

test('timestamp should be correctly formatted', () => {
  const logs = [
    {
      /* renders the 1st row in table */
      id: 'id1@test',
      viewType: 'viewType@test',
      type: 'type@test',
      data: { test: 'test1@data' },
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

  const originalIntlDateTimeFormat = Intl.DateTimeFormat;
  const IntlDateTimeFormatFn = jest.spyOn(Intl, 'DateTimeFormat');

  // To have consistant date time format, we choose "en-US" date time formatting and UTC timezone.
  IntlDateTimeFormatFn.mockImplementation((zone, options) => {
    options = { ...options, timeZone: 'UTC' };
    return new originalIntlDateTimeFormat('en-US', options);
  });

  sendMessage.mockResolvedValue({ existingLogs: [] });

  document.body.innerHTML = activityLogBody;

  // For log timestamp: 1597686226302
  const expectedTime = '5:43:46 PM';
  const expectedDateTime = 'Aug 17, 2020, 5:43:46 PM';

  const { activityLog } = new ActivityLog();
  activityLog.handleNewLogs(logs);

  const tableBody = activityLog.view.logView.shadowRoot.querySelector('tbody');
  const tableRows = tableBody.querySelectorAll('tr');
  const firstRowTimestamp = tableRows[0].querySelector('.timestamp');

  expect(firstRowTimestamp.textContent).toEqual(expectedTime);
  expect(firstRowTimestamp.title).toEqual(expectedDateTime);

  // Clearing Intl mocks
  IntlDateTimeFormatFn.mockClear();
  Intl.DateTimeFormat = originalIntlDateTimeFormat;
});

test('log details should be displayed when a log is clicked from logs table', async () => {
  const logs = [
    {
      /* renders the 1st row in table */
      id: 'id1@test',
      viewType: 'viewType1@test',
      type: 'type1@test',
      data: { test: 'test1@data' },
      timeStamp: 1597686226302,
    },
    {
      /* renders the 2nd row in table */
      id: 'id2@test',
      viewType: 'viewType2@test',
      type: 'type2@test',
      data: { test: 'test2@data' },
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
  const logDetailWrapper = activityLog.view.logView.shadowRoot.querySelector(
    '.log-detail-wrapper'
  );

  // log details is hidden initially
  expect(logDetailWrapper.hidden).toBeTruthy();

  const logDetailWrapperVisible = observeChange(logDetailWrapper);
  // The result is the same if any column (including "id") of that row is clicked
  tableRows[0].querySelector('.id').click();
  await logDetailWrapperVisible;

  const logDetailsJSON = JSON.parse(
    logDetailWrapper.firstElementChild.textContent
  );
  const expectedLogDetails = tableRows[0]._log;

  expect(logDetailWrapper.hidden).toBeFalsy();
  expect(logDetailsJSON).toMatchObject(expectedLogDetails);

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
        /* renders the 1st row in table */
        id: 'id1@test',
        viewType: 'viewType1@test',
        type: 'type1@test',
        data: { test: 'test1@data' },
        timeStamp: 1597686226302,
      },
      {
        /* renders the 2nd row in table */
        id: 'id2@test',
        viewType: 'viewType2@test',
        type: 'type2@test',
        data: { test: 'test2@data' },
        timeStamp: 1597686236402,
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

    sendMessage.mockResolvedValue({ existingLogs: [] });

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

    // Selecting any other columns of the row would give us the same result.
    const timestampCol = tableRows[1].querySelector('.timestamp');
    // generate a contextmenu event from timestamp column of the 2nd row of table body
    timestampCol.dispatchEvent(new Event('contextmenu', { bubbles: true }));

    // Two menus have been added in the context menu overrriding the existing menus with the help of Menus API
    // Those two menus are: "Start from this timestamp" and "Stop at this timestamp", which helps in filtering the logs from a certain timestamp.

    expect(overrideContext).toHaveBeenCalled();
    expect(createContextMenuFn).toHaveBeenCalled();
    expect(createMenu).toHaveBeenCalled();
    expect(refreshMenu).toHaveBeenCalled();
  });

  test('timestamp filter can be applied with the help of context menu', () => {
    const logs = [
      {
        /* renders the 1st row in the table */
        id: 'id1@test',
        viewType: 'viewType1@test',
        type: 'type1@test',
        data: { test: 'test1@data' },
        timeStamp: 1597686226302,
      },
      {
        /* renders the 2nd row in the table */
        id: 'id2@test',
        viewType: 'viewType2@test',
        type: 'type2@test',
        data: { test: 'test2@data' },
        timeStamp: 1597686236402,
      },
      {
        /* renders the 3rd row in the table */
        id: 'id3@test',
        viewType: 'viewType3@test',
        type: 'type3@test',
        data: { test: 'test3@data' },
        timeStamp: 1597686336402,
      },
      {
        /* renders the 4th row in the table */
        id: 'id4@test',
        viewType: 'viewType4@test',
        type: 'type4@test',
        data: { test: 'test4@data' },
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

    const originalIntlDateTimeFormat = Intl.DateTimeFormat;
    const IntlDateTimeFormatFn = jest.spyOn(Intl, 'DateTimeFormat');

    // To have consistant date time format, we choose "en-US" date time formatting and UTC timezone.
    IntlDateTimeFormatFn.mockImplementation((zone, options) => {
      options = { ...options, timeZone: 'UTC' };
      return new originalIntlDateTimeFormat('en-US', options);
    });

    sendMessage.mockResolvedValue({ existingLogs: [] });

    document.body.innerHTML = activityLogBody;

    const { activityLog } = new ActivityLog();
    activityLog.handleNewLogs(logs);

    const tableBody = activityLog.view.logView.shadowRoot.querySelector(
      'tbody'
    );
    const tableRows = tableBody.querySelectorAll('tr');

    const timestampCol2ndRow = tableRows[1].querySelector('.timestamp');
    const timestampCol3rdRow = tableRows[2].querySelector('.timestamp');

    // Context menu event is fired from the 2nd row, let's assume we clicked on the "Start from this timestamp" option from menu. This will trigger the "setFilterRange" method from filter-timestamp-element.js
    getTargetElement.mockImplementation((targetElementId) => {
      if (targetElementId === 123) {
        return timestampCol2ndRow;
      } else if (targetElementId === 456) {
        return timestampCol3rdRow;
      } else {
        return null;
      }
    });

    // The valid targetElementId are 123 and 456 as mentioned above
    // When targetElementId is invalid, the request doesn't proceed
    activityLog.view.timestampFilter.setFilterRange({
      targetElementId: 912,
      menuItemId: 'startTime',
    });

    // Applying the timestamp filter starting from 2nd row
    // Thus rows before the second row i.e. the 1st row will be hidden
    activityLog.view.timestampFilter.setFilterRange({
      targetElementId: 123,
      menuItemId: 'startTime',
    });

    expect(tableRows[0].hidden).toBeTruthy();
    expect(tableRows[1].hidden).toBeFalsy();
    expect(tableRows[2].hidden).toBeFalsy();
    expect(tableRows[3].hidden).toBeFalsy();

    // Checking if the start time is displayed correctly in timestamp filter dropdown
    const getStartTimeLabel = () =>
      activityLog.view.timestampFilter.startTimeLabel.textContent;
    expect(getStartTimeLabel()).toStrictEqual(expectedStartTime);

    // Now let's apply the stop timestamp to the 3rd row of the table.
    // Thus it will hide the rows below the 3rd row, i.e. the 4th row
    activityLog.view.timestampFilter.setFilterRange({
      targetElementId: 456,
      menuItemId: 'stopTime',
    });

    expect(tableRows[0].hidden).toBeTruthy();
    expect(tableRows[1].hidden).toBeFalsy();
    expect(tableRows[2].hidden).toBeFalsy();
    expect(tableRows[3].hidden).toBeTruthy();

    // checking if the stop time is displayed correctly in timestamp filter dropdown
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

  test('remove context menu items on hidding the menu', () => {
    const removeAllFn = jest.fn();

    window.browser = {
      runtime: {
        onMessage: { addListener: jest.fn() },
        sendMessage: jest.fn().mockResolvedValue({ existingLogs: [] }),
        connect: jest.fn(),
      },
      menus: {
        onClicked: {
          addListener: jest.fn(),
          removeListener: jest.fn(),
        },
        removeAll: removeAllFn,
        onHidden: {
          addListener: jest.fn(),
          removeListener: jest.fn(),
        },
        create: jest.fn(),
        refresh: jest.fn(),
        overrideContext: jest.fn(),
        getTargetElement: jest.fn(),
      },
    };

    document.body.innerHTML = activityLogBody;

    const { activityLog } = new ActivityLog();

    activityLog.view.timestampFilter.onHiddenListener();

    // removeAll() from the Menus API should be called.
    expect(removeAllFn).toHaveBeenCalled();
  });

  test('Clicking the timestamp filter component should toggle the dropdown', async () => {
    window.browser = {
      runtime: {
        onMessage: { addListener: jest.fn() },
        sendMessage: jest.fn().mockResolvedValue({ existingLogs: [] }),
        connect: jest.fn(),
      },
      menus: {
        onClicked: {
          addListener: jest.fn(),
          removeListener: jest.fn(),
        },
        onHidden: {
          addListener: jest.fn(),
          removeListener: jest.fn(),
        },
        create: jest.fn(),
        refresh: jest.fn(),
        overrideContext: jest.fn(),
        getTargetElement: jest.fn(),
      },
    };

    document.body.innerHTML = activityLogBody;

    const { activityLog } = new ActivityLog();
    const timestampFilter = activityLog.view.timestampFilter;

    // the dropdown is hidden initially
    expect(timestampFilter.classList.contains('expanded')).toBeFalsy();

    const timestampFilterPromise = observeChange(timestampFilter);
    activityLog.view.timestampFilter.filterToggleBar.click();
    await timestampFilterPromise;

    // the dropdown is shown
    expect(timestampFilter.classList.contains('expanded')).toBeTruthy();
  });

  // menu APIs aren't available in Devtools
  // see: https://github.com/mozilla/extension-activity-monitor/issues/43
  test('context menu should not work on Devtools', () => {
    window.browser = {
      runtime: {
        onMessage: { addListener: jest.fn() },
        sendMessage: jest.fn().mockResolvedValue({ existingLogs: [] }),
        connect: jest.fn(),
      },
    };

    document.body.innerHTML = activityLogBody;

    const { activityLog } = new ActivityLog();

    expect(activityLog.view.timestampFilter).not.toBeUndefined();
    expect(browser.menus).toBeUndefined();
  });
});

test('viewtype data cell should display empty value when viewtype of a log is undefined', async () => {
  const logs = [
    {
      /* renders the 1st row in table */
      id: 'id1@test',
      viewType: undefined,
      type: 'content_script',
      data: { test: 'test1@data' },
      timeStamp: 1597686226302,
    },
    {
      /* renders the 2nd row in table */
      id: 'id2@test',
      viewType: 'viewType2@test',
      type: 'type2@test',
      data: { test: 'test2@data' },
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

  expect(tableRows[0].querySelector('.view-type').textContent).toBe('');
  expect(tableRows[1].querySelector('.view-type').textContent).toBe(
    'viewType2@test'
  );
});

test('log detail is toggled when a table row is clicked', async () => {
  const logs = [
    {
      /* renders the 1st row in table */
      id: 'id1@test',
      viewType: undefined,
      type: 'content_script',
      data: { test: 'test1@data' },
      timeStamp: 1597686226302,
    },
    {
      /* renders the 2nd row in table */
      id: 'id2@test',
      viewType: 'viewType2@test',
      type: 'type2@test',
      data: { test: 'test2@data' },
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

  const emptyTableLabelChange = observeChange(emptyTableLabel);
  const { activityLog } = new ActivityLog();
  await emptyTableLabelChange;

  const logTableWrapper = activityLog.view.logView.logTableWrapper;
  const logDetailWrapper = activityLog.view.logView.logDetailWrapper;
  const tableBody = activityLog.view.logView.shadowRoot.querySelector('tbody');
  const tableRows = tableBody.querySelectorAll('tr');

  // when no row is selected
  expect(tableRows[0].classList.contains('row-highlight')).toBeFalsy();
  expect(tableRows[1].classList.contains('row-highlight')).toBeFalsy();
  expect(logTableWrapper.classList.contains('width-60')).toBeFalsy();
  expect(logDetailWrapper.hidden).toBeTruthy();

  const logTableWrapperChange = observeChange(logTableWrapper);
  tableRows[0].click();
  await logTableWrapperChange;

  // when a row is selected
  expect(tableRows[0].classList.contains('row-highlight')).toBeTruthy();
  expect(tableRows[1].classList.contains('row-highlight')).toBeFalsy();
  expect(logTableWrapper.classList.contains('width-60')).toBeTruthy();
  expect(logDetailWrapper.hidden).toBeFalsy();

  // the detail sidebar is hidden when the close button is clicked
  const closeBtn = logDetailWrapper.querySelector('.close');
  closeBtn.click();
  await logTableWrapperChange;

  expect(tableRows[0].classList.contains('row-highlight')).toBeFalsy();
  expect(tableRows[1].classList.contains('row-highlight')).toBeFalsy();
  expect(logTableWrapper.classList.contains('width-60')).toBeFalsy();
  expect(logDetailWrapper.hidden).toBeTruthy();
});

test('loadLogs method is being called when a log file is loaded', async () => {
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

  const { loadLogFile } = activityLog.view;
  const loadLogsFn = jest.spyOn(activityLog, 'loadLogs');

  loadLogFile.dispatchEvent(new Event('change'));

  expect(loadLogFile.value).toBe('');
  expect(loadLogsFn).toHaveBeenCalled();
});

test('setError method should display error message', () => {
  document.body.innerHTML = activityLogBody;

  const { activityLog } = new ActivityLog();

  activityLog.view.setError('This is an error message');
  expect(activityLog.view.notice.textContent).toBe('This is an error message');
  expect(activityLog.view.notice.classList.contains('failure')).toBeTruthy();

  // error message should be empty string and failure class should be removed upon passing null as argument to setError method
  activityLog.view.setError(null);
  expect(activityLog.view.notice.textContent).toBe('');
  expect(activityLog.view.notice.classList.contains('failure')).toBeFalsy();
});

test('activitylog page - load log page mode is initialized when "file" search param is present', async () => {
  const logs = [
    {
      /* renders the 1st row in table */
      id: 'id1@test',
      viewType: 'viewType1@test',
      type: 'type1@test',
      data: { test: 'test1@data' },
      timeStamp: 1597686226302,
    },
    {
      /* renders the 2nd row in table */
      id: 'id2@test',
      viewType: 'viewType2@test',
      type: 'type2@test',
      data: { test: 'check@data' },
      timeStamp: 1597686226302,
    },
  ];

  const getCurrent = jest.fn();
  const sendMessage = jest.fn();
  const connect = jest.fn();

  window.browser = {
    runtime: {
      onMessage: { addListener: jest.fn() },
      sendMessage,
      connect,
    },
    tabs: { getCurrent },
  };

  getCurrent.mockImplementation(() => {
    return Promise.resolve({ id: 11 });
  });

  sendMessage.mockImplementation(() => {
    return Promise.resolve(logs);
  });

  const fileName = 'activitylogs.json';
  const expectedPageMode = 'Loaded Logs - activitylogs.json';

  history.replaceState(
    null,
    null,
    `${location.href.split('?')[0]}?file=${fileName}`
  );

  document.body.innerHTML = activityLogBody;

  const { activityLog } = new ActivityLog();

  await activityLog.init();

  expect(activityLog.view.pageType.textContent).toBe(expectedPageMode);
  expect(document.title).toBe(expectedPageMode);
});

test('activity log page shows error when sendMessage API with requestType getLoadedLogs is failed', async () => {
  const getCurrent = jest.fn();
  const sendMessage = jest.fn();
  const connect = jest.fn();

  window.browser = {
    runtime: {
      onMessage: { addListener: jest.fn() },
      sendMessage,
      connect,
    },
    tabs: { getCurrent },
  };

  getCurrent.mockImplementation(() => {
    return Promise.resolve({ id: 11 });
  });

  const errorMsg = 'logs not found';

  sendMessage.mockImplementationOnce(() => {
    throw new Error(errorMsg);
  });

  const fileName = 'activitylogs.json';

  history.replaceState(
    null,
    null,
    `${location.href.split('?')[0]}?file=${fileName}`
  );

  document.body.innerHTML = activityLogBody;

  const { activityLog } = new ActivityLog();

  const noticeChangePromise = observeChange(activityLog.view.notice);
  await noticeChangePromise;

  expect(activityLog.view.notice.textContent).toBe(errorMsg);
});

test('onMessageListener is listening for new logs in activitylog page', async () => {
  const log = {
    id: 'id1@test',
    viewType: 'viewType1@test',
    type: 'type1@test',
    data: [{ test: 'test1@data' }],
    timeStamp: 1597686226302,
  };

  const invalidRqstType = 'wrong-request-type';

  const invalidMsgObj = {
    requestTo: 'not-activity-log',
    requestType: invalidRqstType,
    log,
  };

  const invalidRqstTypeInMsgObj = {
    requestTo: 'activity-log',
    requestType: invalidRqstType,
    log,
  };

  const validMsgObj = {
    requestTo: 'activity-log',
    requestType: 'appendLogs',
    log,
  };

  document.body.innerHTML = activityLogBody;

  const { activityLog } = new ActivityLog();
  const handleNewLogsFn = jest.spyOn(activityLog, 'handleNewLogs');

  activityLog.onMessageListener(invalidMsgObj);
  expect(handleNewLogsFn).not.toHaveBeenCalled();

  activityLog.onMessageListener(validMsgObj);
  expect(handleNewLogsFn).toHaveBeenCalled();

  const errorPromise = activityLog.onMessageListener(invalidRqstTypeInMsgObj);

  await expect(errorPromise).rejects.toThrowError(
    `wrong request type found - ${invalidRqstType}`
  );
});

test('matchFilterViewType should return true if log type is content_script', () => {
  const log = {
    id: 'id1@test',
    viewType: 'viewType1@test',
    type: 'content_script',
    data: [{ test: 'test1@data' }],
    timeStamp: 1597686226302,
  };

  document.body.innerHTML = activityLogBody;

  const { activityLog } = new ActivityLog();

  expect(activityLog.model.matchFilterViewType(log)).toBeTruthy();
});

test('matchFilterApiName should return true if log type is content_script', () => {
  const log = {
    id: 'id1@test',
    viewType: 'viewType1@test',
    type: 'content_script',
    data: [{ test: 'test1@data' }],
    timeStamp: 1597686226302,
  };

  document.body.innerHTML = activityLogBody;

  const { activityLog } = new ActivityLog();

  expect(activityLog.model.matchFilterApiName(log)).toBeTruthy();
});

test('matchFilterTabId should return true if tabId is absent in filter object', () => {
  const logWithoutTabId = {
    id: 'id1@test',
    viewType: 'viewType1@test',
    type: 'content_script',
    data: { test: 'test1@data' },
    timeStamp: 1597686226302,
  };

  const logWithTabId = {
    id: 'id1@test',
    viewType: 'viewType1@test',
    type: 'content_script',
    data: { test: 'test1@data', tabId: 12 },
    timeStamp: 1597686226302,
  };

  document.body.innerHTML = activityLogBody;

  const { activityLog } = new ActivityLog();

  expect(activityLog.model.matchFilterTabId(logWithoutTabId.data)).toBeTruthy();

  // assigning tabId in the filter object to check whether it matches with the log's tabId.
  activityLog.model.filter.tabId = 5;

  // logWithTabId.data.tabId = 12 and activityLog.model.filter.tabId = 5
  expect(activityLog.model.matchFilterTabId(logWithTabId.data)).toBeFalsy();
});

test('clicking on options icon should toggle the options dropdown list', () => {
  document.body.innerHTML = activityLogBody;

  const { activityLog } = new ActivityLog();
  const optionsBtn = activityLog.view.optionsBtn;

  expect(optionsBtn.classList.contains('expanded')).toBeFalsy();
  optionsBtn.click();
  // dropdown list shows when the optionsBtn element contains `expanded` class
  expect(optionsBtn.classList.contains('expanded')).toBeTruthy();
});

test('clicking on Save Logs button should call the saveLogs method in controller', async () => {
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

  history.replaceState(null, null, `${location.href.split('?')[0]}`);

  const { activityLog } = new ActivityLog();

  const saveLogsFn = jest.spyOn(activityLog, 'saveLogs');
  const optionsBtn = activityLog.view.optionsBtn;
  const saveLogBtn = activityLog.view.saveLogBtn;

  optionsBtn.click();
  saveLogBtn.click();

  expect(saveLogsFn).toBeCalled();
});

// activity log page controller
test('invalid event in handleEvent Method should render an error message', () => {
  document.body.innerHTML = activityLogBody;
  const { activityLog } = new ActivityLog();

  const eventType = 'invalid-event';
  const invalidEventObj = {
    type: eventType,
    target: { id: 'invalid' },
  };

  const expectedErrorMsg = `wrong event type - ${eventType}`;

  activityLog.view.handleEvent(invalidEventObj);
  expect(activityLog.view.notice.textContent).toBe(expectedErrorMsg);
});

test('filter option should set from URL params initially', () => {
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

  history.replaceState(
    null,
    null,
    `${
      location.href.split('?')[0]
    }?id=["addon1@test","addon2@test"]&viewType=[null,"popup","tab"]&type=["content_script","api_event", "api_call"]&name=["tabs.executeScript", "webNavigation.onCompleted"]&timeStamp={"start": 1614520117000,"stop":1614520168000}&keyword=dummy&tabId=682`
  );

  const expectedExtIds = new Set(['addon1@test', 'addon2@test']);
  const expectedViewTypes = new Set([undefined, 'popup', 'tab']);
  const expectedApiTypes = new Set(['content_script', 'api_event', 'api_call']);
  const expectedApiNames = new Set([
    'tabs.executeScript',
    'webNavigation.onCompleted',
  ]);
  const expectedTabId = 682;
  const expectedTabInfoText = `Filtered By Tab Id: ${expectedTabId}`;
  const expectedKeyword = 'dummy';
  const expectedTimestamp = { start: 1614520117000, stop: 1614520168000 };

  const expectedFilterObject = {
    id: { exclude: expectedExtIds },
    viewType: { exclude: expectedViewTypes },
    type: { exclude: expectedApiTypes },
    name: { exclude: expectedApiNames },
    tabId: expectedTabId,
    keyword: expectedKeyword,
    timeStamp: expectedTimestamp,
  };

  const {
    activityLog: { model, view },
  } = new ActivityLog();

  // check if the filters are set in model
  expect(model.filter).toMatchObject(expectedFilterObject);

  // check if the filters are set in view
  expect(view.extFilter.uncheckedCheckboxLabels).toMatchObject(expectedExtIds);
  expect(view.viewTypeFilter.uncheckedCheckboxLabels).toMatchObject(
    expectedViewTypes
  );
  expect(view.apiTypeFilter.uncheckedCheckboxLabels).toMatchObject(
    expectedApiTypes
  );
  expect(view.apiNameFilter.uncheckedCheckboxLabels).toMatchObject(
    expectedApiNames
  );
  expect(view.filterIdTxt.textContent).toBe(expectedTabInfoText);
  expect(view.keywordFilter.inputBox.value).toBe(expectedKeyword);
  expect(view.timestampFilter.timeStamp).toMatchObject(expectedTimestamp);
});

test('tabId in search param should filter logs by the given tab id', () => {
  const logs = [
    {
      id: 'logWithoutTabId@test',
      viewType: 'viewType1@test',
      type: 'content_script',
      data: { test: 'test1@data' },
      timeStamp: 1597686226302,
    },
    {
      id: 'logWithTabId@test',
      viewType: 'viewType1@test',
      type: 'content_script',
      data: { test: 'test1@data', tabId: 982 },
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

  history.replaceState(null, null, `${location.href.split('?')[0]}?tabId=982`);

  const { activityLog } = new ActivityLog();

  activityLog.handleNewLogs(logs);

  const tableBody = activityLog.view.logView.tableBody;
  const getTableRows = () => tableBody.rows;
  let tableRows = getTableRows();

  expect(tableRows[0].hidden).toBeTruthy();
  // since the log of the 2nd row contains the searched tabId
  expect(tableRows[1].hidden).toBeFalsy();
});

test('handleEvent should display error message if wrong event is found', () => {
  history.replaceState(null, null, `${location.origin}`);
  document.body.innerHTML = activityLogBody;

  const { activityLog } = new ActivityLog();

  const invalidEvtType = 'invalidType';
  const invalidEvt = new Event(invalidEvtType);
  const expectedErrorMsg = `wrong event type found - ${invalidEvtType}`;

  activityLog.handleEvent(invalidEvt);
  expect(activityLog.view.notice.textContent).toBe(expectedErrorMsg);
});

test('activity log page shows error when sendMessage API with requestType loadLogs is failed', async () => {
  const sendMessage = jest.fn();
  const connect = jest.fn();

  window.browser = {
    runtime: {
      onMessage: { addListener: jest.fn() },
      sendMessage,
      connect,
    },
  };

  const errorMsg = 'could not load logs';
  const file = 'activitylogs.json';

  sendMessage.mockImplementation((req) => {
    if (req.requestType === 'sendAllLogs') {
      return Promise.resolve({ existingLogs: [] });
    } else if (req.requestType === 'loadLogs') {
      // throwing the error intentionally
      throw new Error(errorMsg);
    }
  });

  history.replaceState(null, null, `${location.origin}`);

  document.body.innerHTML = activityLogBody;

  const { activityLog } = new ActivityLog();
  await activityLog.loadLogs(file);

  expect(activityLog.view.notice.textContent).toBe(errorMsg);
});

test('activity log page shows error when sendMessage API with requestType saveLogs is failed', async () => {
  const sendMessage = jest.fn();
  const connect = jest.fn();

  window.browser = {
    runtime: {
      onMessage: { addListener: jest.fn() },
      sendMessage,
      connect,
    },
  };

  const errorMsg = 'could not save logs';

  sendMessage.mockImplementation(() => {
    return Promise.resolve({ existingLogs: [] });
  });

  const saveLogsFn = jest.spyOn(save, 'saveAsJSON');

  saveLogsFn.mockImplementation(() => {
    throw new Error(errorMsg);
  });

  history.replaceState(null, null, `${document.location.origin}`);

  document.body.innerHTML = activityLogBody;

  const { activityLog } = new ActivityLog();
  await activityLog.saveLogs();

  expect(saveLogsFn).toBeCalled();

  expect(activityLog.view.notice.textContent).toBe(errorMsg);
});
