import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  useReactFlow,
  useViewport,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type NodeTypes,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { ShapeNode, type ShapeNodeData } from './ShapeNode'
import { Chevron, ZoomIn, ZoomOut, FitView } from './Icons'
import { DockIcon, DOCK_ORDER, SHAPES, type ShapeKind } from '../shapes'
import { Fragment } from 'react'

const nodeTypes: NodeTypes = { shape: ShapeNode }

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
  onNodeDoubleClick: NodeMouseHandler<Node<ShapeNodeData>>
  onNodeContextMenu: NodeMouseHandler<Node<ShapeNodeData>>
  onSelectionContextMenu: (event: React.MouseEvent, nodes: Node<ShapeNodeData>[]) => void
  onPaneContextMenu: (event: React.MouseEvent | MouseEvent) => void
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

function ShapeDock() {
  // Click-to-add is wired up in M2/M3; the dock is visual for now.
  const left = DOCK_ORDER.slice(0, 4)
  const right = DOCK_ORDER.slice(4)
  return (
    <div className="shapedock">
      <div className="grip">
        <i />
        <i />
        <i />
      </div>
      {left.map((kind) => (
        <button key={kind} className="sdshape" title={SHAPES[kind].label}>
          <DockIcon kind={kind} />
          <span>{SHAPES[kind].label}</span>
        </button>
      ))}
      <div className="sep" />
      {right.map((kind) => (
        <button key={kind} className="sdshape" title={SHAPES[kind].label}>
          <DockIcon kind={kind} />
          <span>{SHAPES[kind].label}</span>
        </button>
      ))}
    </div>
  )
}

function Flow({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeDoubleClick,
  onNodeContextMenu,
  onSelectionContextMenu,
  onPaneContextMenu,
  activeName
}: CanvasPaneProps & { activeName: string }) {
  return (
    <div className="canvas">
      <ReactFlow
        // Remount per block so the view fits the newly-loaded sub-diagram.
        key={activeName}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onSelectionContextMenu={onSelectionContextMenu}
        onPaneContextMenu={onPaneContextMenu}
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
      <ZoomControls />
      <ShapeDock />
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
        <span className="hint">double-click to drill in · shift-drag to select · right-click to refactor</span>
      </div>
      <ReactFlowProvider>
        <Flow {...props} activeName={activeName} />
      </ReactFlowProvider>
    </section>
  )
}
