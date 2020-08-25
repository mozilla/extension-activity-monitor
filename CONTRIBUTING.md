# Contributing to Extension Activity Monitor

Firstly, thank you for your interest in contributing to Extension Activity Monitor. Your contribution will make this project more awesome. 🚀

## Table of Contents

- [Project Architecture](#project-architecture)
  - [The Extension Pages](#the-extension-pages)
    - [Background Page](#background-page)
    - [BrowserAction Popup Page](#browserAction-popup-page)
    - [Activity Log Page - Tab](#activity-log-page---tab-extension-page)
    - [Activity Log Page - Devtools](#activity-log-page---devtools-extension-page)
  - [Core Features](#core-features)
    - [Collecting Logs](#collecting-logs)
      - [Live Logging](#live-logging)
      - [Loading / saving logs](#loading--saving-logs)
    - [Rendering Logs](#rendering-logs)
    - [Filtering Log Entries](#filtering-log-entries)
- [Picking an issue](#picking-an-issue)
- [Installation](#installation)
- [Writing and Running Tests](#writing--running-tests)
  - [Writing a test](#writing-a-test)
- [Checking for Linter](#checking-for-linter)
- [Checking for Prettier](#checking-for-prettier)
- [Submitting a Bug or Issue or Feature Request](#submitting-a-bug-or-issue-or-feature-request)
- [Creating a Pull Request](#creating-a-pull-request)
  - [Writing Commit Message](#writing-commit-message)

## Project Architecture

The Extension Activity Monitor is composed of a backend responsible for the collection and storage of the activity logs (in the background page), and a frontend to allow the user to manage the log collection and view the logs (browserAction popup and an extension tab/devtools panel).

### The Extension Pages

#### Background Page

The background page acts as the backend of the extension. The core part of the background page is implemented in [`ext-monitor.js`](https://github.com/mozilla/extension-activity-monitor/blob/master/src/lib/ext-monitor.js). The Popup and Activity Log page communicates with the background page via `runtime.onMessage` event and instruct to start/stop monitoring, save logs to a JSON file or load logs from a JSON file. It keeps track of the monitored extensions via [`extensionMapList`](https://github.com/mozilla/extension-activity-monitor/blob/68d51940f1db397a0972658622bbdd39041436a7/src/lib/ext-monitor.js#L9) and opened Activity Log pages via [`activityLogPorts`](https://github.com/mozilla/extension-activity-monitor/blob/68d51940f1db397a0972658622bbdd39041436a7/src/lib/ext-monitor.js#L12).

#### BrowserAction Popup Page

The browserAction popup is a control panel to trigger "start monitoring" and "stop monitoring" extensions and helps to access the Activity Log page. It mostly communicates with the background page (backend part) to run its functionalities.

#### Activity Log Page - Tab

The Activity Log page is the frontend tasked with rendering the log information from the backend. It uses the MVC architecture and [web components](https://github.com/mozilla/extension-activity-monitor/tree/master/src/lib/web-component) for the table view and filtering options.

- The **Model** class does store activity logs being rendered in the activity log page and the data representation of the log filters. The Model class does also provide the [`matchLogWithFilterObj`](https://github.com/mozilla/extension-activity-monitor/blob/68d51940f1db397a0972658622bbdd39041436a7/src/lib/ext-activitylog.js#L43) method to check if a particular log entry does match the filters.

- The **View** class manages the [`log-view`](https://github.com/mozilla/extension-activity-monitor/blob/master/src/lib/web-component/log-view/) and [filters web components](https://github.com/mozilla/extension-activity-monitor/tree/master/src/lib/web-component). The log-view webcomponent is responsible for rendering the collected logs (currently in a table form) and managing the log-view context menu. The filters web componenrs are responsible for the UI elements related to the log filters.

- The **Controller** class makes sure that the data flow in Model and View are synchronized. Whenever a filter change is triggered from the View, the Controller makes sure it updates the Model and the View accordingly. It also updates the Model and View while receiving real-time logs from the Background. It communicates with the background via `runtime.sendMessage` API.

#### Activity Log Page - Devtools

This page can be accessed via "Extension Activity" panel in devtools. The "Extension Activity" devtools panel contains an instance of the Activity Log page where every real-time activity log collected is automatically filtered by the **current** tab id. The devtools panel retrieves the tab id filter from the devtools panel url search params, set by the devtools page by retrieving it using `browser.devtools.inspectedWindow.tabId` when the devtools panel is being registered.

### Core Features

#### Collecting Logs

The extension receives each activity log in the form of an `object` from activityLog API. The activityLog API schema can be found [here](https://searchfox.org/mozilla-central/source/toolkit/components/extensions/schemas/activity_log.json).

When the Activity Log page is opened via popup, it fetches the existing logs (if logs were collected before) from the background. While the Activity Log page is opened, it receives real-time logs from the background and render them. It can send instructions to the background via `runtime.sendMessage` API to save logs to a JSON file, load logs from JSON file and clear logs.

- ##### Live Logging

  The backend subscribes to the `browser.activityLog.onExtensionActivity` API event to receive objects that describe the activity of the monitored extensions. While the monitor is active, any newly installed extension will be monitored automatically.

  The real-time logs are collected in the background and sent to Activity Log page while it is opened. The extension uses `runtime.sendMessage` API to communicate between background and Activity Log page. The [`sendLogs`](https://github.com/mozilla/extension-activity-monitor/blob/68d51940f1db397a0972658622bbdd39041436a7/src/lib/ext-monitor.js#L25-L33) method is responsible for sending logs to Activity Log page. The Activity Log page listens for logs via [`runtime.onMessage`](https://github.com/mozilla/extension-activity-monitor/blob/68d51940f1db397a0972658622bbdd39041436a7/src/lib/ext-activitylog.js#L253-L265) event and render those in the [`log-view`](https://github.com/mozilla/extension-activity-monitor/blob/master/src/lib/web-component/log-view/).

  The logs remain alive in the background unless it receives the [`clearlogs`](https://github.com/mozilla/extension-activity-monitor/blob/68d51940f1db397a0972658622bbdd39041436a7/src/lib/ext-monitor.js#L106) instruction from Activity Log page(frontend part). The background page also [sends the real-time logs](https://github.com/mozilla/extension-activity-monitor/blob/68d51940f1db397a0972658622bbdd39041436a7/src/lib/ext-monitor.js#L25) to Activity Log page.

- ##### Loading / saving logs

  Live logs can be saved by exporting the collected logs as JSON, via [`saveLogs`](https://github.com/mozilla/extension-activity-monitor/blob/68d51940f1db397a0972658622bbdd39041436a7/src/lib/save-load.js#L22-L27) instruction from [`save-load.js`](https://github.com/mozilla/extension-activity-monitor/blob/68d51940f1db397a0972658622bbdd39041436a7/src/lib/save-load.js). Previously saved logs can be loaded via loading a JSON file, which opens an instance of Activity Log page in a new tab loaded with logs from the JSON file. Note that, this instance of Activity Log page doesn't receive real-time logs (as it doesn't subscribe to `browser.runtime.onMessage` event listener to receive real-time logs).

#### Rendering Logs

The logs are rendered using the [`log-view`](https://github.com/mozilla/extension-activity-monitor/blob/master/src/lib/web-component/log-view/) web component. Any new log that doesn't match the filters will be hidden.

#### Filtering Log Entries

Individual log items can be hidden by user-defined filters. These filters are stored in the **Model** of the Activity Log page. A JSDoc explaining the filter object can be found [here](https://github.com/mozilla/extension-activity-monitor/blob/68d51940f1db397a0972658622bbdd39041436a7/src/lib/ext-activitylog.js#L21-L38). The **Model** is updated when the controller is notified of filter changes via [`onFilterChanged`](https://github.com/mozilla/extension-activity-monitor/blob/68d51940f1db397a0972658622bbdd39041436a7/src/lib/ext-activitylog.js#L338-L347). Ultimately, the [`log-view` hides](https://github.com/mozilla/extension-activity-monitor/blob/68d51940f1db397a0972658622bbdd39041436a7/src/lib/web-component/log-view/log-view-element.js#L28-L34) the table rows that didn't match the applied filters. The filters can be changed by the user via the following UI components:

- [`filter-option`](https://github.com/mozilla/extension-activity-monitor/tree/master/src/lib/web-component/filter-option) provides the UI to filter by individual properties of log entries (such as extension id, view type, API name, API type). The available filter values are derived from the logs collected so far. During live logging, new unknown filter values may appear and be appended to the filter UI.
- [`filter-keyword`](https://github.com/mozilla/extension-activity-monitor/tree/master/src/lib/web-component/filter-keyword) provides the UI to filter by substring. It searches the provided substring inside the `data` property of the log object.
- [`filter-timestamp`](https://github.com/mozilla/extension-activity-monitor/tree/master/src/lib/web-component/filter-timestamp) provides the UI to filter by timestamps. The timestamps filter can be applied by choosing "start time" or "stop time" or both (from the context menu) to hide the logs that don't fall under the chosen timestamp range.

When Activity Log page is opened through devtools panel, logs will be filtered by that tab's id. This filter cannot be changed through the UI.

## Picking an issue

If you are a new contributor looking for a easy bug/issue to get started, take a look at the list of [good first bugs](https://github.com/mozilla/extension-activity-monitor/issues?q=is%3Aissue+is%3Aopen+label%3A"good+first+bug"). Feel free to ask permission from the maintainers by commenting on any issue that you would like to work on.

## Installation

To install Extension Activity Monitor, follow the given instructions [here](https://github.com/mozilla/extension-activity-monitor/blob/master/README.md#installation).

## Writing & Running Tests

Unit test is done with [JEST Framework](https://jestjs.io/) in this project.

### Writing a test

To write a test, go to [tests](https://github.com/mozilla/extension-activity-monitor/tree/master/tests) folder and search for a relevent test file to write tests. If you are unable to find any relevent test file, you can make a new one considering this naming convention: `test-file-name.tests.js`. Use a suitable name in `test-file-name` placeholder.

To run all the tests once, run the following command:

```
$ npm test
```

To run a single test once, run the following command:

```
$ npm test ext-monitor.test.js
```

Here, `ext-monitor.test.js` is the name of the test suit.

To run all the tests continously, run the following command:

```
$ npm run test:watch
```

To get the coverage report of all the tests, run the following command:

```
$ npm run test:coverage
```

## Checking for Linter

This project is using ESLint as linter.
To make sure your code is compatible with our lint check, run the following command:

```
$ npm run lint:check
```

To make ESLint try to fix the lint errors automatically, run the following command:

```
$ npm run lint:fix
```

## Checking for Prettier

This project is using Prettier as code formatter.
To make sure your code is formatted correctly, run the following code:

```
$ npm run prettier:check
```

To make Prettier try to fix the code formatting errors automatically, run the following command:

```
$ npm run prettier:fix
```

**NOTE**: Both ESLint and Prettier ignores the path mentioned in [`.gitignore`](https://github.com/mozilla/extension-activity-monitor/blob/master/.gitignore) file.

## Submitting a Bug or Issue or Feature Request

If you find a bug/issue in the codes or want to request a feature, you can help us by [submitting an issue](https://github.com/mozilla/extension-activity-monitor/issues/new) to our GitHub Repository. Feel free ask for permission from the maintainers of the repository if you want to work on the filed issue.

## Creating a Pull Request

When you create a pull request for an issue or new feature, be sure to mention the issue number for what you're working on. The best way to do it is to mention the issue like this at the top of the PR's description:

```
Fixes #123
```

The issue number in this case is "123." The word "Fixes" will automatically close the issue when your pull request is merged.

### Writing Commit Message

We write the commit message in conventional way stated in [Conventional Commits Specification](https://www.conventionalcommits.org/en/v1.0.0/) to generate change changelog without too much noise. Use past tense to write commit message.
Your commit should be any of the following types:

- `feat: Add a new feature`
- `fix: Fix a Bug or Issue`
- `docs: Improve contributing docs`
- `style: Add comments or formatted code etc.`
- `refactor: Split out or re-arranging codes that doesn't change the functionalities`
- `perf: Improve performance of any functionality`
- `test: Add test for new or existing features`
- `chore: Changes in the build process, upgrading dependencies etc.`
