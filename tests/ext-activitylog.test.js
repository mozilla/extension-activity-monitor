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
        /* renders 1st row in the table */
        id: 'id1@test',
        viewType: 'viewType1@test',
        type: 'type1@test',
        data: { test: 'test1@data' },
        timeStamp: 1597686226302,
      },
      {
        /* renders 2nd row in the table */
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

  test('filter option labels should be added from URL params initially', () => {
    // Todo: pass a Set of Strings (filter labels) as an argument to setInitialFilter method and test if the labels are added to "uncheckedCheckboxLabels".
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

    const filterCheckboxLabels = new Set(['label1', 'label2']);

    activityLog.view.extFilter.setInitialFilter(filterCheckboxLabels);

    expect(activityLog.view.extFilter.uncheckedCheckboxLabels).toStrictEqual(
      filterCheckboxLabels
    );
  });

  test('unchecking the "other" filter option should hide the logs with undefined viewType', async () => {
    const logs = [
      {
        /* renders 1st row in the table */
        id: 'id1@test',
        viewType: 'viewType1@test',
        type: 'type1@test',
        data: { test: 'test1@data' },
        timeStamp: 1597686226302,
      },
      {
        /* renders 2nd row in the table */
        id: 'id2@test',
        viewType: 'viewType2@test',
        type: 'type2@test',
        data: { test: 'test2@data' },
        timeStamp: 1597686226302,
      },
      {
        /* renders 3nd row in the table */
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

    const extFilterBtnChanged = observeChange(activityLog.view.viewTypeFilter);
    viewTypesFilterBtn.click();
    await extFilterBtnChanged;

    // the filter checkbox list dropdown is displayed
    expect(
      activityLog.view.viewTypeFilter.classList.contains('expanded')
    ).toBeTruthy();

    const otherLabledCheckbox = activityLog.view.viewTypeFilter.shadowRoot.querySelector(
      '.checkbox-list .filter-checkbox input[value="other"]'
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
    // 3rd row contain the log with undefined viewType
    expect(tableRows[2].hidden).toBeTruthy();
  });
});

test('Searching by keyword should check the data object of the log to filter out the unmatched logs', async () => {
  expect(window.customElements.get('filter-keyword')).toBe(FilterKeyword);

  history.replaceState(null, null, document.location.origin);

  const logs = [
    {
      /* renders 1st row in the table */
      id: 'id1@test',
      viewType: 'viewType1@test',
      type: 'type1@test',
      data: { test: 'test1@data' },
      timeStamp: 1597686226302,
    },
    {
      /* renders 2nd row in the table */
      id: 'id2@test',
      viewType: 'viewType2@test',
      type: 'type2@test',
      data: { test: 'check@data' },
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
  searchInput.value = 'check@data';

  const tableRowPropChanged = observeChange(tableRows[0]);
  activityLog.view.keywordFilter.dispatchEvent(new Event('input'));
  await tableRowPropChanged;

  // only 2nd row should be visible since the keyword is found in the data object of the 2nd row .
  expect(tableRows[0].hidden).toBeTruthy();
  expect(tableRows[1].hidden).toBeFalsy();
});

test('clearing logs from activitylog page', async () => {
  history.replaceState(null, null, document.location.origin);

  const logs = [
    {
      /* renders 1st row in the table */
      id: 'id1@test',
      viewType: 'viewType@test',
      type: 'type@test',
      data: [{ test: 'test1@data' }],
      timeStamp: 1597686226302,
    },
    {
      /* renders 2nd row in the table */
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
  const expectedDateTime = 'Aug 17, 2020, 5:43:46 PM';

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
  // The result is the same if any column of that row is clicked
  // the click event is triggered on the table body
  tableRows[0].querySelector('.id').click();
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
        /* renders 1st row in the table */
        id: 'id1@test',
        viewType: 'viewType1@test',
        type: 'type1@test',
        data: [{ test: 'test1@data' }],
        timeStamp: 1597686226302,
      },
      {
        /* renders 2nd row in the table */
        id: 'id2@test',
        viewType: 'viewType2@test',
        type: 'type2@test',
        data: [{ test: 'test2@data' }],
        timeStamp: 1597686236402,
      },
      {
        /* renders 3rd row in the table */
        id: 'id3@test',
        viewType: 'viewType3@test',
        type: 'type3@test',
        data: [{ test: 'test3@data' }],
        timeStamp: 1597686336402,
      },
      {
        /* renders 4th row in the table */
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

  test('timestamp filter should be applied from URL params initially', () => {
    // when there is no valid url params for timestamp filter, the "setInitialFilter" method recevies "null" as an argument.
    // Todo: Pass null as argument in setInitialFilter method & test
    // If the timestamp URL param is valid, setInitialFilter recevies an object as argument with "startTime" and "stopTime" property.
    // Todo: pass an object as argument in setInitialFilter method & test if the timestamp filter dropdown layout is updated accordingly.
    /* Should be handled from caller in ext-activitylog.js */
  });

  test('remove context menu items on hidding the menu', () => {
    // Todo: Mock the api: browser.menus.removeAll() and test if it has been called.
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

    expect(removeAllFn).toHaveBeenCalled();
  });

  test('dropdown is toggled on clicking Timestamp Filter option', async () => {
    // Click on the filter option and test if the dropdown is shown.
    // Click again to hide the dropdown and test if the dropdown is hidden.
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

    // the dropdown is hidden
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
    // Todo: Don't mock the menu APIs and test the menu api listeners aren't registered.

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
  // Todo: add a row with a log which has undefined viewType and test if the view type data cell is empty.
  const logs = [
    {
      /* renders 1st row in table */
      id: 'id1@test',
      viewType: undefined,
      type: 'content_script',
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

  expect(tableRows[0].querySelector('.view-type').textContent).toBe('');
  expect(tableRows[1].querySelector('.view-type').textContent).toBe(
    'viewType2@test'
  );
});

test('log detail is shown when a table row is clicked and it is hidden when the close button is clicked', async () => {
  // Todo: click a row to open the log details view
  // then click the closeBtn and test if the logDetailWrapper is hidden
  const logs = [
    {
      /* renders 1st row in table */
      id: 'id1@test',
      viewType: undefined,
      type: 'content_script',
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

// ext-activitylog.js
test('wrong event should throw an error', () => {
  // Todo: pass a wrong event as an argument in handleEvent method and test if throws an error.
});

// test('Filters should be applied from valid URL search params while loading the activitylog page', () => {
//   // Todo: pass an valid object as argument to setInitialFilters method and test if setInitialFilter method from the web components are called. Also test if tab id is given.
//   const params = new URLSearchParams(location.search);
//   params.set('version', 2.0);

//   history.replaceState(
//     null,
//     null,
//     `${
//       location.href.split('?')[0]
//     }?id=["test1@addon","test2@addon"]&viewType=[null,"popup"]&type=["content_script","api_event"]&name=["tabs.executeScript"]&timeStamp={"start":123123,"stop":456456}&keyword=undefined&tabId=982`
//   );
// });

/*
location.href = `${
      location.href.split('?')[0]
    }?id=["test1@addon","test2@addon"]&viewType=[null,"popup"]&type=["content_script","api_event"]&name=["tabs.executeScript"]&timeStamp={"start":123123,"stop":456456}&keyword=undefined`;
*/

test('setError method should display error message', () => {
  // Todo: pass a error mesage as argument to setError method and test if it is shown. Pass empty argument to setError method and test if the existing message is removed.

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
      data: [{ test: 'check@data' }],
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

test('tabId search param should set filter logs by tab id', () => {
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
