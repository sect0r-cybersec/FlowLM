import { BrowserWindow, dialog } from 'electron'
import { basename, dirname, join, relative, sep } from 'path'
import { promises as fs } from 'fs'
import { getSettings, setSettings } from './settings'
import { pathsToTree, type FileNode } from '../shared/fileTree'

const SEED_SAMPLE = `# Robot vacuum control flow

## main

\`\`\`mermaid
flowchart TD
  Start([Start]) --> Power["Power on"]
  Power --> Scan["Scan environment"]
  Scan --> Plan[["Plan route"]]
  Plan --> Follow["Follow route"]
  Follow --> Done{"Finished route?"}
  Done -->|Yes| Off[/"Vacuum off"/]
  Done -->|No| Follow
  Off --> Dock["Return to dock"]
  Dock --> End(["End"])
  Logs[(Logs)] -.-> Scan
\`\`\`

## Plan route

\`\`\`mermaid
flowchart TD
  In([Enter]) --> Grid["Build grid"]
  Grid --> Path["Plan path"]
  Path --> Obstacle{"Obstacle?"}
  Obstacle -->|Yes| Reroute[Reroute]
  Obstacle -->|No| Out([Return])
  Reroute --> Path
\`\`\`
`

/** Atomic write: temp file + rename, so a crash mid-write can't corrupt the file. */
async function atomicWrite(target: string, content: string | Buffer): Promise<void> {
  await fs.mkdir(dirname(target), { recursive: true })
  const tmp = `${target}.tmp-${process.pid}-${Date.now()}`
  await fs.writeFile(tmp, content)
  await fs.rename(tmp, target)
}

/** Ensures the vault directory exists; seeds the robot-vacuum example on first run. */
export async function ensureVault(): Promise<string> {
  const { vaultPath } = getSettings()
  await fs.mkdir(vaultPath, { recursive: true })
  const entries = await fs.readdir(vaultPath)
  if (entries.length === 0) {
    await atomicWrite(join(vaultPath, 'robot-vacuum.md'), SEED_SAMPLE)
  }
  return vaultPath
}

async function walkMarkdown(dir: string, base: string): Promise<string[]> {
  const out: string[] = []
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    if (e.name.startsWith('.')) continue
    const full = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walkMarkdown(full, base)))
    else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) {
      out.push(relative(base, full).split(sep).join('/'))
    }
  }
  return out
}

export async function listVault(): Promise<{ vaultPath: string; tree: FileNode[] }> {
  const vaultPath = await ensureVault()
  const tree = pathsToTree(await walkMarkdown(vaultPath, vaultPath))
  return { vaultPath, tree }
}

export function readFile(absPath: string): Promise<string> {
  return fs.readFile(absPath, 'utf8')
}

export async function openDialog(
  win: BrowserWindow | null
): Promise<{ path: string; content: string } | null> {
  const { vaultPath } = getSettings()
  const res = await dialog.showOpenDialog(win!, {
    defaultPath: vaultPath,
    filters: [{ name: 'Markdown', extensions: ['md'] }],
    properties: ['openFile']
  })
  if (res.canceled || res.filePaths.length === 0) return null
  const path = res.filePaths[0]
  return { path, content: await readFile(path) }
}

export async function saveFile(
  win: BrowserWindow | null,
  args: { path: string | null; content: string; suggestedName?: string }
): Promise<{ path: string; name: string } | null> {
  let target = args.path
  if (!target) {
    const { vaultPath } = getSettings()
    const res = await dialog.showSaveDialog(win!, {
      defaultPath: join(vaultPath, args.suggestedName || 'untitled.md'),
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })
    if (res.canceled || !res.filePath) return null
    target = res.filePath
  }
  await atomicWrite(target, args.content)
  return { path: target, name: basename(target) }
}

export async function chooseVault(
  win: BrowserWindow | null
): Promise<{ vaultPath: string; tree: FileNode[] } | null> {
  const res = await dialog.showOpenDialog(win!, { properties: ['openDirectory', 'createDirectory'] })
  if (res.canceled || res.filePaths.length === 0) return null
  setSettings({ vaultPath: res.filePaths[0] })
  return listVault()
}

export async function exportImage(
  win: BrowserWindow | null,
  args: { data: string; format: 'png' | 'jpeg' | 'svg'; suggestedName?: string }
): Promise<{ path: string } | null> {
  const { vaultPath } = getSettings()
  const ext = args.format === 'jpeg' ? 'jpg' : args.format
  const res = await dialog.showSaveDialog(win!, {
    defaultPath: join(vaultPath, `${args.suggestedName || 'diagram'}.${ext}`),
    filters: [{ name: args.format.toUpperCase(), extensions: [ext] }]
  })
  if (res.canceled || !res.filePath) return null

  if (args.format === 'svg') {
    await atomicWrite(res.filePath, args.data)
  } else {
    // data is a `data:image/...;base64,...` URL.
    const base64 = args.data.replace(/^data:image\/\w+;base64,/, '')
    await atomicWrite(res.filePath, Buffer.from(base64, 'base64'))
  }
  return { path: res.filePath }
}
