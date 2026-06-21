import { SHAPES, type ShapeKind } from './shapes'

/**
 * Estimates a node's rendered size from its label, so ELK can lay out a
 * text-defined graph before React Flow has measured the DOM.
 */
export function estimateNodeSize(kind: ShapeKind, label: string): { w: number; h: number } {
  const base = SHAPES[kind].defaultSize
  if (kind === 'connector') return { ...base }

  const textWidth = label.length * 7.2 + 28
  if (kind === 'decision') {
    return { w: Math.max(base.w, textWidth + 44), h: base.h }
  }
  return { w: Math.max(base.w, Math.round(textWidth)), h: base.h }
}
