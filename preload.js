const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readDirectory: (path) => ipcRenderer.invoke('read-directory', path),
  openFolderDialog: () => ipcRenderer.invoke('dialog:openFolder'),
  watchDirectory: (path) => ipcRenderer.invoke('watch-directory', path),
  unwatchDirectory: (path) => ipcRenderer.invoke('unwatch-directory', path),
  onDirectoryChanged: (callback) => ipcRenderer.on('directory-changed', (_, dirPath) => callback(dirPath)),
  moveFile: (src, destDir) => ipcRenderer.invoke('move-file', src, destDir),
});
