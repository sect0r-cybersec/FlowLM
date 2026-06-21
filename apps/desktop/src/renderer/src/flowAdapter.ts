import type { Edge, Node } from '@xyflow/react'
import type { FlowGraph } from '@flowlm/core'
import type { Positions } from './core/layout'
import type { ShapeNodeData } from './components/ShapeNode'
import { estimateNodeSize } from './nodeSize'
import { defaultEdgeProps } from './flowDefaults'

/** Projects the live React Flow graph onto the pure model the serializer consumes. */
export function toFlowGraph(nodes: Node<ShapeNodeData>[], edges: Edge[]): FlowGraph {
  return {
    direction: 'TD',
    nodes: nodes.map((n) => ({ id: n.id, kind: n.data.kind, label: n.data.label })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: typeof e.label === 'string' ? e.label : undefined,
      dashed: !!(e.style && e.style.strokeDasharray)
    }))
  }
}

/** Builds positioned React Flow nodes from a parsed graph + ELK positions. */
export function graphToFlowNodes(
  graph: FlowGraph,
  positions: Positions
): Node<ShapeNodeData>[] {
  return graph.nodes.map((n) => {
    const size = estimateNodeSize(n.kind, n.label)
    const pos = positions.get(n.id) ?? { x: 0, y: 0 }
    return {
      id: n.id,
      type: 'shape',
      position: pos,
      data: { kind: n.kind, label: n.label, w: size.w, h: size.h }
    }
  })
}

/** Builds styled React Flow edges from a parsed graph. */
export function graphToFlowEdges(graph: FlowGraph): Edge[] {
  return graph.edges.map((e, i) => ({
    id: e.id ?? `${e.source}-${e.target}-${i}`,
    source: e.source,
    target: e.target,
    label: e.label,
    ...defaultEdgeProps(!!e.dashed)
  }))
}
