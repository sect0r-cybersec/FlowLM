import { useEffect, useRef } from 'react'

export interface MenuItem {
  label: string
  hint?: string
  disabled?: boolean
  separator?: boolean
  onClick?: () => void
}

interface ContextMenuProps {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    // Defer so the opening right-click doesn't immediately close it.
    const id = setTimeout(() => {
      window.addEventListener('mousedown', onDown)
      window.addEventListener('wheel', onClose, { passive: true })
      window.addEventListener('keydown', onKey)
    }, 0)
    return () => {
      clearTimeout(id)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('wheel', onClose)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  // Clamp to viewport.
  const left = Math.min(x, window.innerWidth - 230)
  const top = Math.min(y, window.innerHeight - items.length * 30 - 16)

  return (
    <div ref={ref} className="ctxmenu" style={{ left, top }} role="menu">
      {items.map((it, i) =>
        it.separator ? (
          <div key={i} className="ctxsep" />
        ) : (
          <button
            key={i}
            className="ctxitem"
            disabled={it.disabled}
            onClick={() => {
              it.onClick?.()
              onClose()
            }}
          >
            <span>{it.label}</span>
            {it.hint && <span className="ctxhint">{it.hint}</span>}
          </button>
        )
      )}
    </div>
  )
}
