import { contextBridge, ipcRenderer } from 'electron';

// Expose safe, tightly-scoped administrative IPC bridge to renderer
contextBridge.exposeInMainWorld('adminBridge', {
  isElectron: true,
  platform: 'darwin',
  targetArchitecture: 'x86_64',
  supportedMinOs: 'macOS Big Sur 11.7.11',

  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  exportReport: (params: { filename: string; content: string }) => ipcRenderer.invoke('dialog:export-file', params),
  openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),

  // In-memory secure token management bridge
  onSessionTimeout: (callback: () => void) => {
    ipcRenderer.on('session:timeout', () => callback());
  }
});
