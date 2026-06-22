import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  ConnectionMode,
  MiniMap,
  useReactFlow,
  useViewport,
  type Edge,
  type EdgeTypes,
  type Node,
  type NodeMouseHandler,
  type NodeTypes,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { ShapeNode, NodeEditContext, type ShapeNodeData } from './ShapeNode'
import { DeletableEdge, EdgeToolsContext } from './DeletableEdge'
import { Chevron, ZoomIn, ZoomOut, FitView } from './Icons'
import { DockIcon, DOCK_ORDER, SHAPES, ShapeSvg, type ShapeKind } from '../shapes'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'

// React Flow's wheel/trackpad zoom uses a small fixed step, and the macOS pinch
// boost doesn't apply on Windows/Linux, so zooming feels sluggish. We intercept
// wheel events over the zoom surface and re-dispatch them with a larger delta, so
// d3-zoom takes bigger steps — closer to a browser's native zoom speed. Tune here.
const ZOOM_WHEEL_MULTIPLIER = 3.5
type AmplifiableWheel = WheelEvent & { _amplified?: boolean }

// Transparent 1×1 GIF used to suppress the browser's default drag image, so only
// our on-canvas ghost shows while dragging a shape from the dock.
const EMPTY_DRAG_IMG =
  typeof Image !== 'undefined'
    ? Object.assign(new Image(), {
        src: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
      })
    : null

const nodeTypes: NodeTypes = { shape: ShapeNode }
const edgeTypes: EdgeTypes = { deletable: DeletableEdge }

const MINIMAP_COLORS: Record<ShapeKind, string> = {
  terminal: '#f3c6d2',
  process: '#f2e3b0',
  decision: '#f1dca0',
  io: '#bcd6f4',
  document: '#cfe4cf',
  subprocess: '#f2e3b0',
  database: '#d6cdf0',
  connector: '#bcd6f4'
}

interface CanvasPaneProps {
  nodes: Node<ShapeNodeData>[]
  edges: Edge[]
  onNodesChange: OnNodesChange<Node<ShapeNodeData>>
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
  onDeleteEdge: (id: string) => void
  onNodeClick: NodeMouseHandler<Node<ShapeNodeData>>
  onNodeDoubleClick: NodeMouseHandler<Node<ShapeNodeData>>
  onNodeContextMenu: NodeMouseHandler<Node<ShapeNodeData>>
  onSelectionContextMenu: (event: React.MouseEvent, nodes: Node<ShapeNodeData>[]) => void
  onPaneContextMenu: (event: React.MouseEvent | MouseEvent) => void
  onAddShape: (kind: ShapeKind, center: { x: number; y: number }) => void
  editingNodeId: string | null
  onRenameCommit: (id: string, label: string) => void
  onRenameCancel: () => void
  path: string[]
  onNavigate: (index: number) => void
}

function ZoomControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const { zoom } = useViewport()

  return (
    <div className="zoom">
      <button title="Zoom in" onClick={() => zoomIn()}>
        <ZoomIn />
      </button>
      <div className="lvl">{Math.round(zoom * 100)}%</div>
      <button title="Zoom out" onClick={() => zoomOut()}>
        <ZoomOut />
      </button>
      <button title="Fit to view" onClick={() => fitView({ padding: 0.2, duration: 200 })}>
        <FitView />
      </button>
    </div>
  )
}

interface ShapeDockProps {
  onAdd: (kind: ShapeKind) => void
  onDragStart: (kind: ShapeKind, e: React.DragEvent) => void
  onDragEnd: () => void
}

function ShapeDock({ onAdd, onDragStart, onDragEnd }: ShapeDockProps) {
  const left = DOCK_ORDER.slice(0, 4)
  const right = DOCK_ORDER.slice(4)
  const button = (kind: ShapeKind) => (
    <button
      key={kind}
      className="sdshape"
      title={`Add ${SHAPES[kind].label} — click or drag onto the canvas`}
      draggable
      onClick={() => onAdd(kind)}
      onDragStart={(e) => onDragStart(kind, e)}
      onDragEnd={onDragEnd}
    >
      <DockIcon kind={kind} />
      <span>{SHAPES[kind].label}</span>
    </button>
  )
  return (
    <div className="shapedock">
      <div className="grip">
        <i />
        <i />
        <i />
      </div>
      {left.map(button)}
      <div className="sep" />
      {right.map(button)}
    </div>
  )
}

function Flow({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onDeleteEdge,
  onNodeClick,
  onNodeDoubleClick,
  onNodeContextMenu,
  onSelectionContextMenu,
  onPaneContextMenu,
  onAddShape,
  editingNodeId,
  onRenameCommit,
  onRenameCancel,
  activeName
}: CanvasPaneProps & { activeName: string }) {
  const { screenToFlowPosition } = useReactFlow()
  const { zoom } = useViewport()
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragKind = useRef<ShapeKind | null>(null)
  // Ghost position is in canvas-local pixels (cursor relative to the canvas box).
  const [ghost, setGhost] = useState<{ kind: ShapeKind; x: number; y: number } | null>(null)

  // Place new shapes at the centre of the visible canvas, in flow coordinates.
  const handleAdd = useCallback(
    (kind: ShapeKind) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      const sx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
      const sy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
      onAddShape(kind, screenToFlowPosition({ x: sx, y: sy }))
    },
    [screenToFlowPosition, onAddShape]
  )

  // Speed up wheel/trackpad zoom by re-dispatching wheel events with a bigger delta.
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const onWheel = (e: WheelEvent): void => {
      if ((e as AmplifiableWheel)._amplified) return // skip our own re-dispatch
      const target = e.target
      if (!(target instanceof Element)) return
      // Only the main zoom surface — leave the minimap and overlay panels alone.
      if (!target.closest('.react-flow__pane, .react-flow__viewport')) return
      if (target.closest('.nowheel')) return
      e.preventDefault()
      e.stopImmediatePropagation()
      const amplified: AmplifiableWheel = new WheelEvent('wheel', {
        deltaX: e.deltaX,
        deltaY: e.deltaY * ZOOM_WHEEL_MULTIPLIER,
        deltaZ: e.deltaZ,
        deltaMode: e.deltaMode,
        clientX: e.clientX,
        clientY: e.clientY,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        bubbles: true,
        cancelable: true,
        view: window
      })
      amplified._amplified = true
      target.dispatchEvent(amplified)
    }
    el.addEventListener('wheel', onWheel, { capture: true, passive: false })
    return () => el.removeEventListener('wheel', onWheel, { capture: true })
  }, [])

  const handleDragStart = useCallback((kind: ShapeKind, e: React.DragEvent) => {
    dragKind.current = kind
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('text/plain', kind) // some browsers need a payload to start a drag
    if (EMPTY_DRAG_IMG) e.dataTransfer.setDragImage(EMPTY_DRAG_IMG, 0, 0)
  }, [])

  const clearDrag = useCallback(() => {
    dragKind.current = null
    setGhost(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!dragKind.current) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    setGhost({ kind: dragKind.current, x: e.clientX - rect.left, y: e.clientY - rect.top })
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      const kind = dragKind.current
      if (!kind) return
      e.preventDefault()
      onAddShape(kind, screenToFlowPosition({ x: e.clientX, y: e.clientY }))
      clearDrag()
    },
    [onAddShape, screenToFlowPosition, clearDrag]
  )

  const ghostSize = ghost ? SHAPES[ghost.kind].defaultSize : null
  const editValue = { editingId: editingNodeId, commit: onRenameCommit, cancel: onRenameCancel }
  const edgeToolsValue = { onDelete: onDeleteEdge }

  return (
    <div
      className="canvas"
      ref={canvasRef}
      onDragOver={handleDragOver}
      onDragLeave={(e) => {
        // Only clear when the cursor actually leaves the canvas, not its children.
        if (!e.currentTarget.contains(e.relatedTarget as globalThis.Node | null)) setGhost(null)
      }}
      onDrop={handleDrop}
    >
      <NodeEditContext.Provider value={editValue}>
       <EdgeToolsContext.Provider value={edgeToolsValue}>
        <ReactFlow
          // Remount per block so the view fits the newly-loaded sub-diagram.
          key={activeName}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onNodeContextMenu={onNodeContextMenu}
          onSelectionContextMenu={onSelectionContextMenu}
          onPaneContextMenu={onPaneContextMenu}
          // Ctrl/Cmd+click drills into a node, so don't also use it for multi-select.
          multiSelectionKeyCode={null}
          // Each node exposes four ports that act as both source and target.
          connectionMode={ConnectionMode.Loose}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.2}
          maxZoom={2.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.1} color="var(--grid-dot)" />
          <MiniMap
            pannable
            zoomable
            nodeColor={(n) => MINIMAP_COLORS[(n.data as ShapeNodeData)?.kind] ?? '#888'}
            nodeStrokeWidth={0}
            maskColor="oklch(0.15 0.006 295 / 0.5)"
          />
        </ReactFlow>
       </EdgeToolsContext.Provider>
      </NodeEditContext.Provider>
      {ghost && ghostSize && (
        <div
          className="shape-ghost"
          style={{ left: ghost.x, top: ghost.y, width: ghostSize.w * zoom, height: ghostSize.h * zoom }}
        >
          <ShapeSvg kind={ghost.kind} w={ghostSize.w} h={ghostSize.h} />
        </div>
      )}
      <ZoomControls />
      <ShapeDock onAdd={handleAdd} onDragStart={handleDragStart} onDragEnd={clearDrag} />
    </div>
  )
}

export function CanvasPane(props: CanvasPaneProps) {
  const { path, onNavigate } = props
  const activeName = path[path.length - 1]

  return (
    <section className="canvas-wrap">
      <div className="breadcrumb">
        {path.map((name, i) => (
          <Fragment key={`${name}-${i}`}>
            {i > 0 && <Chevron />}
            <button
              className={`crumb${i === path.length - 1 ? ' active' : ''}`}
              onClick={() => onNavigate(i)}
            >
              {name}
            </button>
          </Fragment>
        ))}
        <span className="hint">ctrl-click to drill in · double-click to rename · shift-drag to select · right-click to refactor</span>
      </div>
      <ReactFlowProvider>
        <Flow {...props} activeName={activeName} />
      </ReactFlowProvider>
    </section>
  )
}
