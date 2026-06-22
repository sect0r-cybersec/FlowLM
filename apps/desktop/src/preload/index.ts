import { contextBridge, ipcRenderer } from 'electron'
import type { FileNode } from '../shared/fileTree'

const api = {
  /** Custom title-bar window controls. */
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:is-maximized'),
    onMaximizedChange: (cb: (maximized: boolean) => void) => {
      const handler = (_e: unknown, maximized: boolean) => cb(maximized)
      ipcRenderer.on('window:maximized', handler)
      return () => ipcRenderer.removeListener('window:maximized', handler)
    }
  },
  /** Vault, file, export and clipboard operations (Electron main process). */
  files: {
    listVault: (): Promise<{ vaultPath: string; tree: FileNode[] }> =>
      ipcRenderer.invoke('vault:list'),
    chooseVault: (): Promise<{ vaultPath: string; tree: FileNode[] } | null> =>
      ipcRenderer.invoke('vault:choose'),
    read: (absPath: string): Promise<string> => ipcRenderer.invoke('file:read', absPath),
    open: (): Promise<{ path: string; content: string } | null> => ipcRenderer.invoke('file:open'),
    save: (args: {
      path: string | null
      content: string
      suggestedName?: string
    }): Promise<{ path: string; name: string } | null> => ipcRenderer.invoke('file:save', args),
    exportImage: (args: {
      data: string
      format: 'png' | 'jpeg' | 'svg'
      suggestedName?: string
    }): Promise<{ path: string } | null> => ipcRenderer.invoke('export:image', args),
    writeClipboard: (text: string): Promise<void> => ipcRenderer.invoke('clipboard:write', text)
  },
  /** App settings: read all, toggle the bundled MCP server. */
  settings: {
    get: (): Promise<{ vaultPath: string; mcpEnabled: boolean }> =>
      ipcRenderer.invoke('settings:get'),
    setMcpEnabled: (enabled: boolean): Promise<boolean> =>
      ipcRenderer.invoke('mcp:set-enabled', enabled)
  }
}

contextBridge.exposeInMainWorld('flowlm', api)

export type FlowlmApi = typeof api
