const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
    show: false,
    icon: process.platform === 'win32' 
      ? path.join(__dirname, 'assets/icon.ico')
      : path.join(__dirname, 'assets/icon.png'),
  });

  const isDev = process.env.NODE_ENV === 'development';
  
  mainWindow.setMenuBarVisibility(false);
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:3002');
  } else {
    mainWindow.loadURL('http://localhost:3002');  
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  const dev = process.env.NODE_ENV !== 'production';
  const url = dev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '.next/server/pages/index.html')}`;
  mainWindow.loadURL(url);
  if (dev) {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}
app.on('ready', createMainWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});

app.whenReady().then(() => {
  createMainWindow();
});

// IPC 处理程序
let watchers = {};

ipcMain.handle("read-directory", async (_, dirPath) => {
  try {
    const files = fs.readdirSync(dirPath).map((file) => {
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);
      return {
        name: file,
        path: fullPath,
        isDirectory: stat.isDirectory(),
      };
    });
    return files;
  } catch (error) {
    console.error('Error reading directory:', error);
    throw error;
  }
});

ipcMain.handle('dialog:openFolder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  } catch (error) {
    console.error('Error opening folder dialog:', error);
    throw error;
  }
});

ipcMain.handle("watch-directory", async (event, dirPath) => {
  try {
    if (watchers[dirPath]) {
      watchers[dirPath].close();
    }
    watchers[dirPath] = fs.watch(dirPath, { recursive: false }, (eventType, filename) => {
      event.sender.send("directory-changed", dirPath);
    });
    return true;
  } catch (error) {
    console.error('Error watching directory:', error);
    throw error;
  }
});

ipcMain.handle("unwatch-directory", async (event, dirPath) => {
  try {
    if (watchers[dirPath]) {
      watchers[dirPath].close();
      delete watchers[dirPath];
    }
    return true;
  } catch (error) {
    console.error('Error unwatching directory:', error);
    throw error;
  }
});

ipcMain.handle('move-file', async (_, src, destDir) => {
  try {
    const dest = path.join(destDir, path.basename(src));
    fs.renameSync(src, dest);
    return true;
  } catch (error) {
    console.error('Error moving file:', error);
    throw error;
  }
});



app.on('window-all-closed', () => {
  // 关闭所有目录监听器
  Object.keys(watchers).forEach(dirPath => {
    if (watchers[dirPath]) {
      watchers[dirPath].close();
    }
  });
  watchers = {};
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

