# Contributing to Extension Activity Monitor

Firstly, thank you for your interest in contributing to Extension Activity Monitor. Your contribution will make this project more awesome. 🚀

## Table of Contents

- [Project Architecture](#project-architecture)
  - [Some Important Components](#some-important-components)
    - [Background Page](#background-page)
    - [Popup Page](#popup-page)
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
- [Checking for Linter](#checking-for-linter)
- [Checking for Prettier](#checking-for-prettier)
- [Submitting a Bug or Issue or Feature Request](#submitting-a-bug-or-issue-or-feature-request)
- [Creating a Pull Request](#creating-a-pull-request)
  - [Writing Commit Message](#writing-commit-message)

## Project Architecture

Extension Activity Monitor is composed by a backend part (running in the background page) and a frontend part (composed by a browserAction popup and an activitylog extension page opened which is loaded as a tab or as a devtools panel).

### Some Important Components

#### Background Page

The background page acts as the backend of the extension. The core part of the background page is implemented in [`ext-monitor.js`](https://github.com/mozilla/extension-activity-monitor/blob/master/src/lib/ext-monitor.js). It is responsible for monitoring extensions, storing activity logs, saving logs to a JSON file and loading logs from JSON file. The logs remain alive in the background unless it receives the [`clearlogs`](https://github.com/mozilla/extension-activity-monitor/blob/68d51940f1db397a0972658622bbdd39041436a7/src/lib/ext-monitor.js#L106) instruction from Activity Log page(frontend part). The background page also sends the real-time logs to Activity Log page. The background page communicates with popup and activity log page (which are part of frontend) more often to make sure monitoring is running smoothly.

#### Popup Page

The popup page is one part of the frontend that communicates with the background page (backend part) to run most of its functionality. It is responsible for "start monitoring" and "stop monitoring" other installed extensions. It also helps to access the Activity Log page.

#### Activity Log Page - Tab (Extension Page)

The Activity Log page is another part of the frontend. It uses the MVC architecture and [web components](https://github.com/mozilla/extension-activity-monitor/tree/master/src/lib/web-component) for table view and filtering options.

- The **role of Model** is to store the activity logs from the the background and store the filters. It also contains the funcationalities to match a log with current filters applied.

- The **role of View** is to deal with DOM. It interacts with DOM to make required visual changes. The `View` also deals with the `log-view` web component in order to render the logs.

- The **role of Controller** is to make sure that both Model and View are synchronized. When any changes are made in the Model, the Controller make sure that the View is also affected by it. For example, when a new log is found and background page passes the log, it is actually saved in Model and then the View is updated with rendering the new log.

When the Activity Log page is opened from the popup, it fetches the existing logs (if logs were collected before) from the background (backend part). The fetched logs are saved in the [**Model**](https://github.com/mozilla/extension-activity-monitor/blob/68d51940f1db397a0972658622bbdd39041436a7/src/lib/ext-activitylog.js#L5), then **View** renders the logs with the help of [`log-view`](https://github.com/mozilla/extension-activity-monitor/blob/master/src/lib/web-component/log-view/) web component.

The Activity Log page receives and renders logs in real-time from background while it is opened. It can send instructions in the background to save logs to a JSON file, load logs from JSON file and clear logs.

It also provides the functionality to filter out the unncessary logs by log identities, substring searching and with tab id. These filtering options are made with a couple of [web components](https://github.com/mozilla/extension-activity-monitor/blob/master/src/lib/web-component). The filters are stored in the [Model](https://github.com/mozilla/extension-activity-monitor/blob/68d51940f1db397a0972658622bbdd39041436a7/src/lib/ext-activitylog.js#L6-L14) and View updates the `log-view` everytime the filters are updated.

#### Activity Log Page - Devtools (Extension Page)

This page can be accessed via "Extension Activity" panel in devtools. The "Extension Activity" panel contains the Activity Log page. It has almost all the similar characteristics as "Activity Log Page - Tab" except it filters the activity logs with the tab id where it (devtool panel) is opened. The tab id is found with the help of devtools API i.e. `browser.devtools.inspectedWindow.tabId`.

### Core Features

#### Collecting Logs

The extension receives activity logs in the form of `object` from activityLog API. The activityLog API schema can been found [here](https://searchfox.org/mozilla-central/source/toolkit/components/extensions/schemas/activity_log.json). The background page (backend part) subscribes the `browser.activityLog.onExtensionActivity` API event listeners, which gets triggered everytime an activity is found from any monitored extension and returns a log object. While monitoring other extensions, any newly installed extension also gets monitored automatically.

- ##### Live Logging

  The real-time logs are being collected in the background and send to Activity Log page while it is opened. The extension uses `runtime.sendMessage` API to communicate between background and Activity Log page. The [`sendLogs`](https://github.com/mozilla/extension-activity-monitor/blob/master/src/lib/ext-monitor.js#L25-L33) method is responsible for sending logs to Activity Log page. The Activity Log page listens for logs via [`runtime.onMessage`](https://github.com/mozilla/extension-activity-monitor/blob/master/src/lib/ext-activitylog.js#L253-L265) event and render those in the [`log-view`](https://github.com/mozilla/extension-activity-monitor/blob/master/src/lib/web-component/log-view/).

- ##### Loading / saving logs

  It can save all the collected logs that are collected in the background to a JSON file. To save logs, the `saveLogs` instruction from [`save-load.js`](https://github.com/mozilla/extension-activity-monitor/blob/68d51940f1db397a0972658622bbdd39041436a7/src/lib/save-load.js#L22-L27) is sent to the background where the save operation occurs. The `downloads` API is being used to save logs.
  We can also load logs by loading a JSON file. It will read the logs and render those in the [`log-view`](https://github.com/mozilla/extension-activity-monitor/blob/master/src/lib/web-component/log-view/) opening a new tab. Both the save logs and load logs functionality can be found in [`save-load.js`](https://github.com/mozilla/extension-activity-monitor/blob/master/src/lib/save-load.js).

#### Rendering Logs

The logs are being rendered using [`log-view`](https://github.com/mozilla/extension-activity-monitor/blob/master/src/lib/web-component/log-view/) web component. Along rendering the new logs the filter options also get updated. While filters are being applied, any new log that doesn't match the filters will be rendered as hidden in [`log-view`](https://github.com/mozilla/extension-activity-monitor/blob/master/src/lib/web-component/log-view/).

#### Filtering Log Entries

Extension Activity Monitor offers the following filtering options-

- Filter logs with extension id, view type, API name, API type.
  - These filtering options use the [`filter-option`](https://github.com/mozilla/extension-activity-monitor/tree/master/src/lib/web-component/filter-option) web component.
- Filter logs with substring.
  - It uses the [`filter-keyword`](https://github.com/mozilla/extension-activity-monitor/tree/master/src/lib/web-component/filter-keyword) web component.
- Filter logs with range of timestamp. It is implemented with the help of "context menu" in `log-view`.
  - It uses the [`filter-timestamp`](https://github.com/mozilla/extension-activity-monitor/tree/master/src/lib/web-component/filter-timestamp) web component.
- Filter logs with tab id.
  - It uses the URL search parameter `filterTabId=tabid` to set the tab id filter. Here, `tabid` should be a number.

The filters are stored in Model of the Activity Log page. A JSDoc explaining the filter object can be found [here](https://github.com/mozilla/extension-activity-monitor/blob/68d51940f1db397a0972658622bbdd39041436a7/src/lib/ext-activitylog.js#L21-L38). Filters are only being changed by [`onFilterChanged`](https://github.com/mozilla/extension-activity-monitor/blob/68d51940f1db397a0972658622bbdd39041436a7/src/lib/ext-activitylog.js#L338-L347) method in Controller.

## Picking an issue

If you are a new contributor looking for a easy bug/issue to get started, take a look at the list of [good first bugs](https://github.com/mozilla/extension-activity-monitor/issues?q=is%3Aissue+is%3Aopen+label%3A"good+first+bug"). Feel free to ask permission from maintainers by commenting on any issue that you would like to work on.

## Installation

To install Extension Activity Monitor, follow the given instructions [here](https://github.com/mozilla/extension-activity-monitor/blob/master/README.md#installation).

## Writing & Running Tests

Unit test is done with [JEST Framework](https://jestjs.io/) in this project.

### Writing a test

To write a test, go to [tests](https://github.com/mozilla/extension-activity-monitor/tree/master/tests) folder and search for a relevent test file to write tests. If you don't find any relevent test file, you can make one using this naming convention: `test-file-name.tests.js`. Use a suitable name in `test-file-name` placeholder.

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
$ npm test:watch
```

To get the coverage report of all the tests, run the following command:

```
$ npm test:coverage
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
