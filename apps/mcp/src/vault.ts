import { promises as fs } from 'fs'
import { dirname, join, relative, resolve, sep } from 'path'
import { parseDocument } from '@flowlm/core'

/**
 * A FlowLM diagram vault on disk. All writes are validated through the shared
 * `@flowlm/core` parser, written atomically (temp + rename), and confined to the
 * vault (path-traversal guarded).
 */
export class Vault {
  private readonly root: string

  constructor(root: string) {
    this.root = resolve(root)
  }

  /** Resolves a vault-relative `.md` path, refusing escapes and non-markdown. */
  resolveSafe(rel: string): string {
    if (typeof rel !== 'string' || rel.trim() === '') throw new Error('A diagram path is required')
    const target = resolve(this.root, rel)
    if (target !== this.root && !target.startsWith(this.root + sep)) {
      throw new Error(`Path escapes the vault: ${rel}`)
    }
    if (!target.toLowerCase().endsWith('.md')) {
      throw new Error('Only .md diagram files are allowed')
    }
    return target
  }

  /** Rejects content that isn't a valid FlowLM document. */
  private validate(content: string): void {
    try {
      parseDocument(content)
    } catch (e) {
      throw new Error(`Invalid diagram: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  private async atomicWrite(target: string, content: string): Promise<void> {
    await fs.mkdir(dirname(target), { recursive: true })
    const tmp = `${target}.tmp-${process.pid}-${Date.now()}`
    await fs.writeFile(tmp, content, 'utf8')
    await fs.rename(tmp, target)
  }

  private async exists(p: string): Promise<boolean> {
    try {
      await fs.access(p)
      return true
    } catch {
      return false
    }
  }

  /** Relative paths of every `.md` diagram in the vault, sorted. */
  async list(): Promise<string[]> {
    const out: string[] = []
    const walk = async (dir: string): Promise<void> => {
      let entries: import('fs').Dirent[]
      try {
        entries = await fs.readdir(dir, { withFileTypes: true })
      } catch {
        return // vault not created yet
      }
      for (const e of entries) {
        if (e.name.startsWith('.')) continue
        const full = join(dir, e.name)
        if (e.isDirectory()) await walk(full)
        else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) {
          out.push(relative(this.root, full).split(sep).join('/'))
        }
      }
    }
    await walk(this.root)
    return out.sort()
  }

  async read(rel: string): Promise<string> {
    return fs.readFile(this.resolveSafe(rel), 'utf8')
  }

  /** Creates a new diagram; refuses to overwrite an existing file. */
  async create(rel: string, content: string): Promise<void> {
    this.validate(content)
    const target = this.resolveSafe(rel)
    if (await this.exists(target)) throw new Error(`Diagram already exists: ${rel}`)
    await this.atomicWrite(target, content)
  }

  /** Overwrites an existing diagram; refuses to create a new one. */
  async update(rel: string, content: string): Promise<void> {
    this.validate(content)
    const target = this.resolveSafe(rel)
    if (!(await this.exists(target))) throw new Error(`Diagram does not exist: ${rel}`)
    await this.atomicWrite(target, content)
  }
}
