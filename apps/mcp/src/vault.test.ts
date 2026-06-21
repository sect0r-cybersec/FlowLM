import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { Vault } from './vault'

const VALID = '# Test\n\n## main\n\n```mermaid\nflowchart TD\n  A([Start]) --> B[Work]\n```\n'

let dir: string
let vault: Vault

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'flowlm-vault-'))
  vault = new Vault(dir)
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('path safety', () => {
  it('rejects path traversal', () => {
    expect(() => vault.resolveSafe('../evil.md')).toThrow(/escapes the vault/)
    expect(() => vault.resolveSafe('../../etc/passwd.md')).toThrow(/escapes the vault/)
  })
  it('rejects non-markdown files', () => {
    expect(() => vault.resolveSafe('note.txt')).toThrow(/\.md/)
  })
  it('rejects empty paths', () => {
    expect(() => vault.resolveSafe('')).toThrow()
  })
  it('accepts nested .md paths', () => {
    expect(vault.resolveSafe('sub/x.md')).toContain('x.md')
  })
})

describe('create / read / update', () => {
  it('creates then reads and lists', async () => {
    await vault.create('a.md', VALID)
    expect(await vault.read('a.md')).toBe(VALID)
    expect(await vault.list()).toEqual(['a.md'])
  })

  it('lists nested diagrams sorted', async () => {
    await vault.create('z.md', VALID)
    await vault.create('sub/a.md', VALID)
    expect(await vault.list()).toEqual(['sub/a.md', 'z.md'])
  })

  it('refuses to overwrite on create', async () => {
    await vault.create('a.md', VALID)
    await expect(vault.create('a.md', VALID)).rejects.toThrow(/already exists/)
  })

  it('refuses to update a missing diagram', async () => {
    await expect(vault.update('missing.md', VALID)).rejects.toThrow(/does not exist/)
  })

  it('updates an existing diagram', async () => {
    await vault.create('a.md', VALID)
    const next = VALID.replace('Work', 'Work refined')
    await vault.update('a.md', next)
    expect(await vault.read('a.md')).toBe(next)
  })

  it('validates content through the shared parser', async () => {
    await expect(vault.create('bad.md', '# Just text, no mermaid')).rejects.toThrow(/Invalid diagram/)
  })

  it('blocks writes that escape the vault', async () => {
    await expect(vault.create('../escape.md', VALID)).rejects.toThrow(/escapes the vault/)
  })
})
