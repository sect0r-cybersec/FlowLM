import { app } from 'electron'
import { fork, type ChildProcess } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import { getSettings } from './settings'

/**
 * Lifecycle for the bundled FlowLM MCP server (apps/mcp). It's a stdio server, so
 * on its own it only does something useful once an MCP client speaks to it over
 * stdin/stdout — but enabling it here starts the process and points it at the
 * current vault. Disabled by default.
 */

let child: ChildProcess | null = null

/** Resolves the MCP server entry across dev and packaged layouts, or null. */
function resolveEntry(): string | null {
  const candidates = [
    // Packaged: shipped as an extraResource under resources/mcp.
    join(process.resourcesPath ?? '', 'mcp', 'index.js'),
    // Dev (monorepo): apps/mcp built by esbuild to apps/mcp/dist.
    join(app.getAppPath(), '..', 'mcp', 'dist', 'index.js'),
    join(app.getAppPath(), '..', '..', 'mcp', 'dist', 'index.js')
  ]
  return candidates.find((p) => p && existsSync(p)) ?? null
}

export function isMcpRunning(): boolean {
  return !!child && !child.killed
}

export function startMcp(): void {
  if (isMcpRunning()) return
  const entry = resolveEntry()
  if (!entry) {
    console.error('[mcp] server bundle not found; cannot start. Build apps/mcp first.')
    return
  }
  const { vaultPath } = getSettings()
  child = fork(entry, [], {
    env: { ...process.env, FLOWLM_VAULT: vaultPath },
    stdio: ['pipe', 'pipe', 'inherit', 'ipc']
  })
  child.on('exit', (code) => {
    console.error(`[mcp] server exited (code ${code})`)
    child = null
  })
  console.error(`[mcp] server started for vault: ${vaultPath}`)
}

export function stopMcp(): void {
  if (!child) return
  child.kill()
  child = null
}

/** Restarts the server if it's currently enabled (e.g. after the vault changes). */
export function restartMcpIfEnabled(): void {
  if (!getSettings().mcpEnabled) return
  stopMcp()
  startMcp()
}
