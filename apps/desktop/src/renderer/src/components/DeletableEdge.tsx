import { createContext, useContext, useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react'

/** Lets a custom edge delete itself through the canvas's edge state. */
export const EdgeToolsContext = createContext<{ onDelete: (id: string) => void }>({
  onDelete: () => {}
})

/**
 * The default arrow, plus a delete (✕) button at its midpoint that fades in while
 * the arrow (or the button) is hovered. Removing it updates the Markdown source.
 */
export function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  label
}: EdgeProps) {
  const { onDelete } = useContext(EdgeToolsContext)
  const [hovered, setHovered] = useState(false)
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  })

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {/* Invisible, wider hit area so the arrow is easy to hover. */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={18}
        style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      <EdgeLabelRenderer>
        <div
          className="edge-tools nodrag nopan"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all'
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {label ? <span className="edge-label">{label}</span> : null}
          <button
            className="edge-del"
            data-show={hovered}
            title="Delete arrow"
            onClick={() => onDelete(id)}
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
