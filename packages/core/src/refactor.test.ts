import { describe, it, expect } from 'vitest'
import {
  extractToSubprocess,
  inlineSubprocess,
  collapseChain,
  mergeDuplicates,
  uniqueBlockName
} from './refactor'
import { getBlock, type FlowDocument, type FlowGraph } from './model'

const doc = (main: FlowGraph, extra: { name: string; graph: FlowGraph }[] = []): FlowDocument => ({
  title: 'T',
  blocks: [{ name: 'main', graph: main }, ...extra]
})

describe('extractToSubprocess', () => {
  // A([Start]) -> B[Mid1] -> C[Mid2] -> D([End]); extract {B,C}.
  const main: FlowGraph = {
    direction: 'TD',
    nodes: [
      { id: 'A', kind: 'terminal', label: 'Start' },
      { id: 'B', kind: 'process', label: 'Mid1' },
      { id: 'C', kind: 'process', label: 'Mid2' },
      { id: 'D', kind: 'terminal', label: 'End' }
    ],
    edges: [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C' },
      { source: 'C', target: 'D' }
    ]
  }

  it('replaces the selection with one subprocess node and creates a block', () => {
    const out = extractToSubprocess(doc(main), 'main', ['B', 'C'], 'Sub')
    const parent = getBlock(out, 'main')!.graph
    const child = getBlock(out, 'Sub')!.graph

    // Parent keeps A, D and gains a single subprocess node.
    expect(parent.nodes.map((n) => n.id).sort()).toEqual(['A', 'D', 'sub'])
    const sub = parent.nodes.find((n) => n.id === 'sub')!
    expect(sub.kind).toBe('subprocess')
    expect(sub.label).toBe('Sub')

    // Boundary edges rewired: A -> sub -> D.
    expect(parent.edges).toContainEqual(expect.objectContaining({ source: 'A', target: 'sub' }))
    expect(parent.edges).toContainEqual(expect.objectContaining({ source: 'sub', target: 'D' }))

    // The child block holds the moved nodes + their internal edge.
    expect(child.nodes.map((n) => n.id).sort()).toEqual(['B', 'C'])
    expect(child.edges).toContainEqual(expect.objectContaining({ source: 'B', target: 'C' }))
  })

  it('is reversible: extract then inline returns an equivalent graph', () => {
    const extracted = extractToSubprocess(doc(main), 'main', ['B', 'C'], 'Sub')
    const inlined = inlineSubprocess(extracted, 'main', 'sub')
    const parent = getBlock(inlined, 'main')!.graph

    expect(getBlock(inlined, 'Sub')).toBeUndefined() // block removed
    expect(parent.nodes.map((n) => n.id).sort()).toEqual(['A', 'B', 'C', 'D'])
    const pairs = parent.edges.map((e) => `${e.source}->${e.target}`).sort()
    expect(pairs).toEqual(['A->B', 'B->C', 'C->D'])
  })
})

describe('inlineSubprocess', () => {
  it('keeps a block referenced by another node', () => {
    const main: FlowGraph = {
      direction: 'TD',
      nodes: [
        { id: 'X', kind: 'subprocess', label: 'Shared' },
        { id: 'Y', kind: 'subprocess', label: 'Shared' }
      ],
      edges: [{ source: 'X', target: 'Y' }]
    }
    const shared: FlowGraph = {
      direction: 'TD',
      nodes: [{ id: 'P', kind: 'process', label: 'Work' }],
      edges: []
    }
    const out = inlineSubprocess(doc(main, [{ name: 'Shared', graph: shared }]), 'main', 'X')
    // Y still references Shared, so the block must survive.
    expect(getBlock(out, 'Shared')).toBeDefined()
  })
})

describe('collapseChain', () => {
  it('collapses a path into one node joining the labels', () => {
    const graph: FlowGraph = {
      direction: 'TD',
      nodes: [
        { id: 'A', kind: 'terminal', label: 'Start' },
        { id: 'B', kind: 'process', label: 'Step 1' },
        { id: 'C', kind: 'process', label: 'Step 2' },
        { id: 'D', kind: 'terminal', label: 'End' }
      ],
      edges: [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'C' },
        { source: 'C', target: 'D' }
      ]
    }
    const out = collapseChain(graph, ['B', 'C'])
    expect(out.nodes).toHaveLength(3)
    const merged = out.nodes.find((n) => n.label.includes('→'))!
    expect(merged.label).toBe('Step 1 → Step 2')
    const pairs = out.edges.map((e) => `${e.source}->${e.target}`).sort()
    expect(pairs).toEqual([`A->${merged.id}`, `${merged.id}->D`].sort())
  })
})

describe('mergeDuplicates', () => {
  it('merges same (kind,label) nodes and redirects edges', () => {
    const graph: FlowGraph = {
      direction: 'TD',
      nodes: [
        { id: 'A', kind: 'process', label: 'Log' },
        { id: 'B', kind: 'process', label: 'Save' },
        { id: 'C', kind: 'process', label: 'Log' }
      ],
      edges: [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'C' }
      ]
    }
    const out = mergeDuplicates(graph)
    expect(out.nodes.map((n) => n.label).sort()).toEqual(['Log', 'Save'])
    // B -> C became B -> A (the canonical "Log").
    const pairs = out.edges.map((e) => `${e.source}->${e.target}`).sort()
    expect(pairs).toEqual(['A->B', 'B->A'])
  })

  it('leaves a graph with no duplicates unchanged', () => {
    const graph: FlowGraph = {
      direction: 'TD',
      nodes: [
        { id: 'A', kind: 'process', label: 'One' },
        { id: 'B', kind: 'process', label: 'Two' }
      ],
      edges: [{ source: 'A', target: 'B' }]
    }
    expect(mergeDuplicates(graph)).toEqual(graph)
  })
})

describe('uniqueBlockName', () => {
  it('avoids collisions with existing block names', () => {
    const d = doc({ direction: 'TD', nodes: [], edges: [] }, [
      { name: 'Subprocess', graph: { direction: 'TD', nodes: [], edges: [] } }
    ])
    expect(uniqueBlockName(d)).toBe('Subprocess 2')
  })
})
