import { Nodes, Edges } from './Icons'

export type SyncState = 'synced' | 'parsing' | 'error'

interface StatusBarProps {
  nodeCount: number
  edgeCount: number
  charCount: number
  cursor: { line: number; col: number }
  syncState: SyncState
}

const SYNC_LABEL: Record<SyncState, string> = {
  synced: 'In sync',
  parsing: 'Parsing…',
  error: 'Parse error'
}

const SYNC_COLOR: Record<SyncState, string> = {
  synced: 'var(--ok)',
  parsing: 'var(--text-muted)',
  error: 'oklch(0.7 0.16 25)'
}

export function StatusBar({ nodeCount, edgeCount, charCount, cursor, syncState }: StatusBarProps) {
  return (
    <div className="statusbar">
      <span className="item">
        <Nodes />
        {nodeCount} nodes
      </span>
      <span className="item">
        <Edges />
        {edgeCount} edges
      </span>
      <span className="item sync" style={{ color: SYNC_COLOR[syncState] }}>
        <span className="dot" style={{ background: SYNC_COLOR[syncState], boxShadow: 'none' }} />
        {SYNC_LABEL[syncState]}
      </span>
      <div className="right">
        <span className="item mono">Mermaid</span>
        <span className="item mono">UTF-8</span>
        <span className="item mono">{charCount} chars</span>
        <span className="item mono">
          Ln {cursor.line}, Col {cursor.col}
        </span>
      </div>
    </div>
  )
}
