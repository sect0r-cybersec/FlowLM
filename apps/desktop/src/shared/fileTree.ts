/**
 * Shared (main ↔ renderer) file-tree types and the pure relative-path → tree
 * builder. No node/DOM dependencies, so it's trivially unit-testable.
 */
export interface FileNode {
  name: string
  /** Path relative to the vault root, using forward slashes. */
  path: string
  type: 'file' | 'dir'
  children?: FileNode[]
}

/** Builds a sorted (dirs first, then alphabetical) tree from relative file paths. */
export function pathsToTree(relPaths: string[]): FileNode[] {
  const root: FileNode = { name: '', path: '', type: 'dir', children: [] }

  for (const rel of relPaths) {
    const parts = rel.split('/').filter(Boolean)
    let cursor = root
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1
      const path = parts.slice(0, i + 1).join('/')
      let child = cursor.children!.find((c) => c.name === part && c.path === path)
      if (!child) {
        child = isFile
          ? { name: part, path, type: 'file' }
          : { name: part, path, type: 'dir', children: [] }
        cursor.children!.push(child)
      }
      if (!isFile) cursor = child
    })
  }

  const sort = (nodes: FileNode[]): FileNode[] => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    for (const n of nodes) if (n.children) sort(n.children)
    return nodes
  }

  return sort(root.children!)
}
