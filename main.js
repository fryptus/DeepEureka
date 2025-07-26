const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let nextProcess = null;

function createMainWindow() {
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
  
  // 加载 Next.js 应用
  mainWindow.loadURL('http://localhost:3000');
  
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Show the window once it's ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App event listeners
app.whenReady().then(() => {
  createMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// IPC handlers
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

