/**
 * Canonical shape palette. Pure data — no React, no DOM. This is the seed of the
 * `@flowlm/core` package extracted in M7; the visual rendering lives in
 * `../shapes.tsx`, which re-exports `ShapeKind` from here.
 *
 * Canvas shape ↔ Mermaid syntax:
 *   terminal    A([Start])         pill
 *   process     B[Power on]        rectangle
 *   decision    C{Battery low?}    diamond
 *   io          D[/Power off/]     parallelogram
 *   document    E@{ shape: doc }   document (v11 typed-shape syntax)
 *   subprocess  F[[Plan route]]    double-bar rectangle
 *   database    G[(Logs)]          cylinder
 *   connector   H(( ))             small circle / junction
 */
export type ShapeKind =
  | 'terminal'
  | 'process'
  | 'decision'
  | 'io'
  | 'document'
  | 'subprocess'
  | 'database'
  | 'connector'

export const SHAPE_KINDS: readonly ShapeKind[] = [
  'terminal',
  'process',
  'decision',
  'io',
  'document',
  'subprocess',
  'database',
  'connector'
] as const
