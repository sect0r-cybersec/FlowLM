import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = (props: IconProps) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  ...props
})

export const BrandMark = (props: IconProps) => (
  <svg className="mark" viewBox="0 0 24 24" fill="none" {...props}>
    <rect x="2.5" y="3.5" width="7.5" height="5" rx="1.6" stroke="var(--accent-strong)" strokeWidth="1.8" />
    <rect x="14" y="15.5" width="7.5" height="5" rx="1.6" stroke="var(--accent-strong)" strokeWidth="1.8" />
    <path d="M6.25 8.5v4.5a3 3 0 0 0 3 3h4.75" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)

export const Minimize = (props: IconProps) => (
  <svg viewBox="0 0 12 12" fill="none" {...props}>
    <path d="M2.5 6h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
)

export const Maximize = (props: IconProps) => (
  <svg viewBox="0 0 12 12" fill="none" {...props}>
    <rect x="2.8" y="2.8" width="6.4" height="6.4" rx="1" stroke="currentColor" strokeWidth="1.3" />
  </svg>
)

export const Close = (props: IconProps) => (
  <svg viewBox="0 0 12 12" fill="none" {...props}>
    <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
)

export const Plus = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
)

export const Folder = (props: IconProps) => (
  <svg {...base(props)}>
    <path
      d="M3 7.5a2 2 0 0 1 2-2h3.6l1.8 2H19a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
)

export const Save = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M5 4h11l3 3v13H5V4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M8 4v5h7M9 14h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

export const Image = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="8.5" cy="10" r="1.6" stroke="currentColor" strokeWidth="1.4" />
    <path d="M5 17.5l4.5-4.5 3 3 3-3.5L19 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const Sparkle = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5 10.1 7.6 12 3z" fill="currentColor" />
    <path d="M19 14l.9 2.2L22 17l-2.1.8L19 20l-.9-2.2L16 17l2.1-.8L19 14z" fill="currentColor" opacity="0.85" />
  </svg>
)

export const Gear = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M12 2.6v2.4M12 19v2.4M21.4 12H19M5 12H2.6M18.6 5.4l-1.7 1.7M7.1 16.9l-1.7 1.7M18.6 18.6l-1.7-1.7M7.1 7.1 5.4 5.4"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
)

export const VaultDiamond = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 2.5 3.5 7v10L12 21.5 20.5 17V7L12 2.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M12 11.5 3.5 7M12 11.5V21.5M12 11.5 20.5 7" stroke="currentColor" strokeWidth="1.3" />
  </svg>
)

export const Chevron = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export const FolderTree = (props: IconProps) => (
  <svg {...base(props)}>
    <path
      d="M3 7a2 2 0 0 1 2-2h3.5l1.8 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
)

export const FileDoc = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M6 3h8l4 4v14H6V3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

export const Nodes = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="6" cy="6" r="3" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="18" cy="18" r="3" stroke="currentColor" strokeWidth="1.6" />
    <path d="M9 6h6a3 3 0 0 1 3 3v6" stroke="currentColor" strokeWidth="1.6" />
  </svg>
)

export const Edges = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 12h16M14 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const ZoomIn = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)

export const ZoomOut = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M6 12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)

export const FitView = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
