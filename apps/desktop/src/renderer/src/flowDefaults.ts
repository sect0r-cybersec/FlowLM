import { MarkerType, type Edge } from '@xyflow/react'

export const EDGE_COLOR = '#9b94a8'

/** Consistent edge styling for both seeded edges and drag-to-connect edges. */
export function defaultEdgeProps(dashed = false): Partial<Edge> {
  return {
    type: 'deletable',
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: EDGE_COLOR },
    style: {
      stroke: EDGE_COLOR,
      strokeWidth: 1.9,
      ...(dashed ? { strokeDasharray: '5 5' } : {})
    },
    labelStyle: { fill: '#cfc9d6', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600 },
    labelBgStyle: { fill: 'var(--canvas)' }
  }
}
