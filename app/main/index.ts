import 'reflect-metadata';
import { app, BrowserWindow, ipcMain, nativeImage } from 'electron';
import * as path from 'path';
import { AppDataSource } from './infrastructure/database/dataSource';
import { setupIpcHandlers } from './interfaces/ipc/handlers';

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

async function bootstrap() {
  try {
    // 1. Initialize Database
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();

      // In production, sync schema if it's a fresh installation
      if (!isDev) {
        const result = await AppDataSource.query(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='app_settings'`,
        );
        if (result.length === 0) {
          await AppDataSource.synchronize();
          console.log('Fresh installation detected. Database schema synchronized.');
        } else {
          // Run migrations in both dev and production
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

    // 2. Setup IPC Handlers (Register only once)
    setupIpcHandlers();

    // 3. Resolve the app icon
    const iconPath = isDev
      ? path.join(__dirname, '../../../../build/icon.png')
      : path.join(process.resourcesPath, 'build/icon.png');
    const appIcon = nativeImage.createFromPath(iconPath);

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
  } catch (error) {
    console.error('Error bootstrapping application', error);
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
