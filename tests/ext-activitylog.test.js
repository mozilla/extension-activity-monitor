/* eslint no-unsanitized/property: "off" */
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import ActivityLog from '../src/lib/ext-activitylog';

const activityLogHtml = fs.readFileSync(
  path.resolve(__dirname, '../src/activitylog/activitylog.html'),
  'utf-8'
);

const domParser = new DOMParser();

const activityLogBody = domParser.parseFromString(activityLogHtml, 'text/html')
  .body.innerHTML;

const dom = new JSDOM(
  `<html>
    <head>
      <script
        type="module"
        src="../src/lib/web-component/filter-option/filter-option-element.js"
      ></script>
    </head>
    <body>
    ${activityLogBody}
    </body>
  </html>`,
  { runScripts: 'dangerously' }
);

test('isFilterMatched function returns true when all properties of a log are matched with filter object, else it returns true', () => {
  global.document.head.innerHTML = dom.window.document.head.innerHTML;
  global.document.body.innerHTML = dom.window.document.body.innerHTML;

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
  activityLog.handleNewLogs([log]);

  expect(activityLog.isFilterMatched(log)).toBeTruthy();
  expect(activityLog.isFilterMatched(logUnmatch)).toBeFalsy();
});
