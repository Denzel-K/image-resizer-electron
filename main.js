const path = require('path');
const os = require('os');
const fs = require('fs');
const resizeImg = require('resize-img');
const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron');
const ElectronStore = require('electron-store');

const isDev = process.env.NODE_ENV !== 'production';
const isMac = process.platform === 'darwin';

// Initialize stores
const store = new ElectronStore({
  name: 'settings',
  defaults: {
    outputPath: path.join(os.homedir(), 'imageresizer'),
    defaultFormat: 'same',
    saveHistory: true
  }
});

const historyStore = new ElectronStore({
  name: 'history',
  defaults: {
    items: []
  }
});

let mainWindow;
let aboutWindow;

// Main Window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: isDev ? 1000 : 500,
    height: 600,
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
    resizable: isDev,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Show devtools automatically if in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

    // mainWindow.loadURL(`file://${__dirname}/renderer/index.html`);
   mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));
}

// About Window
function createAboutWindow() {
  aboutWindow = new BrowserWindow({
    width: 300,
    height: 300,
    title: 'About Electron',
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
  });

   aboutWindow.loadFile(path.join(__dirname, './renderer/about.html'));
}

// When the app is ready, create the window
app.on('ready', () => {
  createMainWindow();

  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);

  // Remove variable from memory
  mainWindow.on('closed', () => (mainWindow = null));
});

// Menu template
const menu = [
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            {
              label: 'About',
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
  {
    role: 'fileMenu',
  },
  ...(!isMac
    ? [
        {
          label: 'Help',
          submenu: [
            {
              label: 'About',
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
  ...(isDev
    ? [
        {
          label: 'Developer',
          submenu: [
            { role: 'reload' },
            { role: 'forcereload' },
            { type: 'separator' },
            { role: 'toggledevtools' },
          ],
        },
      ]
    : []),
];

// Respond to the resize image event
ipcMain.on('image:resize', (e, options) => {
  // Get output path from settings
  const outputPath = store.get('outputPath') || path.join(os.homedir(), 'pixelcraft-studio');
  options.dest = outputPath;
  resizeImage(options);
});

// Respond to batch processing request
ipcMain.on('batch:process', async (e, options) => {
  try {
    // Get output path from settings if not provided
    if (!options.outputPath) {
      options.outputPath = store.get('outputPath') || path.join(os.homedir(), 'pixelcraft-studio');
    }

    // Start batch processing
    await batchProcessImages(options);
  } catch (err) {
    const errorDetails = handleError(err, 'batch:process', options);
    mainWindow.webContents.send('batch:error', errorDetails.message);
  }
});

// Settings IPC handlers
ipcMain.on('settings:get', (e) => {
  const settings = store.store;
  e.reply('settings:response', settings);
});

ipcMain.on('settings:save', (e, settings) => {
  store.set(settings);
});

ipcMain.on('settings:reset', () => {
  store.clear();
});

ipcMain.on('settings:select-output-path', async (e) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const outputPath = result.filePaths[0];
    e.reply('settings:output-path-selected', outputPath);
  }
});

// History IPC handlers
ipcMain.on('history:get', (e) => {
  const history = historyStore.get('items') || [];
  e.reply('history:response', history);
});

ipcMain.on('history:clear', () => {
  historyStore.set('items', []);
});

ipcMain.on('open:folder', (e, folderPath) => {
  shell.openPath(folderPath);
});

ipcMain.on('open:file', (e, filePath) => {
  shell.openPath(filePath);
});

// Improved error handling
function handleError(error, source, details = {}) {
  // Log error with details
  console.error(`Error in ${source}:`, error);
  console.error('Details:', details);

  // Create error message
  let errorMessage = error.message || 'An unknown error occurred';

  // Add more context based on error type
  if (error.code === 'ENOENT') {
    errorMessage = `File not found: ${details.path || 'Unknown path'}`;
  } else if (error.code === 'EACCES') {
    errorMessage = `Permission denied: ${details.path || 'Unknown path'}`;
  } else if (error.code === 'EISDIR') {
    errorMessage = `Expected a file but got a directory: ${details.path || 'Unknown path'}`;
  }

  // Return formatted error
  return {
    message: errorMessage,
    code: error.code,
    source,
    details,
    timestamp: Date.now()
  };
}

// Resize and save image
async function resizeImage({ imgPath, height, width, dest }) {
  try {
    // Validate inputs
    if (!imgPath) {
      throw new Error('No image path provided');
    }

    if (!fs.existsSync(imgPath)) {
      throw new Error(`Image file not found: ${imgPath}`);
    }

    if (!dest) {
      throw new Error('No destination path provided');
    }

    // Get filename and original dimensions
    const filename = path.basename(imgPath);
    const imageBuffer = fs.readFileSync(imgPath);

    // Resize image
    const newPath = await resizeImg(imageBuffer, {
      width: width ? +width : null,
      height: height ? +height : null,
    });

    // Create destination folder if it doesn't exist
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    // Write the file to the destination folder
    const outputFilePath = path.join(dest, filename);
    fs.writeFileSync(outputFilePath, newPath);

    // Save to history if enabled
    if (store.get('saveHistory')) {
      const historyItems = historyStore.get('items') || [];

      // Add new item to history with full file path
      historyItems.unshift({
        filename,
        width,
        height,
        outputPath: dest,
        fullFilePath: outputFilePath,
        timestamp: Date.now(),
        operation: 'resize'
      });

      // Limit history to 20 items
      if (historyItems.length > 20) {
        historyItems.pop();
      }

      historyStore.set('items', historyItems);
    }

    // Send success to renderer
    mainWindow.webContents.send('image:done');

    // Open the folder in the file explorer
    shell.openPath(dest);

    // Return success
    return {
      success: true,
      outputPath: outputFilePath
    };
  } catch (err) {
    const errorDetails = handleError(err, 'resizeImage', { imgPath, height, width, dest });
    mainWindow.webContents.send('image:error', errorDetails.message);
    return {
      success: false,
      error: errorDetails
    };
  }
}

// Batch process images
async function batchProcessImages(options) {
  const { files, operation, outputFormat, outputPath, overwrite, compression, resize } = options;

  try {
    // Validate inputs
    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new Error('No files provided for batch processing');
    }

    if (!outputPath) {
      throw new Error('No output path provided');
    }

    // Create destination folder if it doesn't exist
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    // Process each file
    const results = [];

    for (let i = 0; i < files.length; i++) {
      const imgPath = files[i];
      const filename = path.basename(imgPath);

      // Update progress
      mainWindow.webContents.send('batch:progress', {
        current: i + 1,
        total: files.length,
        filename
      });

      try {
        // Process based on operation type
        let result;

        if (operation === 'resize') {
          result = await resizeImage({
            imgPath,
            height: resize.height,
            width: resize.width,
            dest: outputPath
          });
        } else if (operation === 'compress') {
          // Compression logic will be implemented later
          result = { success: false, error: 'Compression not yet implemented' };
        } else if (operation === 'convert') {
          // Format conversion logic will be implemented later
          result = { success: false, error: 'Format conversion not yet implemented' };
        } else {
          result = { success: false, error: 'Unknown operation type' };
        }

        results.push({
          filename,
          success: result.success,
          error: result.error
        });
      } catch (err) {
        const errorDetails = handleError(err, 'batchProcessImages', {
          file: imgPath,
          operation,
          index: i
        });

        results.push({
          filename,
          success: false,
          error: errorDetails
        });
      }
    }

    // Send completion to renderer
    mainWindow.webContents.send('batch:complete', results);

    return {
      success: true,
      results
    };
  } catch (err) {
    const errorDetails = handleError(err, 'batchProcessImages', options);
    mainWindow.webContents.send('batch:error', errorDetails.message);
    return {
      success: false,
      error: errorDetails
    };
  }
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});

// Open a window if none are open (macOS)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
