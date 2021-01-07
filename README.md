# Extension Activity Monitor

This is a privileged Firefox extension that uses the `activityLog` API to monitor the activities of the other installed extensions.

[![CircleCI](https://circleci.com/gh/mozilla/extension-activity-monitor.svg?style=svg)](https://circleci.com/gh/mozilla/extension-activity-monitor)
[![codecov](https://codecov.io/gh/mozilla/extension-activity-monitor/branch/master/graph/badge.svg)](https://codecov.io/gh/mozilla/extension-activity-monitor)
[![devDependency Status](https://david-dm.org/mozilla/extension-activity-monitor/dev-status.svg)](https://david-dm.org/mozilla/extension-activity-monitor#info=devDependencies)

## Installation

### Prerequisite

- Clone / download the respository in your local machine.
- Install [Firefox Nightly](https://www.mozilla.org/en-US/firefox/all/#product-desktop-nightly) to run this privileged extension.
- [optional] run `$ npm ci` to install dev dependency to develop a patch or to run the extension using the web-ext dependency.

### Using [web-ext](https://github.com/mozilla/web-ext)

Go to project directory and and run the following command:

```
$ npm start
```

_NOTE:_ You may need to run Firefox Nightly once to let the above command to auto-discovery where the Firefox Nightly binary is located in your system.
Alternatively the Firefox binary location can be provided manually on the command line:

```
$ web-ext run -f /path/to/firefox-nightly/firefox
```

### Manual Installation

- Open Firefox Nightly and go to the following URL: `about:config`.
  - Set `extensions.experiments.enabled` to `true`.
- Go to the following URL: `about:debugging#/runtime/this-firefox`.
  - Click on "Load Temporary Add-on" button, then go to `src` directory of your cloned/ downloaded repository and choose `manifest.json` file.

The extension will be loaded temporarily in the browser.

## Get Involved

To get involved with Extension Activity Monitor, you can file bugs or issues, request features and even fix bugs or issues. For more information, check out our [contributing section](https://github.com/mozilla/extension-activity-monitor/blob/master/CONTRIBUTING.md).
