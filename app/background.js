/**
 * Background
 *
 * This is main Electron process, started first thing when your app launches.
 * This script runs through entire life of your application. It doesn't have
 * any windows that you can see on screen, but we can open windows from here.
 */

import jetpack from 'fs-jetpack';

// Base electron modules
import { app, BrowserWindow, globalShortcut } from 'electron';

let childProcess = require('child_process');
let promisedExec = childProcess.exec;

// Development helper for showing Chromium Dev Tools
import devHelper from './vendor/electron_boilerplate/dev_helper';

// Special module holding environment variables which you declared
// in config/env_xxx.json file.
import env from './env';

import os from 'os';

let mainWindow;
app.on('ready', function () {

  mainWindow = new BrowserWindow({
    x: 0,
    y: 0,
    width: 1080,
    height: 1920,
  });

  /**
   * Hack to make full-screen kiosk mode actually work.
   *
   * There is an active bug with Electron, kiosk mode, and Yosemite.
   * https://github.com/atom/electron/issues/1054
   * This hack makes kiosk mode actually work by waiting for the app to launch
   * and then issuing a call to go into kiosk mode after a few milliseconds.
   */
  if (env.name == 'production') {
    setTimeout(function () {
      mainWindow.setKiosk(true);
    }, 100);
  }

  /**
   * Show dev tools when we're not in production mode
   */
  if (env.name !== 'production') {
    devHelper.setDevMenu();
    mainWindow.openDevTools();
  }

  /**
   * Load configured URL
   *
   * If the config file doesn't exist, load an error message for the user.
   */
  const configFile = '/usr/local/etc/kiosk/config.json';
  const configFileObj = jetpack.read(configFile, 'json');
  console.log('configFileObj: ', configFileObj);
  if (configFileObj !== null) {
    loadConfigUrl(configFileObj);
  } else {
    console.log('Config file [' + configFile + '] not present.');
    mainWindow.loadURL('file://' + __dirname + '/config-error.html');
  }

  /**
   * Check to see if any load failed
   *
   * If the page isn't available, then we display a local error page
   * wait a few seconds, and then try loading the page again.
   */
  var loadAttempts = 0;
  mainWindow.webContents.on('did-fail-load', function (event, errorCode) {

    // Log load attempts
    loadAttempts += 1;
    console.log('Failed to load configured URL on attempt: ' + loadAttempts);

    // Display the local error screen
    mainWindow.loadURL('file://' + __dirname + '/launch-delay.html');

    // Wait 5 seconds and then try to load the page again.
    setTimeout(function () {
      loadConfigUrl(configFileObj);
    }, 5000);
  });

  /**
   * Report HTTP response codes
   */
  mainWindow.webContents.on('did-get-response-details', function (
    event, status, newURL, originalURL, httpResponseCode) {
    console.log('httpResponseCode - ' + httpResponseCode + '\n');
  });

  /**
   * Finished a load
   */
  mainWindow.webContents.on('did-finish-load', function () {
    console.log('Finished loading');
  });

  /**
   * Keyboard shortcuts
   *
   * Ctrl or Command + f will switch you to the Finder.
   * We use the "switch to Finder" approach instead of a quit, because in most
   * of our Electron setups we have a launchd process that will relaunch the
   * app on quit. For maintenance, we probably just need to be able to get
   * to the Finder while the application remains running in the background.
   */
  const retReload = globalShortcut.register('CommandOrControl+R', () => {
    console.log('Reload the page');
    mainWindow.reload();
  });

});

function loadConfigUrl(configFileObj) {
  console.log('Loading config URL');
  mainWindow.loadURL(configFileObj.url);
}

app.on('window-all-closed', function () {
  app.quit();
});
