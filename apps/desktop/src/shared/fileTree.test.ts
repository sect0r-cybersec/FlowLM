import { describe, it, expect } from 'vitest'
import { pathsToTree } from './fileTree'

describe('pathsToTree', () => {
  it('nests folders and files', () => {
    const tree = pathsToTree(['a.md', 'sub/b.md', 'sub/c.md'])
    expect(tree.map((n) => n.name)).toEqual(['sub', 'a.md']) // dirs first
    const sub = tree.find((n) => n.name === 'sub')!
    expect(sub.type).toBe('dir')
    expect(sub.children!.map((c) => c.name)).toEqual(['b.md', 'c.md'])
    expect(sub.children![0].path).toBe('sub/b.md')
  })

  it('sorts dirs before files, then alphabetically', () => {
    const tree = pathsToTree(['z.md', 'a.md', 'mid/x.md'])
    expect(tree.map((n) => n.name)).toEqual(['mid', 'a.md', 'z.md'])
  })

  it('handles deep nesting without duplicating folders', () => {
    const tree = pathsToTree(['x/y/1.md', 'x/y/2.md', 'x/z.md'])
    const x = tree[0]
    expect(x.name).toBe('x')
    expect(x.children!.map((c) => c.name)).toEqual(['y', 'z.md'])
    const y = x.children!.find((c) => c.name === 'y')!
    expect(y.children!.map((c) => c.name)).toEqual(['1.md', '2.md'])
  })
})
