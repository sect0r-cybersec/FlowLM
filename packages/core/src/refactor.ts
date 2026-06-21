import {
  getBlock,
  withBlock,
  type FlowDocument,
  type FlowEdge,
  type FlowGraph,
  type FlowNode
} from './model'

/** Removes edges that are identical in source/target/label/stroke. */
function dedupeEdges(edges: FlowEdge[]): FlowEdge[] {
  const seen = new Set<string>()
  const out: FlowEdge[] = []
  for (const e of edges) {
    const key = `${e.source}|${e.target}|${e.label ?? ''}|${e.dashed ? 1 : 0}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(e)
  }
  return out
}

function uniqueId(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base
  let i = 2
  while (existing.has(`${base}${i}`)) i++
  return `${base}${i}`
}

/** A subprocess/block name not already used by another block. */
export function uniqueBlockName(doc: FlowDocument, base = 'Subprocess'): string {
  const names = new Set(doc.blocks.map((b) => b.name))
  if (!names.has(base)) return base
  let i = 2
  while (names.has(`${base} ${i}`)) i++
  return `${base} ${i}`
}

/** True if any node anywhere in the document is a `[[name]]` subprocess reference. */
function isReferenced(doc: FlowDocument, name: string): boolean {
  return doc.blocks.some((b) =>
    b.graph.nodes.some((n) => n.kind === 'subprocess' && n.label === name)
  )
}

/**
 * Extracts the selected nodes from `blockName` into a new subprocess block,
 * leaving a single `[[subName]]` node in their place. Edges crossing the
 * selection boundary are rewired to/from that node; internal edges move into the
 * new block. (The highest-value refactor.)
 */
export function extractToSubprocess(
  doc: FlowDocument,
  blockName: string,
  nodeIds: string[],
  subName: string
): FlowDocument {
  const parent = getBlock(doc, blockName)?.graph
  if (!parent) return doc
  const selected = new Set(nodeIds.filter((id) => parent.nodes.some((n) => n.id === id)))
  if (selected.size === 0) return doc

  const movedNodes = parent.nodes.filter((n) => selected.has(n.id))
  const remainingNodes = parent.nodes.filter((n) => !selected.has(n.id))
  const subId = uniqueId('sub', new Set(parent.nodes.map((n) => n.id)))

  const childEdges: FlowEdge[] = []
  const parentEdges: FlowEdge[] = []
  for (const e of parent.edges) {
    const sIn = selected.has(e.source)
    const tIn = selected.has(e.target)
    if (sIn && tIn) childEdges.push(e)
    else if (!sIn && !tIn) parentEdges.push(e)
    else if (!sIn && tIn) parentEdges.push({ ...e, target: subId })
    else parentEdges.push({ ...e, source: subId })
  }

  const subNode: FlowNode = { id: subId, kind: 'subprocess', label: subName }
  const newParent: FlowGraph = {
    direction: parent.direction,
    nodes: [...remainingNodes, subNode],
    edges: dedupeEdges(parentEdges)
  }
  const childGraph: FlowGraph = {
    direction: parent.direction,
    nodes: movedNodes,
    edges: childEdges
  }

  return withBlock(withBlock(doc, blockName, newParent), subName, childGraph)
}

/**
 * Inlines a `[[subprocess]]` node back into its parent block: the block's nodes
 * are spliced in (with id collisions suffixed), edges to/from the node are
 * rewired to the block's entry/exit nodes, and the block is removed if no longer
 * referenced.
 */
export function inlineSubprocess(
  doc: FlowDocument,
  blockName: string,
  subNodeId: string
): FlowDocument {
  const parent = getBlock(doc, blockName)?.graph
  if (!parent) return doc
  const subNode = parent.nodes.find((n) => n.id === subNodeId)
  if (!subNode || subNode.kind !== 'subprocess') return doc
  const child = getBlock(doc, subNode.label)?.graph
  if (!child) return doc

  // Re-id child nodes that would collide with retained parent ids.
  const parentIds = new Set(parent.nodes.filter((n) => n.id !== subNodeId).map((n) => n.id))
  const idMap = new Map<string, string>()
  for (const n of child.nodes) {
    let id = n.id
    while (parentIds.has(id)) id = `${id}_`
    idMap.set(n.id, id)
    parentIds.add(id)
  }
  const remap = (id: string) => idMap.get(id) ?? id
  const inlinedNodes = child.nodes.map((n) => ({ ...n, id: remap(n.id) }))
  const inlinedEdges = child.edges.map((e) => ({ ...e, source: remap(e.source), target: remap(e.target) }))

  const childTargets = new Set(child.edges.map((e) => e.target))
  const childSources = new Set(child.edges.map((e) => e.source))
  const entries = child.nodes.filter((n) => !childTargets.has(n.id)).map((n) => remap(n.id))
  const exits = child.nodes.filter((n) => !childSources.has(n.id)).map((n) => remap(n.id))

  const rewired: FlowEdge[] = []
  for (const e of parent.edges) {
    if (e.target === subNodeId) entries.forEach((en) => rewired.push({ ...e, target: en }))
    else if (e.source === subNodeId) exits.forEach((ex) => rewired.push({ ...e, source: ex }))
    else rewired.push(e)
  }

  const newParent: FlowGraph = {
    direction: parent.direction,
    nodes: [...parent.nodes.filter((n) => n.id !== subNodeId), ...inlinedNodes],
    edges: dedupeEdges([...rewired, ...inlinedEdges])
  }

  let next = withBlock(doc, blockName, newParent)
  // Drop the now-unused block (unless another node still references it).
  if (!isReferenced(next, subNode.label)) {
    next = { ...next, blocks: next.blocks.filter((b) => b.name !== subNode.label) }
  }
  return next
}

/** Orders a set of nodes along their internal edges into a chain. */
function orderChain(nodeIds: string[], edges: FlowEdge[]): string[] {
  const sel = new Set(nodeIds)
  const internal = edges.filter((e) => sel.has(e.source) && sel.has(e.target))
  const indeg = new Map<string, number>(nodeIds.map((id) => [id, 0]))
  const next = new Map<string, string>()
  for (const e of internal) {
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1)
    next.set(e.source, e.target)
  }
  const start = nodeIds.find((id) => (indeg.get(id) ?? 0) === 0) ?? nodeIds[0]
  const order: string[] = []
  const seen = new Set<string>()
  let cur: string | undefined = start
  while (cur && !seen.has(cur)) {
    order.push(cur)
    seen.add(cur)
    cur = next.get(cur)
  }
  for (const id of nodeIds) if (!seen.has(id)) order.push(id)
  return order
}

/**
 * Collapses a selected linear chain into a single process node whose label joins
 * the chain's labels with " → ". Boundary edges reconnect to the new node.
 */
export function collapseChain(graph: FlowGraph, nodeIds: string[]): FlowGraph {
  const sel = new Set(nodeIds)
  if (sel.size < 2) return graph

  const order = orderChain([...sel], graph.edges)
  const newId = order[0]
  const label = order.map((id) => graph.nodes.find((n) => n.id === id)?.label ?? id).join(' → ')
  const newNode: FlowNode = { id: newId, kind: 'process', label }

  const edges: FlowEdge[] = []
  for (const e of graph.edges) {
    const sIn = sel.has(e.source)
    const tIn = sel.has(e.target)
    if (sIn && tIn) continue
    if (!sIn && tIn) edges.push({ ...e, target: newId })
    else if (sIn && !tIn) edges.push({ ...e, source: newId })
    else edges.push(e)
  }

  return {
    direction: graph.direction,
    nodes: [...graph.nodes.filter((n) => !sel.has(n.id)), newNode],
    edges: dedupeEdges(edges)
  }
}

/** Merges nodes sharing a (kind, label) into one, redirecting their edges. */
export function mergeDuplicates(graph: FlowGraph): FlowGraph {
  const canonical = new Map<string, string>()
  const idMap = new Map<string, string>()
  for (const n of graph.nodes) {
    if (!n.label.trim()) continue
    const key = `${n.kind}::${n.label}`
    const existing = canonical.get(key)
    if (existing) idMap.set(n.id, existing)
    else canonical.set(key, n.id)
  }
  if (idMap.size === 0) return graph

  const remap = (id: string) => idMap.get(id) ?? id
  const nodes = graph.nodes.filter((n) => !idMap.has(n.id))
  const edges = dedupeEdges(
    graph.edges
      .map((e) => ({ ...e, source: remap(e.source), target: remap(e.target) }))
      .filter((e) => e.source !== e.target)
  )
  return { direction: graph.direction, nodes, edges }
}
