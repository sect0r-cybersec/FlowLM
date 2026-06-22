import type { FileNode } from '../../shared/fileTree'

export type { FileNode }

/** The Electron file API, or `undefined` when running in a plain browser. */
export const files = typeof window !== 'undefined' ? window.flowlm?.files : undefined

/** App settings + MCP toggle, or `undefined` in the plain-browser preview. */
export const settings = typeof window !== 'undefined' ? window.flowlm?.settings : undefined

export function baseName(p: string): string {
  return p.split(/[\\/]/).pop() ?? p
}

/** Joins the vault path and a relative path with a forward slash (fs accepts it). */
export function vaultJoin(vaultPath: string, rel: string): string {
  return `${vaultPath.replace(/[\\/]$/, '')}/${rel}`
}

/** The path of `abs` relative to the vault, or null if it lives outside it. */
export function relToVault(abs: string, vaultPath: string): string | null {
  const a = abs.replace(/\\/g, '/')
  const v = vaultPath.replace(/\\/g, '/').replace(/\/$/, '')
  return a.startsWith(`${v}/`) ? a.slice(v.length + 1) : null
}
