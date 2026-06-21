import { app, shell, BrowserWindow, ipcMain, session, clipboard } from 'electron'
import { join } from 'path'
import { listVault, readFile, openDialog, saveFile, chooseVault, exportImage } from './files'

const isDev = !!process.env['ELECTRON_RENDERER_URL']

/** Strict CSP for the packaged app. In dev, Vite needs inline scripts for HMR. */
function applyProductionCsp(): void {
  if (isDev) return
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; script-src 'self'"
        ]
      }
    })
  })
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1100,
    minHeight: 640,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#1e1e1f',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  win.on('ready-to-show', () => win.show())

  // Open external links in the user's browser, not a new Electron window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Keep the renderer informed of maximize state so the title bar icon can react.
  const emitMaxState = () => win.webContents.send('window:maximized', win.isMaximized())
  win.on('maximize', emitMaxState)
  win.on('unmaximize', emitMaxState)

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  applyProductionCsp()

  // Custom title bar window controls.
  ipcMain.on('window:minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize())
  ipcMain.on('window:toggle-maximize', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return
    win.isMaximized() ? win.unmaximize() : win.maximize()
  })
  ipcMain.on('window:close', (e) => BrowserWindow.fromWebContents(e.sender)?.close())
  ipcMain.handle('window:is-maximized', (e) =>
    BrowserWindow.fromWebContents(e.sender)?.isMaximized() ?? false
  )

  // Vault + file operations.
  const winOf = (e: Electron.IpcMainInvokeEvent) => BrowserWindow.fromWebContents(e.sender)
  ipcMain.handle('vault:list', () => listVault())
  ipcMain.handle('vault:choose', (e) => chooseVault(winOf(e)))
  ipcMain.handle('file:read', (_e, absPath: string) => readFile(absPath))
  ipcMain.handle('file:open', (e) => openDialog(winOf(e)))
  ipcMain.handle('file:save', (e, args) => saveFile(winOf(e), args))
  ipcMain.handle('export:image', (e, args) => exportImage(winOf(e), args))
  ipcMain.handle('clipboard:write', (_e, text: string) => clipboard.writeText(text))

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
