import { type Edge, type Node } from '@xyflow/react'
import type { ShapeNodeData } from '../components/ShapeNode'
import type { FlowGraph } from '@flowlm/core'
import { defaultEdgeProps } from '../flowDefaults'

const mk = (
  id: string,
  kind: ShapeNodeData['kind'],
  label: string,
  x: number,
  y: number,
  w?: number,
  h?: number
): Node<ShapeNodeData> => ({
  id,
  type: 'shape',
  position: { x, y },
  data: { kind, label, w, h }
})

const CX = 300

/** Seed nodes/edges so the M1 shell mirrors the mockup. Replaced by real sync in M3. */
export const SAMPLE_NODES: Node<ShapeNodeData>[] = [
  mk('Start', 'terminal', 'Start', CX + 30, 0, 96, 34),
  mk('Power', 'process', 'Power on', CX + 20, 78, 120, 36),
  mk('Scan', 'process', 'Scan environment', CX, 156, 156, 36),
  mk('Plan', 'subprocess', 'Plan route', CX + 12, 234, 136, 40),
  mk('Follow', 'process', 'Follow route', CX + 16, 314, 128, 36),
  mk('Done', 'decision', 'Finished route?', CX, 392, 156, 86),
  mk('Off', 'io', 'Vacuum off', CX + 20, 520, 118, 36),
  mk('Dock', 'process', 'Return to dock', CX + 10, 598, 136, 36),
  mk('End', 'terminal', 'End', CX + 36, 676, 88, 34),
  mk('Logs', 'database', 'Logs', 40, 150, 92, 52)
]

const edge = (source: string, target: string, label?: string, dashed = false): Edge => ({
  id: `${source}-${target}`,
  source,
  target,
  label,
  ...defaultEdgeProps(dashed)
})

export const SAMPLE_EDGES: Edge[] = [
  edge('Start', 'Power'),
  edge('Power', 'Scan'),
  edge('Scan', 'Plan'),
  edge('Plan', 'Follow'),
  edge('Follow', 'Done'),
  edge('Done', 'Off', 'Yes'),
  edge('Done', 'Follow', 'No'),
  edge('Off', 'Dock'),
  edge('Dock', 'End'),
  edge('Logs', 'Scan', undefined, true)
]

/** The `## Plan route` subprocess block — opened by double-clicking the `Plan` node. */
export const SAMPLE_PLAN_ROUTE: FlowGraph = {
  direction: 'TD',
  nodes: [
    { id: 'In', kind: 'terminal', label: 'Enter' },
    { id: 'Grid', kind: 'process', label: 'Build grid' },
    { id: 'Path', kind: 'process', label: 'Plan path' },
    { id: 'Obstacle', kind: 'decision', label: 'Obstacle?' },
    { id: 'Reroute', kind: 'process', label: 'Reroute' },
    { id: 'Out', kind: 'terminal', label: 'Return' }
  ],
  edges: [
    { source: 'In', target: 'Grid' },
    { source: 'Grid', target: 'Path' },
    { source: 'Path', target: 'Obstacle' },
    { source: 'Obstacle', target: 'Reroute', label: 'Yes' },
    { source: 'Obstacle', target: 'Out', label: 'No' },
    { source: 'Reroute', target: 'Path' }
  ]
}
