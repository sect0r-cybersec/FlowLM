import { describe, it, expect } from 'vitest'
import { ElkLayoutEngine } from './layout'
import type { FlowGraph } from '@flowlm/core'

describe('ElkLayoutEngine', () => {
  const engine = new ElkLayoutEngine()

  it('assigns a position to every node', async () => {
    const graph: FlowGraph = {
      direction: 'TD',
      nodes: [
        { id: 'A', kind: 'terminal', label: 'A' },
        { id: 'B', kind: 'process', label: 'B' },
        { id: 'C', kind: 'process', label: 'C' }
      ],
      edges: [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'C' }
      ]
    }
    const sizes = graph.nodes.map((n) => ({ id: n.id, width: 120, height: 40 }))
    const pos = await engine.layout(graph, sizes)

    expect(pos.size).toBe(3)
    expect(pos.get('A')).toBeDefined()
    // TD layout stacks downward: B below A, C below B.
    expect(pos.get('B')!.y).toBeGreaterThan(pos.get('A')!.y)
    expect(pos.get('C')!.y).toBeGreaterThan(pos.get('B')!.y)
  })

  it('ignores edges referencing missing nodes', async () => {
    const graph: FlowGraph = {
      direction: 'TD',
      nodes: [{ id: 'A', kind: 'process', label: 'A' }],
      edges: [{ source: 'A', target: 'ghost' }]
    }
    const pos = await engine.layout(graph, [{ id: 'A', width: 100, height: 40 }])
    expect(pos.size).toBe(1)
  })
})
