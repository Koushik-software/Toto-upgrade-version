import { app, BrowserWindow, ipcMain, shell, session, dialog } from 'electron';
import path from 'path';
import fs from 'fs';

// Big Sur 11.7.11 Compatibility Flag
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling');
app.commandLine.appendSwitch('force_high_performance_gpu', '0');

let mainWindow: BrowserWindow | null = null;

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.cjs');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    title: 'Toto Drive Fleet Operations Console',
    backgroundColor: '#0f172a',
    titleBarStyle: 'hiddenInset', // macOS native traffic lights
    vibrancy: 'under-window', // macOS native Big Sur blur
    visualEffectState: 'active',
    webPreferences: {
      // -------------------------------------------------------------
      // ELECTRON SECURITY INVARIANTS (TASK 5)
      // -------------------------------------------------------------
      contextIsolation: true,              // Enforce strictly isolated JS contexts
      nodeIntegration: false,              // Prevent direct Node.js execution in renderer
      nodeIntegrationInWorker: false,
      sandbox: true,                       // Native OS sandbox
      webSecurity: true,                   // Enforce SOP & CORS
      allowRunningInsecureContent: false,  // Disallow mixed HTTP/HTTPS
      preload: preloadPath
    }
  });

  // Strict Content Security Policy (CSP) enforcement via HTTP headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline'; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src 'self' https://fonts.gstatic.com data:; " +
          "img-src 'self' data: https: blob:; " +
          "connect-src 'self' http://localhost:3000 https://ais-dev-tqhf7unnw3p6opcpsdnmrh-89441897052.asia-southeast1.run.app ws://localhost:3000; " +
          "frame-src 'none'; " +
          "object-src 'none';"
        ],
        'X-Content-Type-Options': ['nosniff'],
        'X-Frame-Options': ['DENY'],
        'X-XSS-Protection': ['1; mode=block']
      }
    });
  });

  // Navigation Guard: Block arbitrary redirects or phishing
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsed = new URL(url);
    const isAllowed =
      parsed.protocol === 'file:' ||
      (parsed.hostname === 'localhost' && parsed.port === '3000') ||
      parsed.hostname.includes('run.app');

    if (!isAllowed) {
      event.preventDefault();
      console.warn(`[Security Warning] Blocked unauthorized navigation attempt to: ${url}`);
    }
  });

  // Block creation of auxiliary browser windows via window.open
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:' || parsed.protocol === 'mailto:') {
        shell.openExternal(url);
      }
    } catch {}
    return { action: 'deny' };
  });

  // Load renderer index.html
  const indexPath = path.join(__dirname, '../src/renderer/index.html');
  if (fs.existsSync(indexPath)) {
    mainWindow.loadFile(indexPath);
  } else {
    // Fallback if running from packaged bundle
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// -------------------------------------------------------------
// SECURE IPC HANDLERS
// -------------------------------------------------------------

ipcMain.handle('app:get-info', () => {
  return {
    version: app.getVersion(),
    name: 'Toto Drive Admin Console',
    targetOS: 'macOS Big Sur 11.7.11 (x86_64)',
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    nodeVersion: process.versions.node
  };
});

ipcMain.handle('dialog:export-file', async (_event, params: { filename: string; content: string }) => {
  if (!mainWindow) return { success: false };
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: params.filename,
    filters: [
      { name: 'CSV Reports', extensions: ['csv'] },
      { name: 'JSON Reports', extensions: ['json'] },
      { name: 'Text Documents', extensions: ['txt'] }
    ]
  });

  if (canceled || !filePath) return { success: false, canceled: true };

  try {
    fs.writeFileSync(filePath, params.content, 'utf-8');
    return { success: true, filePath };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('shell:open-external', async (_event, url: string) => {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'mailto:') {
      await shell.openExternal(url);
      return true;
    }
  } catch {}
  return false;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
