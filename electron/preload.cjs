const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    saveFileDialog: (options) => ipcRenderer.invoke('save-file-dialog', options),
    openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
})
