import { describe, it, expect } from 'vitest'
import { graphToMermaid, serializeDocument, isSafeId } from './serialize'
import type { FlowGraph } from './model'

const g = (nodes: FlowGraph['nodes'], edges: FlowGraph['edges'] = []): FlowGraph => ({
  direction: 'TD',
  nodes,
  edges
})

describe('shapeToken (via single-node graphs)', () => {
  const cases: Array<[FlowGraph['nodes'][number]['kind'], string, string]> = [
    ['terminal', 'Start', 'Start([Start])'],
    ['process', 'Proc', 'Proc[Proc]'],
    ['decision', 'Dec', 'Dec{Dec}'],
    ['io', 'IO', 'IO[/IO/]'],
    ['subprocess', 'Sub', 'Sub[[Sub]]'],
    ['database', 'Db', 'Db[(Db)]']
  ]

  it.each(cases)('%s renders as %s', (kind, id, expected) => {
    const out = graphToMermaid(g([{ id, kind, label: id }]))
    expect(out).toContain(expected)
  })

  it('document uses the v11 typed-shape syntax with a quoted label', () => {
    const out = graphToMermaid(g([{ id: 'Doc', kind: 'document', label: 'Route' }]))
    expect(out).toContain('Doc@{ shape: doc, label: "Route" }')
  })

  it('connector with no label renders an empty circle', () => {
    const out = graphToMermaid(g([{ id: 'J1', kind: 'connector', label: '' }]))
    expect(out).toContain('J1(( ))')
  })
})

describe('label quoting', () => {
  it('quotes labels with spaces', () => {
    const out = graphToMermaid(g([{ id: 'P', kind: 'process', label: 'Power on' }]))
    expect(out).toContain('P["Power on"]')
  })

  it('quotes labels with punctuation', () => {
    const out = graphToMermaid(g([{ id: 'D', kind: 'decision', label: 'Battery low?' }]))
    expect(out).toContain('D{"Battery low?"}')
  })

  it('leaves simple alphanumeric labels unquoted', () => {
    const out = graphToMermaid(g([{ id: 'A', kind: 'process', label: 'Scan' }]))
    expect(out).toContain('A[Scan]')
  })

  it('escapes embedded double quotes as #quot;', () => {
    const out = graphToMermaid(g([{ id: 'A', kind: 'process', label: 'say "hi"' }]))
    expect(out).toContain('A["say #quot;hi#quot;"]')
  })

  it('quotes a label that lowercases to "end" (the parser trap)', () => {
    const out = graphToMermaid(g([{ id: 'T', kind: 'terminal', label: 'End' }]))
    expect(out).toContain('T(["End"])')
  })
})

describe('id sanitisation', () => {
  it('accepts safe ids', () => {
    expect(isSafeId('Start')).toBe(true)
    expect(isSafeId('End')).toBe(true) // only lowercase `end` is the keyword
    expect(isSafeId('n1')).toBe(true)
  })

  it('rejects unsafe ids', () => {
    expect(isSafeId('end')).toBe(false)
    expect(isSafeId('graph')).toBe(false)
    expect(isSafeId('output')).toBe(false) // lowercase o prefix
    expect(isSafeId('xray')).toBe(false) // lowercase x prefix
    expect(isSafeId('has space')).toBe(false)
    expect(isSafeId('1node')).toBe(false)
  })

  it('rewrites unsafe ids to n# (in node order) and keeps edges consistent', () => {
    const out = graphToMermaid(
      g(
        [
          { id: 'end', kind: 'terminal', label: 'Finish' },
          { id: 'output', kind: 'process', label: 'Emit' }
        ],
        [{ source: 'output', target: 'end' }]
      )
    )
    // `end` -> n1, `output` -> n2 (assigned in node-array order); no raw `end` id.
    expect(out).not.toContain('end')
    expect(out).toContain('n2[Emit] --> n1([Finish])')
  })

  it('keeps safe ids verbatim', () => {
    const out = graphToMermaid(
      g(
        [
          { id: 'Start', kind: 'terminal', label: 'Start' },
          { id: 'Power', kind: 'process', label: 'Power on' }
        ],
        [{ source: 'Start', target: 'Power' }]
      )
    )
    expect(out).toContain('Start([Start]) --> Power["Power on"]')
  })
})

describe('edges', () => {
  const nodes: FlowGraph['nodes'] = [
    { id: 'A', kind: 'process', label: 'A' },
    { id: 'B', kind: 'process', label: 'B' }
  ]

  it('renders a plain arrow', () => {
    expect(graphToMermaid(g(nodes, [{ source: 'A', target: 'B' }]))).toContain('A[A] --> B[B]')
  })

  it('renders a labelled arrow', () => {
    expect(graphToMermaid(g(nodes, [{ source: 'A', target: 'B', label: 'Yes' }]))).toContain(
      'A[A] -->|Yes| B[B]'
    )
  })

  it('renders a dashed arrow', () => {
    expect(graphToMermaid(g(nodes, [{ source: 'A', target: 'B', dashed: true }]))).toContain(
      'A[A] -.-> B[B]'
    )
  })

  it('quotes labelled-edge text with punctuation', () => {
    expect(graphToMermaid(g(nodes, [{ source: 'A', target: 'B', label: 'no/skip' }]))).toContain(
      'A[A] -->|"no/skip"| B[B]'
    )
  })

  it('declares each node inline only at first appearance, then by id', () => {
    const out = graphToMermaid(
      g(nodes, [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'A' }
      ])
    )
    const lines = out.split('\n')
    expect(lines[1]).toBe('  A[A] --> B[B]')
    expect(lines[2]).toBe('  B --> A') // reused by id, no re-declaration
  })

  it('appends isolated (unconnected) nodes', () => {
    const out = graphToMermaid(
      g([
        { id: 'A', kind: 'process', label: 'A' },
        { id: 'Lonely', kind: 'database', label: 'Cache' }
      ])
    )
    expect(out).toContain('Lonely[(Cache)]')
  })

  it('skips dangling edges whose endpoints are missing', () => {
    const out = graphToMermaid(g([{ id: 'A', kind: 'process', label: 'A' }], [{ source: 'A', target: 'ghost' }]))
    expect(out).not.toContain('ghost')
  })
})

describe('serializeDocument', () => {
  it('wraps the graph in a titled markdown + mermaid fence', () => {
    const out = serializeDocument({
      title: 'My Flow',
      blocks: [
        {
          name: 'main',
          graph: g(
            [
              { id: 'Start', kind: 'terminal', label: 'Start' },
              { id: 'End', kind: 'terminal', label: 'End' }
            ],
            [{ source: 'Start', target: 'End' }]
          )
        }
      ]
    })
    expect(out).toBe(
      [
        '# My Flow',
        '',
        '## main',
        '',
        '```mermaid',
        'flowchart TD',
        '  Start([Start]) --> End(["End"])',
        '```',
        ''
      ].join('\n')
    )
  })

  it('emits one ## section per block, main first', () => {
    const out = serializeDocument({
      title: 'Doc',
      blocks: [
        { name: 'main', graph: g([{ id: 'A', kind: 'subprocess', label: 'Plan route' }]) },
        { name: 'Plan route', graph: g([{ id: 'P', kind: 'process', label: 'Read map' }]) }
      ]
    })
    expect(out).toContain('## main')
    expect(out).toContain('## Plan route')
    expect(out.indexOf('## main')).toBeLessThan(out.indexOf('## Plan route'))
  })

  it('falls back to "Untitled" when no title is given', () => {
    const out = serializeDocument({ blocks: [{ name: 'main', graph: g([{ id: 'A', kind: 'process', label: 'A' }]) }] })
    expect(out.startsWith('# Untitled')).toBe(true)
  })
})
