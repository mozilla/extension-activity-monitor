# Contributing to Extension Activity Monitor

Firstly, thank you for your interest in contributing to Extension Activity Monitor. Your contribution will make this project more awesome. 🚀

## Table of Contents

- [Project Architecture](#project-architecture)
  - [Some Important Components](#important-components)
    - [Background Page](#background-page)
    - [Popup Page](popup-page)
    - [Activity Log Page - Tab](#activity-log-page---tab-extension-page)
    - [Activity Log Page - Devtools](#activity-log-page---devtools-extension-page)
  - [Some Core Features](#important-components)
    - [Collecting Logs](#collecting-logs)
      - [Live Logging](#live-logging)
      - [Loading / saving logs](#loading--saving-logs)
    - [Rendering Logs](#rendering-logs)
    - [Filtering Log Entries](filtering-log-entries)
- [Pick an issue](#pick-an-issue)
- [Installation](#installation)
- [Run Test](#run-test)
- [Check for Linter](#check-for-linter)
- [Check for Prettier](#check-for-prettier)
- [Submit a Bug or Issue or Feature Request](#submit-a-bug-or-issue-or-feature-request)
- [Create a Pull Request](#create-a-pull-request)
  - [Write Commit Message](#write-commit-message)

## Project Architecture

This extension is primarily consist of a Popup (browserAction Popup) and Activity Log page (Extension page). The popup helps to "start monitor" or "stop monitor" all extensions and access the activity log page. On the other hand, the Activity Log page helps to view the logs, filter logs, save and load logs from a file.

### Some Important Components

#### Background Page

The background page is responsible for monitoring extensions, storing activity logs, saving logs to a JSON file and loading logs from JSON file. The logs remains alive in the background unless it is being cleared. It also sends the real-time logs to Activity Log page. It acts as the backend of the extension, which more often communicates with popup and activity log page to make sure extension monitoring is running smoothly.

#### Popup Page

The popup page is responsible for "start monitoring" and "stop monitoring" other installed extensions. It also helps to access the Activity Log page. The popup page communicates with the background to run most of its functionality.

#### Activity Log Page - Tab (Extension Page)

The Activity Log page is using the MVC architecture and [web components](https://github.com/mozilla/extension-activity-monitor/tree/master/src/lib/web-component) for table view and filtering options. It can be termed as the "front-end part" of the extension. When the Activity Log page is open from the popup, it renders the existing logs (if logs were collected in background before) and recevies real-time logs from background while it is opened. Activity Log page allows to communicate with other parts of the extension to save logs to a JSON file, load logs from JSON file, clear activity logs. It also provides the functionality to filter out the unncessary logs by log identities, substring searching and with tab id. These filtering options are made with a couple of [web components](https://github.com/mozilla/extension-activity-monitor/blob/master/src/lib/web-component).

#### Activity Log Page - Devtools (Extension Page)

The page can be accessed via "Extension Activity" panel in devtools. Inside the Activity Log page has almost all the similar characteristics as "Activity Log Page - Tab" except it filters the activity logs with the tab id where it is opened. The tab id is found with the help of devtools API i.e. `browser.devtools.inspectedWindow.tabId`.

### Some Core Features

#### Collecting Logs

The extension recevies activity logs in the form of `object` from activityLog API. The activityLog API schema can been found [here](https://searchfox.org/mozilla-central/source/toolkit/components/extensions/schemas/activity_log.json). It has only one event called [`onExtensionActivity`](https://searchfox.org/mozilla-central/source/toolkit/components/extensions/schemas/activity_log.json#20), which gets triggered everytime an activity is found from any monitored extensions and returns a [log object](https://searchfox.org/mozilla-central/source/toolkit/components/extensions/schemas/activity_log.json#24-76).

- ##### Live Logging

  The real-time logs are being collected in the background and send to Activity Log page while it is opened. The extension used `runtime.sendMessage` API to communicate between background and Activity Log page. The [`sendLogs(details)`](https://github.com/mozilla/extension-activity-monitor/blob/master/src/lib/ext-monitor.js#L25-L33) method is responsible for sending logs to Activity Log page. The Activity Log page listens for logs via [`runtime.onMessage`](https://github.com/mozilla/extension-activity-monitor/blob/master/src/lib/ext-activitylog.js#L253-L265) event and renders those in the [`log-view`](https://github.com/mozilla/extension-activity-monitor/blob/master/src/lib/web-component/log-view/).

- ##### Loading / saving logs

  It can save all the collected logs that are available in background in a JSON file. To save logs an instruction from [`save-load.js`](https://github.com/mozilla/extension-activity-monitor/blob/68d51940f1db397a0972658622bbdd39041436a7/src/lib/save-load.js#L22-L27) is sent to the background where the save operation occurs. The `downloads` API is being used to save logs.

  We can also load logs by loading a JSON file. It will read the logs and render those in the [`log-view`](https://github.com/mozilla/extension-activity-monitor/blob/master/src/lib/web-component/log-view/) opening a new tab. Both the save logs and load logs functionality can be found in [`save-load.js`](https://github.com/mozilla/extension-activity-monitor/blob/master/src/lib/save-load.js).

#### Rendering Logs

The logs are being rendered using [`log-view`](https://github.com/mozilla/extension-activity-monitor/blob/master/src/lib/web-component/log-view/) web component. Along rendering the new logs the filter options also get updated. While filters are being applied, any new logs that doesn't match the filters will be rendered as hidden in `log-view`.

#### Filtering Log Entries

Extension Activity Monitor offers the following filtering options-

- Filter logs with extension id, view type, API name, API type.
  - These filtering options use the [`filter-option`](https://github.com/mozilla/extension-activity-monitor/tree/master/src/lib/web-component/filter-option) web component.
- Filter logs with substring.
  - It uses the [`filter-keyword`](https://github.com/mozilla/extension-activity-monitor/tree/master/src/lib/web-component/filter-keyword) web component.
- Filter logs with range of timestamp.
  - It uses the [`filter-timestamp`](https://github.com/mozilla/extension-activity-monitor/tree/master/src/lib/web-component/filter-timestamp) web component.
- Filter logs with tab id.
  - It uses the URL search parameter `filterTabId=tabid` to set the tab id filter. Here, `tabid` should be a number.

The filters are stored in Model of the Activity Log page. Filters are only being changed by [`onFilterChanged`](https://github.com/mozilla/extension-activity-monitor/blob/68d51940f1db397a0972658622bbdd39041436a7/src/lib/ext-activitylog.js#L338-L347) method in Controller. A JSDoc explaining the filter object can be found [here](https://github.com/mozilla/extension-activity-monitor/blob/68d51940f1db397a0972658622bbdd39041436a7/src/lib/ext-activitylog.js#L21-L38).

## Picking an issue

If you are a new contributor looking for a easy bug/issue to get started, take a look at the list of [good first bugs](https://github.com/mozilla/extension-activity-monitor/issues?q=is%3Aissue+is%3Aopen+label%3A"good+first+bug"). Feel free to ask permission from maintainers by commenting on any issue that you would like to work on.

## Installation

To install Extension Activity Monitor, follow the given instructions [here](https://github.com/mozilla/extension-activity-monitor/blob/master/README.md#installation).

## Writing & Running Tests

Unit test is done with [JEST Framework](https://jestjs.io/) in this project.

### Writing a test

To write a test, go to [tests](https://github.com/mozilla/extension-activity-monitor/tree/master/tests) folder and search for a relevent test file to write test. If you don't find any relevent test file, you can make one using this naming convention: `test-file-name.tests.js`. Use a suitable name in `test-file-name` placeholder.

To run all the test suit once, run the following command:

```
$ npm test
```

To run a single test suit once, run the following command:

```
$ npm test ext-monitor.test.js
```

Here, `ext-monitor.test.js` is the name of the test suit.

To run all the test suits continously, run the following command:

```
$ npm test:watch
```

To get the coverage report of all the test suits, run the following command:

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
