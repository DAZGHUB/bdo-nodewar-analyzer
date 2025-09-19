const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  fetchRoster: (guildName) => ipcRenderer.invoke('fetch-roster', guildName),
  analyzeImage: (payload) => ipcRenderer.invoke('analyze-image', payload)
});