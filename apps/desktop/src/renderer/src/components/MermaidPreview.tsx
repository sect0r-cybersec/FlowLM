import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { firstMermaidBlock } from '@flowlm/core'

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'strict',
  flowchart: { htmlLabels: true, curve: 'basis' }
})

/** Renders the document's first mermaid block to a static SVG (the Preview tab). */
export function MermaidPreview({ doc }: { doc: string }) {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const idRef = useRef('mmd-' + Math.random().toString(36).slice(2))

  useEffect(() => {
    let cancelled = false
    const code = firstMermaidBlock(doc)
    if (!code) {
      setError('No mermaid block to preview.')
      return
    }
    mermaid
      .render(idRef.current, code)
      .then(({ svg }) => {
        if (!cancelled) {
          setSvg(svg)
          setError(null)
        }
      })
      .catch((e: unknown) => {
        // Keep the last good render; just surface the error.
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [doc])

  return (
    <div className="editor-code mermaid-preview">
      {error && <div className="mermaid-preview-error">{error}</div>}
      {svg ? (
        <div className="mermaid-preview-svg" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        !error && <div className="mermaid-preview-empty">Rendering…</div>
      )}
    </div>
  )
}
