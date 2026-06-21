import { describe, it, expect } from 'vitest'
import { parseMermaid, parseDocument, firstMermaidBlock } from './parse'
import { graphToMermaid, serializeDocument } from './serialize'
import type { FlowGraph } from './model'

describe('parseMermaid shapes', () => {
  const chart = `flowchart TD
  A([Start]) --> B[Process]
  B --> C{Decide}
  C -->|Yes| D[/InOut/]
  C -->|No| E[[Sub]]
  E --> F[(Db)]
  G(( )) --> B
  H@{ shape: doc, label: "Doc text" } --> B
  F -.-> A`

  const graph = parseMermaid(chart)
  const byId = Object.fromEntries(graph.nodes.map((n) => [n.id, n]))

  it('maps every shape onto the palette', () => {
    expect(byId.A.kind).toBe('terminal')
    expect(byId.B.kind).toBe('process')
    expect(byId.C.kind).toBe('decision')
    expect(byId.D.kind).toBe('io')
    expect(byId.E.kind).toBe('subprocess')
    expect(byId.F.kind).toBe('database')
    expect(byId.G.kind).toBe('connector')
    expect(byId.H.kind).toBe('document')
  })

  it('recovers the document label from @{ } shapeData', () => {
    expect(byId.H.label).toBe('Doc text')
  })

  it('parses edge labels and dashed strokes', () => {
    const yes = graph.edges.find((e) => e.source === 'C' && e.target === 'D')
    expect(yes?.label).toBe('Yes')
    const dashed = graph.edges.find((e) => e.source === 'F' && e.target === 'A')
    expect(dashed?.dashed).toBe(true)
    const solid = graph.edges.find((e) => e.source === 'A' && e.target === 'B')
    expect(solid?.dashed).toBe(false)
  })
})

describe('serialize ↔ parse round-trip', () => {
  // Uses safe ids so they survive verbatim; exercises every shape + edge kind.
  const graph: FlowGraph = {
    direction: 'TD',
    nodes: [
      { id: 'Start', kind: 'terminal', label: 'Start' },
      { id: 'Power', kind: 'process', label: 'Power on' },
      { id: 'Done', kind: 'decision', label: 'Finished route?' },
      { id: 'Off', kind: 'io', label: 'Vacuum off' },
      { id: 'Plan', kind: 'subprocess', label: 'Plan route' },
      { id: 'Logs', kind: 'database', label: 'Logs' },
      { id: 'Doc', kind: 'document', label: 'Route map' },
      { id: 'J1', kind: 'connector', label: '' }
    ],
    edges: [
      { source: 'Start', target: 'Power' },
      { source: 'Power', target: 'Done' },
      { source: 'Done', target: 'Off', label: 'Yes' },
      { source: 'Done', target: 'Plan', label: 'No' },
      { source: 'Logs', target: 'Power', dashed: true },
      { source: 'J1', target: 'Power' },
      { source: 'Doc', target: 'Power' }
    ]
  }

  it('parses back to the same kinds and labels', () => {
    const reparsed = parseMermaid(graphToMermaid(graph))
    const byId = Object.fromEntries(reparsed.nodes.map((n) => [n.id, n]))
    for (const n of graph.nodes) {
      expect(byId[n.id].kind, `kind of ${n.id}`).toBe(n.kind)
      expect(byId[n.id].label, `label of ${n.id}`).toBe(n.label)
    }
  })

  it('is text-stable (serialize → parse → serialize is a fixed point)', () => {
    const t1 = graphToMermaid(graph)
    const t2 = graphToMermaid(parseMermaid(t1))
    expect(t2).toBe(t1)
  })

  it('produces Mermaid that mermaid-ast accepts (the M2 acceptance check)', () => {
    expect(() => parseMermaid(graphToMermaid(graph))).not.toThrow()
  })
})

describe('parseDocument', () => {
  it('extracts the title and the main graph', () => {
    const md = serializeDocument({
      title: 'My Flow',
      blocks: [
        {
          name: 'main',
          graph: {
            direction: 'TD',
            nodes: [
              { id: 'A', kind: 'terminal', label: 'A' },
              { id: 'B', kind: 'process', label: 'B' }
            ],
            edges: [{ source: 'A', target: 'B' }]
          }
        }
      ]
    })
    const doc = parseDocument(md)
    expect(doc.title).toBe('My Flow')
    expect(doc.blocks).toHaveLength(1)
    expect(doc.blocks[0].name).toBe('main')
    expect(doc.blocks[0].graph.nodes).toHaveLength(2)
    expect(doc.blocks[0].graph.edges).toHaveLength(1)
  })

  it('round-trips a multi-block (subprocess) document', () => {
    const md = serializeDocument({
      title: 'Robot',
      blocks: [
        {
          name: 'main',
          graph: {
            direction: 'TD',
            nodes: [
              { id: 'A', kind: 'terminal', label: 'Start' },
              { id: 'Plan', kind: 'subprocess', label: 'Plan route' }
            ],
            edges: [{ source: 'A', target: 'Plan' }]
          }
        },
        {
          name: 'Plan route',
          graph: {
            direction: 'TD',
            nodes: [
              { id: 'P1', kind: 'process', label: 'Read map' },
              { id: 'P2', kind: 'decision', label: 'Obstacle?' }
            ],
            edges: [{ source: 'P1', target: 'P2' }]
          }
        }
      ]
    })
    const doc = parseDocument(md)
    expect(doc.blocks.map((b) => b.name)).toEqual(['main', 'Plan route'])
    expect(doc.blocks[1].graph.nodes.find((n) => n.id === 'P2')?.kind).toBe('decision')
    // Stable: re-serialising the parsed doc reproduces the text.
    expect(serializeDocument(doc)).toBe(md)
  })

  it('throws when there is no mermaid block', () => {
    expect(() => parseDocument('# Just a title\n\nNo diagram here.')).toThrow()
  })

  it('firstMermaidBlock returns the fenced body', () => {
    expect(firstMermaidBlock('# T\n\n```mermaid\nflowchart TD\n  A --> B\n```\n')).toBe(
      'flowchart TD\n  A --> B'
    )
  })
})
