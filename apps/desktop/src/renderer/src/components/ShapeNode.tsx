import { Handle, Position, type NodeProps } from '@xyflow/react'
import { ShapeSvg, SHAPES, type ShapeKind } from '../shapes'

export interface ShapeNodeData {
  label: string
  kind: ShapeKind
  w?: number
  h?: number
  [key: string]: unknown
}

const handleStyle: React.CSSProperties = {
  width: 7,
  height: 7,
  background: 'var(--accent-strong)',
  border: '1px solid var(--canvas)',
  opacity: 0
}

export function ShapeNode({ data, selected }: NodeProps) {
  const d = data as ShapeNodeData
  const size = SHAPES[d.kind].defaultSize
  const w = d.w ?? size.w
  const h = d.h ?? size.h
  const isConnector = d.kind === 'connector'

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
        outline: selected ? '2px solid var(--accent-strong)' : 'none',
        outlineOffset: 3,
        borderRadius: 4
      }}
    >
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <ShapeSvg kind={d.kind} w={w} h={h} />
      {!isConnector && (
        <span
          style={{
            position: 'relative',
            zIndex: 1,
            color: 'var(--n-text)',
            fontFamily: 'Inter, sans-serif',
            fontSize: 13,
            fontWeight: 600,
            textAlign: 'center',
            padding: '0 10px',
            lineHeight: 1.15,
            pointerEvents: 'none'
          }}
        >
          {d.label}
        </span>
      )}
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  )
}
