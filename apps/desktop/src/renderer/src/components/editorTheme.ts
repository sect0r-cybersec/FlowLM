import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

/** Transparent base theme; most surface colours come from app.css overrides. */
const baseTheme = EditorView.theme(
  {
    '&': { color: 'var(--text)', backgroundColor: 'transparent' },
    '.cm-gutters': { backgroundColor: 'transparent', border: 'none' },
    '.cm-line': { padding: '0 16px 0 8px' }
  },
  { dark: true }
)

/** Approximates the mockup's Mermaid/Markdown syntax palette. */
const highlight = HighlightStyle.define([
  { tag: t.heading, color: 'var(--syn-heading)', fontWeight: '600' },
  { tag: t.processingInstruction, color: 'var(--syn-fence)' }, // ``` fences
  { tag: t.keyword, color: 'var(--syn-keyword)' },
  { tag: t.monospace, color: 'var(--syn-id)' },
  { tag: t.string, color: 'var(--syn-label)' },
  { tag: t.comment, color: 'var(--text-faint)', fontStyle: 'italic' },
  { tag: t.punctuation, color: 'var(--syn-punct)' },
  { tag: t.meta, color: 'var(--syn-fence)' }
])

export const flowlmEditorTheme = [baseTheme, syntaxHighlighting(highlight)]
