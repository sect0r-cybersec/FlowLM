/**
 * Visual side of the shape palette: SVG rendering + dock metadata. The canonical
 * `ShapeKind` and Mermaid mapping live in `./core/shapes` (React-free).
 */
import type { ShapeKind } from '@flowlm/core'
export type { ShapeKind }

export interface ShapeMeta {
  kind: ShapeKind
  label: string
  fill: string // CSS var for the pastel fill
  defaultSize: { w: number; h: number }
}

// Concrete hex (single dark theme): keeps SVG fills resolvable by html-to-image
// at export time, where CSS var() in presentation attributes is dropped.
export const SHAPES: Record<ShapeKind, ShapeMeta> = {
  terminal: { kind: 'terminal', label: 'Terminal', fill: '#f3c6d2', defaultSize: { w: 96, h: 36 } },
  process: { kind: 'process', label: 'Process', fill: '#f2e3b0', defaultSize: { w: 120, h: 38 } },
  decision: { kind: 'decision', label: 'Decision', fill: '#f1dca0', defaultSize: { w: 150, h: 84 } },
  io: { kind: 'io', label: 'I/O', fill: '#bcd6f4', defaultSize: { w: 130, h: 38 } },
  document: { kind: 'document', label: 'Document', fill: '#cfe4cf', defaultSize: { w: 110, h: 44 } },
  subprocess: { kind: 'subprocess', label: 'Subprocess', fill: '#f2e3b0', defaultSize: { w: 136, h: 42 } },
  database: { kind: 'database', label: 'Database', fill: '#d6cdf0', defaultSize: { w: 92, h: 52 } },
  connector: { kind: 'connector', label: 'Connector', fill: '#bcd6f4', defaultSize: { w: 30, h: 30 } }
}

export const DOCK_ORDER: ShapeKind[] = [
  'terminal',
  'process',
  'decision',
  'io',
  'document',
  'subprocess',
  'database',
  'connector'
]

/** Renders the shape outline as scalable SVG content sized to w x h. */
export function ShapeSvg({ kind, w, h }: { kind: ShapeKind; w: number; h: number }) {
  const fill = SHAPES[kind].fill
  const stroke = '#8c8378'
  const sw = 1.6
  const common = {
    fill,
    stroke,
    strokeWidth: sw,
    vectorEffect: 'non-scaling-stroke' as const
  }

  let shape: JSX.Element
  switch (kind) {
    case 'terminal':
      shape = <rect x={1} y={1} width={w - 2} height={h - 2} rx={(h - 2) / 2} {...common} />
      break
    case 'process':
      shape = <rect x={1} y={1} width={w - 2} height={h - 2} rx={3} {...common} />
      break
    case 'decision':
      shape = <polygon points={`${w / 2},1 ${w - 1},${h / 2} ${w / 2},${h - 1} 1,${h / 2}`} {...common} />
      break
    case 'io': {
      const skew = Math.min(h * 0.55, w * 0.22)
      shape = <polygon points={`${skew},1 ${w - 1},1 ${w - skew},${h - 1} 1,${h - 1}`} {...common} />
      break
    }
    case 'document': {
      const wave = h * 0.18
      const body = h - 1 - wave
      shape = (
        <path
          d={`M1 1 H${w - 1} V${body} C${w * 0.72} ${body + wave * 1.6} ${w * 0.72} ${body - wave} ${w / 2} ${body} S${w * 0.28} ${body + wave * 1.6} 1 ${body} Z`}
          {...common}
        />
      )
      break
    }
    case 'subprocess': {
      const bar = 7
      shape = (
        <>
          <rect x={1} y={1} width={w - 2} height={h - 2} rx={3} {...common} />
          <line x1={bar} y1={1} x2={bar} y2={h - 1} stroke={stroke} strokeWidth={sw} vectorEffect="non-scaling-stroke" />
          <line x1={w - bar} y1={1} x2={w - bar} y2={h - 1} stroke={stroke} strokeWidth={sw} vectorEffect="non-scaling-stroke" />
        </>
      )
      break
    }
    case 'database': {
      const ry = h * 0.16
      shape = (
        <>
          <path
            d={`M1 ${ry} a${(w - 2) / 2} ${ry} 0 0 1 ${w - 2} 0 v${h - 2 * ry} a${(w - 2) / 2} ${ry} 0 0 1 ${-(w - 2)} 0 Z`}
            {...common}
          />
          <path
            d={`M1 ${ry} a${(w - 2) / 2} ${ry} 0 0 0 ${w - 2} 0`}
            fill="none"
            stroke={stroke}
            strokeWidth={sw}
            vectorEffect="non-scaling-stroke"
          />
        </>
      )
      break
    }
    case 'connector': {
      const r = Math.min(w, h) / 2 - 1
      shape = <circle cx={w / 2} cy={h / 2} r={r} {...common} />
      break
    }
  }

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, overflow: 'visible', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.32))' }}
    >
      {shape}
    </svg>
  )
}

/** Small fixed-size dock icons (viewBox 0 0 28 18), ported from the mockup. */
export function DockIcon({ kind }: { kind: ShapeKind }) {
  const stroke = 'var(--n-stroke)'
  switch (kind) {
    case 'terminal':
      return (
        <svg viewBox="0 0 28 18">
          <rect x="2" y="3" width="24" height="12" rx="6" fill="var(--n-terminal)" stroke={stroke} strokeWidth="1.1" />
        </svg>
      )
    case 'process':
      return (
        <svg viewBox="0 0 28 18">
          <rect x="3" y="3.5" width="22" height="11" rx="1.5" fill="var(--n-process)" stroke={stroke} strokeWidth="1.1" />
        </svg>
      )
    case 'decision':
      return (
        <svg viewBox="0 0 28 18">
          <path d="M14 2.2 25.5 9 14 15.8 2.5 9z" fill="var(--n-decision)" stroke={stroke} strokeWidth="1.1" strokeLinejoin="round" />
        </svg>
      )
    case 'io':
      return (
        <svg viewBox="0 0 28 18">
          <path d="M7 4h19l-5 10H2z" fill="var(--n-io)" stroke={stroke} strokeWidth="1.1" strokeLinejoin="round" />
        </svg>
      )
    case 'document':
      return (
        <svg viewBox="0 0 28 18">
          <path d="M4 3h20v9.5c-3.3 0-3.3 2.2-6.6 2.2S14 12.5 10.6 12.5 7.3 14.7 4 14.7V3z" fill="var(--n-doc)" stroke={stroke} strokeWidth="1.1" strokeLinejoin="round" />
        </svg>
      )
    case 'subprocess':
      return (
        <svg viewBox="0 0 28 18">
          <rect x="3" y="3.5" width="22" height="11" rx="1.5" fill="var(--n-process)" stroke={stroke} strokeWidth="1.1" />
          <path d="M6 3.5v11M22 3.5v11" stroke={stroke} strokeWidth="1.1" />
        </svg>
      )
    case 'database':
      return (
        <svg viewBox="0 0 28 18">
          <path d="M6 4.5c0-1.4 3.6-2.5 8-2.5s8 1.1 8 2.5v9c0 1.4-3.6 2.5-8 2.5s-8-1.1-8-2.5v-9z" fill="var(--n-db)" stroke={stroke} strokeWidth="1.1" />
          <path d="M6 4.5c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5" fill="none" stroke={stroke} strokeWidth="1.1" />
        </svg>
      )
    case 'connector':
      return (
        <svg viewBox="0 0 28 18">
          <circle cx="14" cy="9" r="5.2" fill="var(--n-io)" stroke={stroke} strokeWidth="1.1" />
        </svg>
      )
  }
}
