interface ElectronAPI {
    isElectron: boolean
    saveFileDialog: (options: { defaultName: string; content: string }) => Promise<{ success: boolean; path?: string }>
    openFileDialog: () => Promise<{ success: boolean; content?: string; path?: string }>
}

interface Window {
    electronAPI?: ElectronAPI
}
