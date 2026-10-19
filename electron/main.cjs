// @ts-nocheck
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')

const isDev = !app.isPackaged
const cacheDir = path.join(os.tmpdir(), 'SpeakarBuilderCache')

app.commandLine.appendSwitch('disk-cache-dir', cacheDir)
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')
app.disableHardwareAcceleration()

function createWindow() {
    const win = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 680,
        title: 'SpeakarBuilder',
        backgroundColor: '#0f0d0b',
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    })

    const distIndex = path.join(__dirname, '../dist/index.html')

    // Show window when content is ready (avoids white flash)
    win.once('ready-to-show', () => {
        win.show()
        win.focus()
    })

    // Safety: never keep the app hidden if page load is slow/failed
    setTimeout(() => {
        if (!win.isDestroyed() && !win.isVisible()) win.show()
    }, 2500)

    if (isDev) {
        const fallbackToDist = async () => {
            if (fs.existsSync(distIndex)) {
                await win.loadFile(distIndex)
            }
            if (!win.isDestroyed() && !win.isVisible()) win.show()
        }

        win.webContents.on('did-fail-load', async () => {
            await fallbackToDist()
        })

        win.loadURL('http://localhost:5173').catch(async () => {
            await fallbackToDist()
        })
        if (process.env.OPEN_DEVTOOLS === '1') {
            win.webContents.openDevTools({ mode: 'detach' })
        }
    } else {
        win.loadFile(distIndex)
    }

    // Update window title with project name
    win.webContents.on('page-title-updated', (_e, title) => {
        win.setTitle(`SpeakarBuilder — ${title}`)
    })

    return win
}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

// ─── IPC: Native Save File Dialog ────────────────────────────────────────────
ipcMain.handle('save-file-dialog', async (event, { defaultName, content }) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showSaveDialog(win, {
        defaultPath: defaultName,
        filters: [
            { name: 'SpeakarBuilder Project', extensions: ['sbp'] },
            { name: 'JSON', extensions: ['json'] },
        ],
    })
    if (!result.canceled && result.filePath) {
        fs.writeFileSync(result.filePath, content, 'utf-8')
        return { success: true, path: result.filePath }
    }
    return { success: false }
})

// ─── IPC: Native Open File Dialog ────────────────────────────────────────────
ipcMain.handle('open-file-dialog', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win, {
        filters: [
            { name: 'SpeakarBuilder Project', extensions: ['sbp', 'json'] },
        ],
        properties: ['openFile'],
    })
    if (!result.canceled && result.filePaths.length > 0) {
        const content = fs.readFileSync(result.filePaths[0], 'utf-8')
        return { success: true, content, path: result.filePaths[0] }
    }
    return { success: false }
})
