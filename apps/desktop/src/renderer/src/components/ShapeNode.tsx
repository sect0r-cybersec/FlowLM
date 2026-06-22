import { Handle, Position, type NodeProps } from '@xyflow/react'
import { createContext, useContext } from 'react'
import { ShapeSvg, SHAPES, type ShapeKind } from '../shapes'

export interface ShapeNodeData {
  label: string
  kind: ShapeKind
  w?: number
  h?: number
  [key: string]: unknown
}

/**
 * Lets the active node render an inline rename editor. The canvas owns the
 * `editingId` and the commit/cancel handlers; nodes read them from context so
 * node `data` stays free of UI state.
 */
export interface NodeEditState {
  editingId: string | null
  commit: (id: string, label: string) => void
  cancel: () => void
}

export const NodeEditContext = createContext<NodeEditState>({
  editingId: null,
  commit: () => {},
  cancel: () => {}
})

// One port per side. In ConnectionMode.Loose each can be both source and target,
// so arrows can enter or leave a node from any of its four dots.
const PORTS = [
  { id: 'top', position: Position.Top },
  { id: 'right', position: Position.Right },
  { id: 'bottom', position: Position.Bottom },
  { id: 'left', position: Position.Left }
] as const

const labelBase: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  color: 'var(--n-text)',
  fontFamily: 'Inter, sans-serif',
  fontSize: 13,
  fontWeight: 600,
  textAlign: 'center',
  padding: '0 10px',
  lineHeight: 1.15
}

export function ShapeNode({ id, data }: NodeProps) {
  const d = data as ShapeNodeData
  const size = SHAPES[d.kind].defaultSize
  const w = d.w ?? size.w
  const h = d.h ?? size.h
  const isConnector = d.kind === 'connector'
  const { editingId, commit, cancel } = useContext(NodeEditContext)
  const editing = editingId === id

  // Hover/selected outline is styled in app.css so the (dimmer) hover border and
  // the (solid) selected border can layer correctly — inline styles can't do :hover.
  return (
    <div
      className="shape-node"
      style={{
        position: 'relative',
        width: w,
        height: h,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4
      }}
    >
      {PORTS.map((p) => (
        <Handle key={p.id} id={p.id} type="source" position={p.position} className="node-port" />
      ))}
      <ShapeSvg kind={d.kind} w={w} h={h} />
      {!isConnector &&
        (editing ? (
          <textarea
            className="nodrag nopan shape-rename"
            autoFocus
            defaultValue={d.label}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={(e) => commit(id, e.currentTarget.value)}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                commit(id, e.currentTarget.value)
              } else if (e.key === 'Escape') {
                e.preventDefault()
                cancel()
              }
            }}
            style={{
              ...labelBase,
              pointerEvents: 'auto',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              width: '100%',
              height: '74%',
              overflow: 'hidden'
            }}
          />
        ) : (
          <span style={{ ...labelBase, pointerEvents: 'none' }}>{d.label}</span>
        ))}
    </div>
  )
}
