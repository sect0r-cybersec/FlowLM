import { useState } from 'react'
import { VaultDiamond, Chevron, FolderTree, FileDoc } from './Icons'
import { vaultJoin, type FileNode } from '../fileApi'

interface SidebarProps {
  vaultName: string
  vaultPath: string
  tree: FileNode[]
  activePath: string | null
  currentRel: string | null
  canChooseVault: boolean
  onChooseVault: () => void
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

export function Sidebar({
  vaultName,
  vaultPath,
  tree,
  activePath,
  currentRel,
  canChooseVault,
  onChooseVault,
  onOpenFile
}: SidebarProps) {
  // Show where the user is working: the open file's vault-relative path, else the
  // vault root. The header doubles as a "switch vault" button.
  const workingPath = currentRel ? vaultJoin(vaultPath, currentRel) : vaultPath
  return (
    <aside className="sidebar">
      <button
        className="vault-head"
        onClick={onChooseVault}
        disabled={!canChooseVault}
        title={canChooseVault ? 'Click to choose a different vault folder' : workingPath}
      >
        <div className="vault-name">
          <VaultDiamond />
          {vaultName}
          {canChooseVault && <Chevron className="vault-switch" />}
        </div>
        <div className="vault-path" title={workingPath}>
          {workingPath}
        </div>
      </button>
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
