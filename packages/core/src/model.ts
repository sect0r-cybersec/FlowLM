import type { ShapeKind } from './shapes'

/** A node in the diagram graph (independent of any canvas library). */
export interface FlowNode {
  id: string
  kind: ShapeKind
  label: string
}

/** A directed edge, optionally labelled and/or dashed. */
export interface FlowEdge {
  id?: string
  source: string
  target: string
  label?: string
  dashed?: boolean
}

export type FlowDirection = 'TD' | 'TB' | 'LR' | 'RL' | 'BT'

export interface FlowGraph {
  direction: FlowDirection
  nodes: FlowNode[]
  edges: FlowEdge[]
}

/** A named graph block: `main`, or a subprocess whose name matches a `[[label]]`. */
export interface FlowBlock {
  name: string
  graph: FlowGraph
}

/**
 * A whole document: the top-level `main` chart plus one named block per
 * subprocess, each serialised under a `## <name>` heading. `blocks[0]` is `main`.
 */
export interface FlowDocument {
  title?: string
  blocks: FlowBlock[]
}

export const MAIN_BLOCK = 'main'

export function getBlock(doc: FlowDocument, name: string): FlowBlock | undefined {
  return doc.blocks.find((b) => b.name === name)
}

/** Immutably replaces (or appends) a block's graph by name. */
export function withBlock(doc: FlowDocument, name: string, graph: FlowGraph): FlowDocument {
  const exists = doc.blocks.some((b) => b.name === name)
  const blocks = exists
    ? doc.blocks.map((b) => (b.name === name ? { name, graph } : b))
    : [...doc.blocks, { name, graph }]
  return { ...doc, blocks }
}

/** An empty graph (used when drilling into a not-yet-defined subprocess). */
export function emptyGraph(): FlowGraph {
  return { direction: 'TD', nodes: [], edges: [] }
}
