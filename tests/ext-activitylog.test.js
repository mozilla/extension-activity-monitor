/* eslint no-unsanitized/property: "off" */
import fs from 'fs';
import path from 'path';
import ActivityLog from '../src/lib/ext-activitylog';

const activityLogHtml = fs.readFileSync(
  path.resolve(__dirname, '../src/activitylog/activitylog.html'),
  'utf-8'
);

const domParser = new DOMParser();
const activityLogBody = domParser.parseFromString(activityLogHtml, 'text/html')
  .body.innerHTML;

test('isFilterMatched function returns true when all properties of a log are matched with filter object, else it returns true', () => {
  document.body.innerHTML = activityLogBody;

  const log = {
    id: 'id@test1',
    viewType: 'viewType@test1',
    type: 'type@test1',
    data: [{ test: 'test@data' }],
  };

  const logUnmatch = {
    id: 'not-matching-id',
    viewType: 'viewType@test',
    type: 'type@test',
    data: [{ test: 'test@data' }],
  };

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
  activityLog.model.addNewLogs([log]);

  expect(activityLog.isFilterMatched(log)).toBeTruthy();
  expect(activityLog.isFilterMatched(logUnmatch)).toBeFalsy();
});

test('removeFilter function removes a given values from a given key in filter object', () => {
  document.body.innerHTML = activityLogBody;

  const log = {
    id: 'id@test',
    viewType: 'viewType@test',
    type: 'type@test',
    data: [{ test: 'test@data' }],
  };

  const logKey = 'id';
  const valueEquals = 'id@test';

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

  activityLog.model.addNewLogs([log]);
  expect(activityLog.model.filter.id) .toContain('id@test');

  activityLog.model.removeFilter({ logKey, valueEquals });
  expect(activityLog.model.filter.id).not.toContain('id@test');
});
