import { Flowchart } from 'mermaid-ast'
import { MAIN_BLOCK, type FlowDirection, type FlowDocument, type FlowEdge, type FlowGraph, type FlowNode } from './model'
import type { ShapeKind } from './shapes'

/**
 * Maps mermaid-ast node shapes onto our palette. Shapes outside the palette
 * (hexagon, trapezoid, …) degrade to `process` — the closest neutral shape.
 */
const SHAPE_MAP: Record<string, ShapeKind> = {
  stadium: 'terminal',
  square: 'process',
  rect: 'process',
  round: 'process',
  subroutine: 'subprocess',
  diamond: 'decision',
  lean_right: 'io',
  lean_left: 'io',
  cylinder: 'database',
  circle: 'connector',
  doublecircle: 'connector'
}

/** Pulls `shape:` / `label:` out of the v11 `@{ … }` shapeData blob. */
function parseShapeData(shapeData?: string): { shape?: string; label?: string } {
  if (!shapeData) return {}
  const shape = shapeData.match(/shape\s*:\s*["']?([A-Za-z0-9_-]+)["']?/)?.[1]
  const label =
    shapeData.match(/label\s*:\s*"([^"]*)"/)?.[1] ??
    shapeData.match(/label\s*:\s*([^,}]+)/)?.[1]?.trim()
  return { shape, label }
}

function resolveKind(
  shape: string,
  shapeData: string | undefined
): { kind: ShapeKind; labelOverride?: string } {
  // The v11 typed-shape syntax (`id@{ shape: doc }`) parses as a plain rect plus
  // a raw shapeData string; recover the real shape (e.g. `doc`) from it.
  if (shapeData) {
    const { shape: sd, label } = parseShapeData(shapeData)
    if (sd === 'doc' || sd === 'document') return { kind: 'document', labelOverride: label }
    if (sd && SHAPE_MAP[sd]) return { kind: SHAPE_MAP[sd], labelOverride: label }
  }
  return { kind: SHAPE_MAP[shape] ?? 'process' }
}

/** Parses a single Mermaid `flowchart` body into our graph model. Throws on invalid syntax. */
export function parseMermaid(text: string): FlowGraph {
  const fc = Flowchart.parse(text)

  const nodes: FlowNode[] = fc.nodes.map((n) => {
    const { kind, labelOverride } = resolveKind(n.shape, n.shapeData)
    let label = labelOverride ?? n.text?.text ?? n.id
    if (kind === 'connector' && label.trim() === '') label = ''
    return { id: n.id, kind, label }
  })

  const edges: FlowEdge[] = fc.links.map((l, i) => ({
    id: l.id ?? `e${i}`,
    source: l.source,
    target: l.target,
    label: l.text?.text,
    dashed: l.stroke === 'dotted'
  }))

  return { direction: (fc.direction as FlowDirection) ?? 'TD', nodes, edges }
}

/** The first fenced ```mermaid block in a Markdown string, or null. */
export function firstMermaidBlock(md: string): string | null {
  const m = md.match(/```mermaid[^\n]*\n([\s\S]*?)```/)
  return m ? m[1].replace(/\s+$/, '') : null
}

/** Splits a document into `## <name>` sections, each with its mermaid code (if any). */
function extractSections(md: string): { name: string; code: string | null }[] {
  const sections: { name: string; lines: string[] }[] = []
  let current: { name: string; lines: string[] } | null = null
  for (const line of md.split('\n')) {
    const heading = line.match(/^##\s+(.+?)\s*$/)
    if (heading) {
      current = { name: heading[1], lines: [] }
      sections.push(current)
    } else if (current) {
      current.lines.push(line)
    }
  }
  return sections.map((s) => ({ name: s.name, code: firstMermaidBlock(s.lines.join('\n')) }))
}

/**
 * Parses a whole Markdown document into its named blocks. Documents using
 * `## <name>` sections yield one block each (main first); a bare document with
 * just a fenced mermaid chart is treated as a single `main` block.
 */
export function parseDocument(md: string): FlowDocument {
  const title = md.match(/^#\s+(.+?)\s*$/m)?.[1]?.trim()
  const sections = extractSections(md)

  const blocks = sections
    .filter((s) => s.code && s.code.trim() !== '')
    .map((s) => ({ name: s.name, graph: parseMermaid(s.code as string) }))

  if (blocks.length === 0) {
    // No `## section` structure — fall back to the first fenced block as `main`.
    const code = firstMermaidBlock(md)
    if (code == null || code.trim() === '') {
      throw new Error('No mermaid block found in document')
    }
    return { title, blocks: [{ name: MAIN_BLOCK, graph: parseMermaid(code) }] }
  }

  // Ensure `main` leads, if present.
  blocks.sort((a, b) => (a.name === MAIN_BLOCK ? -1 : b.name === MAIN_BLOCK ? 1 : 0))
  return { title, blocks }
}
