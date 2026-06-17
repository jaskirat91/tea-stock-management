import 'reflect-metadata';
import { app, BrowserWindow, nativeImage, dialog } from 'electron';
import * as path from 'path';
import { AppDataSource } from './infrastructure/database/dataSource';
import { setupIpcHandlers } from './interfaces/ipc/handlers';

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let ipcHandlersRegistered = false;

async function bootstrap() {
  try {
    // 1. Initialize Database
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();

      // In production, sync schema if it's a fresh installation or incomplete
      if (!isDev) {
        const result = await AppDataSource.query(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='issue_vouchers'`,
        );
        if (result.length === 0) {
          await AppDataSource.synchronize();
          console.log('Fresh installation or incomplete schema detected. Database schema synchronized.');
        } else {
          // Run migrations for existing installations
          const migrations = await AppDataSource.runMigrations();
          if (migrations.length > 0) {
            console.log(
              `Applied ${migrations.length} migrations:`,
              migrations.map((m) => m.name),
            );
          } else {
            console.log('No pending migrations found.');
          }
        }
      }

      console.log('Database initialized successfully');
    }

    // 2. Setup IPC Handlers — guard against duplicate registration on macOS
    // 'activate' can re-trigger bootstrap(); registering handlers twice crashes.
    if (!ipcHandlersRegistered) {
      setupIpcHandlers();
      ipcHandlersRegistered = true;
    }

    // 3. Resolve the app icon
    // Always use the 512x512 PNG for nativeImage — most reliable on all platforms.
    // On macOS, BrowserWindow.icon alone does NOT update the Dock icon in dev mode;
    // app.dock.setIcon() must be called explicitly.
    const iconPngPath = isDev
      ? path.join(__dirname, '../../../../assets/icons/png/512x512.png')
      : path.join(process.resourcesPath, 'app/assets/icons/png/512x512.png');
    const appIcon = nativeImage.createFromPath(iconPngPath);

    // Set macOS Dock icon explicitly (required in dev mode)
    if (process.platform === 'darwin' && app.dock) {
      app.dock.setIcon(appIcon);
    }

    // 4. Create the browser window
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      icon: appIcon,
      show: false,
      backgroundColor: '#080e1a',
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    if (isDev) {
      mainWindow.loadURL('http://localhost:5173');
      // mainWindow.webContents.openDevTools();
    } else {
      const indexPath = path.join(app.getAppPath(), 'dist/renderer/index.html');
      mainWindow.loadFile(indexPath);
    }

    // 5. Show window once the content is ready
    mainWindow.once('ready-to-show', () => {
      mainWindow?.show();
      mainWindow?.focus();
    });
  } catch (error: any) {
    console.error('Error bootstrapping application', error);
    dialog.showErrorBox(
        'Startup Error',
        `The application failed to start.\n\nError: ${error?.message || 'Unknown error'}\n\nStack: ${error?.stack || 'No stack trace available'}`
      );
  }
}

app.whenReady().then(bootstrap);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    bootstrap();
  }
});
