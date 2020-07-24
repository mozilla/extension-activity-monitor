/* eslint no-unsanitized/property: "off" */
import fs from 'fs';
import path from 'path';
import ActivityLog from '../src/lib/ext-activitylog';
import { FilterOption } from '../src/lib/web-component/filter-option/filter-option-element';
import { LogView } from '../src/lib/web-component/log-view/log-view-element';
import { FilterKeyword } from '../src/lib/web-component/filter-keyword/filter-keyword-element';

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
  document.body.innerHTML = activityLogBody;

  expect(window.customElements.get('log-view')).toBe(LogView);
  expect(window.customElements.get('filter-option')).toBe(FilterOption);

  const logs = [
    {
      /* renders 1st row in table */
      id: 'id1@test',
      viewType: 'viewType@test',
      type: 'type@test',
      data: [{ test: 'test1@data' }],
    },
    {
      /* renders 2nd row in table */
      id: 'id2@test',
      viewType: 'viewType2@test',
      type: 'type2@test',
      data: [{ test: 'test2@data' }],
    },
  ];

  const addListener = jest.fn();
  const sendMessage = jest.fn();

  window.browser = {
    runtime: {
      onMessage: { addListener },
      sendMessage,
    },
  };

  sendMessage.mockImplementation(() => {
    return Promise.resolve({ existingLogs: [] });
  });

  const { activityLog } = new ActivityLog();
  const extFilterBtn = activityLog.view.extFilter.shadowRoot.querySelector(
    '.toggle-btn'
  );

  const extFilterCheckboxList = activityLog.view.extFilter.shadowRoot.querySelector(
    '.checkbox-list'
  );

  activityLog.handleNewLogs(logs);

  const tableBody = activityLog.view.logView.shadowRoot.querySelector('tbody');
  const getTableRows = () => tableBody.querySelectorAll('tr');
  let tableRows = getTableRows();

  // Initially filter Checkbox List is hidden
  expect(extFilterCheckboxList.hidden).toBeTruthy();

  const extFilterBtnChanged = observeChange(extFilterBtn);
  extFilterBtn.click();
  await extFilterBtnChanged;

  // Filter checkbox List is displayed
  expect(extFilterCheckboxList.hidden).toBeFalsy();

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
  document.body.innerHTML = activityLogBody;

  expect(window.customElements.get('filter-keyword')).toBe(FilterKeyword);

  const logs = [
    {
      /* renders 1st row in table */
      id: 'id1@test',
      viewType: 'viewType@test',
      type: 'type@test',
      data: [{ test: 'test1@data' }],
    },
    {
      /* renders 2nd row in table */
      id: 'id2@test',
      viewType: 'viewType2@test',
      type: 'type2@test',
      data: [{ test: 'matched@data' }],
    },
  ];

  const addListener = jest.fn();
  const sendMessage = jest.fn();

  window.browser = {
    runtime: {
      onMessage: { addListener },
      sendMessage,
    },
  };

  sendMessage.mockImplementation(() => {
    return Promise.resolve({ existingLogs: [] });
  });

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

  let event = new Event('input');
  event.data = { target: activityLog.view.keywordFilter };

  searchInput.dispatchEvent(new Event(event));

  tableRows = getTableRows();

  // only 2nd row should be visible since the keyword
  // matches with 2nd row's data.
  expect(tableRows[0].hidden).toBeTruthy();
  expect(tableRows[1].hidden).toBeFalsy();
});
