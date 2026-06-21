import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'

export interface Settings {
  vaultPath: string
}

const settingsFile = (): string => join(app.getPath('userData'), 'flowlm-settings.json')

function defaults(): Settings {
  return { vaultPath: join(app.getPath('documents'), 'FlowLM') }
}

let cache: Settings | null = null

export function getSettings(): Settings {
  if (cache) return cache
  try {
    if (existsSync(settingsFile())) {
      const loaded: Settings = { ...defaults(), ...JSON.parse(readFileSync(settingsFile(), 'utf8')) }
      cache = loaded
      return loaded
    }
  } catch {
    // Corrupt settings — fall back to defaults.
  }
  const fresh = defaults()
  cache = fresh
  return fresh
}

export function setSettings(patch: Partial<Settings>): Settings {
  cache = { ...getSettings(), ...patch }
  try {
    writeFileSync(settingsFile(), JSON.stringify(cache, null, 2), 'utf8')
  } catch {
    // Best-effort; settings are not critical to keep the app running.
  }
  return cache
}
