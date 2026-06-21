import ELK from 'elkjs/lib/elk.bundled.js'
import type { FlowGraph } from '@flowlm/core'

export interface NodeSize {
  id: string
  width: number
  height: number
}

export type Positions = Map<string, { x: number; y: number }>

/** Pluggable auto-layout interface (the brief's `LayoutEngine`). */
export interface LayoutEngine {
  layout(graph: FlowGraph, sizes: NodeSize[]): Promise<Positions>
}

function directionToElk(direction: FlowGraph['direction']): string {
  switch (direction) {
    case 'LR':
      return 'RIGHT'
    case 'RL':
      return 'LEFT'
    case 'BT':
      return 'UP'
    default:
      return 'DOWN' // TD / TB
  }
}

/**
 * ELK "layered" auto-layout. Uses the bundled build, which runs on the main
 * thread (no Web Worker → no Blob-worker blocked by our `script-src 'self'` CSP).
 */
export class ElkLayoutEngine implements LayoutEngine {
  private readonly elk = new ELK()

  async layout(graph: FlowGraph, sizes: NodeSize[]): Promise<Positions> {
    const sizeMap = new Map(sizes.map((s) => [s.id, s]))
    const nodeIds = new Set(graph.nodes.map((n) => n.id))

    const elkGraph = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': directionToElk(graph.direction),
        'elk.spacing.nodeNode': '45',
        'elk.layered.spacing.nodeNodeBetweenLayers': '55',
        'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES'
      },
      children: graph.nodes.map((n) => {
        const s = sizeMap.get(n.id)
        return { id: n.id, width: s?.width ?? 120, height: s?.height ?? 40 }
      }),
      edges: graph.edges
        .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
        .map((e, i) => ({ id: e.id ?? `e${i}`, sources: [e.source], targets: [e.target] }))
    }

    const result = await this.elk.layout(elkGraph)
    const positions: Positions = new Map()
    for (const child of result.children ?? []) {
      positions.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 })
    }
    return positions
  }
}
