const os = require('os');
const path = require('path');
const { contextBridge, ipcRenderer } = require('electron');
const Toastify = require('toastify-js');

contextBridge.exposeInMainWorld('os', {
  homedir: () => os.homedir(),
});

contextBridge.exposeInMainWorld('path', {
  join: (...args) => path.join(...args),
});

contextBridge.exposeInMainWorld('ipcRenderer', {
  send: (channel, data) => {
    // Whitelist channels
    const validChannels = [
      'image:resize',
      'history:get',
      'history:clear',
      'settings:get',
      'settings:save',
      'settings:reset',
      'settings:select-output-path',
      'open:folder',
      'open:file',
      'batch:process'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  on: (channel, func) => {
    const validChannels = [
      'image:done',
      'image:error',
      'history:response',
      'settings:response',
      'settings:output-path-selected',
      'batch:progress',
      'batch:complete',
      'batch:error'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
});

contextBridge.exposeInMainWorld('Toastify', {
  toast: (options) => Toastify(options).showToast(),
});
