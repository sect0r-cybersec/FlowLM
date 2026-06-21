import { getNodesBounds, getViewportForBounds, type Node } from '@xyflow/react'
import { toJpeg, toPng, toSvg } from 'html-to-image'
import { files } from './fileApi'
import type { ShapeNodeData } from './components/ShapeNode'

export type ImageFormat = 'png' | 'jpeg' | 'svg'

/**
 * Renders the current canvas (the whole graph, fitted) to an image and saves it
 * via a native dialog. Returns the saved path, or null (cancelled / browser).
 */
export async function exportCanvasImage(
  format: ImageFormat,
  nodes: Node<ShapeNodeData>[],
  suggestedName: string
): Promise<{ path: string } | null> {
  const viewport = document.querySelector<HTMLElement>('.react-flow__viewport')
  if (!viewport || nodes.length === 0) return null

  const bounds = getNodesBounds(nodes)
  const pad = 48
  const width = Math.ceil(bounds.width + pad * 2)
  const height = Math.ceil(bounds.height + pad * 2)
  const t = getViewportForBounds(bounds, width, height, 0.5, 2, 0.1)
  const options = {
    backgroundColor: '#1e1e1f',
    width,
    height,
    pixelRatio: 2,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${t.x}px, ${t.y}px) scale(${t.zoom})`
    }
  }

  let dataUrl: string
  if (format === 'png') dataUrl = await toPng(viewport, options)
  else if (format === 'jpeg') dataUrl = await toJpeg(viewport, { ...options, quality: 0.95 })
  else dataUrl = await toSvg(viewport, options)

  let data = dataUrl
  if (format === 'svg') {
    // toSvg yields a `data:image/svg+xml;charset=utf-8,<url-encoded>` URL.
    data = decodeURIComponent(dataUrl.slice(dataUrl.indexOf(',') + 1))
  }

  if (!files) return null // browser preview — nothing to save to
  return files.exportImage({ data, format, suggestedName })
}
