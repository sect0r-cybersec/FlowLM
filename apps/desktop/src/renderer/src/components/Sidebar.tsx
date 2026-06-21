import { useState } from 'react'
import { VaultDiamond, Chevron, FolderTree, FileDoc } from './Icons'
import type { FileNode } from '../fileApi'

interface SidebarProps {
  vaultName: string
  vaultPath: string
  tree: FileNode[]
  activePath: string | null
  onOpenFile: (node: FileNode) => void
}

function TreeRow({
  node,
  depth,
  activePath,
  onOpenFile
}: {
  node: FileNode
  depth: number
  activePath: string | null
  onOpenFile: (node: FileNode) => void
}) {
  const [open, setOpen] = useState(true)
  const pad = { paddingLeft: 8 + depth * 14 }

  if (node.type === 'dir') {
    return (
      <>
        <button className="row folder" style={pad} onClick={() => setOpen((o) => !o)}>
          <Chevron className="chev" style={{ transform: open ? 'rotate(90deg)' : 'none' }} />
          <FolderTree />
          {node.name}
        </button>
        {open &&
          node.children?.map((c) => (
            <TreeRow key={c.path} node={c} depth={depth + 1} activePath={activePath} onOpenFile={onOpenFile} />
          ))}
      </>
    )
  }

  return (
    <button
      className={`row${node.path === activePath ? ' active' : ''}`}
      style={pad}
      onClick={() => onOpenFile(node)}
    >
      <FileDoc />
      {node.name}
    </button>
  )
}

export function Sidebar({ vaultName, vaultPath, tree, activePath, onOpenFile }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="vault-head">
        <div className="vault-name">
          <VaultDiamond />
          {vaultName}
        </div>
        <div className="vault-path" title={vaultPath}>
          {vaultPath}
        </div>
      </div>
      <div className="tree">
        <div className="tree-section">Diagrams</div>
        {tree.length === 0 ? (
          <div className="tree-empty">No .md diagrams yet.</div>
        ) : (
          tree.map((node) => (
            <TreeRow key={node.path} node={node} depth={0} activePath={activePath} onOpenFile={onOpenFile} />
          ))
        )}
      </div>
    </aside>
  )
}
