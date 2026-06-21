import type { FlowDocument, FlowEdge, FlowGraph, FlowNode } from './model'
import type { ShapeKind } from './shapes'

/**
 * Mermaid keywords that are unsafe as node ids. Case-sensitive: Mermaid keywords
 * are lowercase, so `End`/`Graph` are fine while `end`/`graph` are not.
 */
const RESERVED_IDS = new Set([
  'end',
  'graph',
  'subgraph',
  'flowchart',
  'style',
  'classdef',
  'class',
  'click',
  'linkstyle',
  'direction',
  'default'
])

/**
 * An id is safe to emit verbatim when it's a plain identifier, isn't a reserved
 * keyword, and doesn't start with a lowercase `o`/`x` (which Mermaid can misread
 * as the circle/cross edge caps in some forms). Anything else is replaced with a
 * generated `n#` id.
 */
export function isSafeId(id: string): boolean {
  return (
    /^[A-Za-z_][A-Za-z0-9_]*$/.test(id) &&
    !RESERVED_IDS.has(id) &&
    !/^[ox]/.test(id)
  )
}

/**
 * Maps every node id to a safe, collision-free Mermaid id. Safe ids are kept
 * (readable, stable diffs); unsafe ones become `n1`, `n2`, … deterministically.
 */
function buildIdMap(nodes: FlowNode[]): Map<string, string> {
  const map = new Map<string, string>()
  const used = new Set<string>()

  for (const n of nodes) {
    if (!map.has(n.id) && isSafeId(n.id) && !used.has(n.id)) {
      map.set(n.id, n.id)
      used.add(n.id)
    }
  }

  let counter = 0
  for (const n of nodes) {
    if (map.has(n.id)) continue
    let safe: string
    do {
      safe = `n${++counter}`
    } while (used.has(safe))
    map.set(n.id, safe)
    used.add(safe)
  }

  return map
}

/** Labels need quoting if they contain anything but word chars, or read as `end`. */
function needsQuoting(label: string): boolean {
  const t = label.trim()
  if (t === '') return false
  if (t.toLowerCase() === 'end') return true
  return !/^[A-Za-z0-9_]+$/.test(label)
}

/** Mermaid escapes embedded double quotes as the HTML entity `#quot;`. */
function quoteLabel(label: string): string {
  return `"${label.replace(/"/g, '#quot;')}"`
}

function renderLabel(label: string): string {
  return needsQuoting(label) ? quoteLabel(label) : label
}

/** The full node declaration token (id + shape delimiters + label). */
function shapeToken(safeId: string, kind: ShapeKind, label: string): string {
  const l = renderLabel(label)
  switch (kind) {
    case 'terminal':
      return `${safeId}([${l}])`
    case 'process':
      return `${safeId}[${l}]`
    case 'decision':
      return `${safeId}{${l}}`
    case 'io':
      return `${safeId}[/${l}/]`
    case 'subprocess':
      return `${safeId}[[${l}]]`
    case 'database':
      return `${safeId}[(${l})]`
    case 'document':
      // v11 typed-shape syntax; the label is always quoted inside the map.
      return `${safeId}@{ shape: doc, label: ${quoteLabel(label)} }`
    case 'connector':
      return label.trim() === '' ? `${safeId}(( ))` : `${safeId}((${l}))`
  }
}

/**
 * Serialises a graph to a Mermaid `flowchart` block body. Nodes are declared
 * inline at their first appearance in an edge (compact, token-efficient, and
 * matching how the canonical examples read); isolated nodes are appended.
 */
export function graphToMermaid(graph: FlowGraph): string {
  const idMap = buildIdMap(graph.nodes)
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const declared = new Set<string>()
  const lines: string[] = [`flowchart ${graph.direction}`]

  const ref = (originalId: string): string => {
    const safe = idMap.get(originalId) ?? originalId
    const node = byId.get(originalId)
    if (!node || declared.has(originalId)) return safe
    declared.add(originalId)
    return shapeToken(safe, node.kind, node.label)
  }

  for (const e of graph.edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) continue // skip dangling edges
    const arrow = e.dashed ? '-.->' : '-->'
    const labelPart = e.label && e.label.trim() !== '' ? `|${renderLabel(e.label)}|` : ''
    lines.push(`  ${ref(e.source)} ${arrow}${labelPart} ${ref(e.target)}`)
  }

  for (const n of graph.nodes) {
    if (declared.has(n.id)) continue
    declared.add(n.id)
    lines.push(`  ${shapeToken(idMap.get(n.id)!, n.kind, n.label)}`)
  }

  return lines.join('\n')
}

/**
 * Serialises a whole document to Obsidian-friendly Markdown: a title heading,
 * then one `## <name>` section per block (main first), each a fenced mermaid
 * chart. Subprocess blocks read to an LLM like function definitions.
 */
export function serializeDocument(doc: FlowDocument): string {
  const title = doc.title?.trim() || 'Untitled'
  const parts = [`# ${title}`]
  for (const block of doc.blocks) {
    parts.push('', `## ${block.name}`, '', '```mermaid', graphToMermaid(block.graph), '```')
  }
  return parts.join('\n') + '\n'
}
