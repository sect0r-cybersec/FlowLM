import { useCallback, useEffect, useRef, useState } from 'react'
import {
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Node,
  type NodeMouseHandler
} from '@xyflow/react'
import { EditorView } from '@codemirror/view'
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { TitleBar } from './components/TitleBar'
import { Toolbar } from './components/Toolbar'
import { Sidebar } from './components/Sidebar'
import { EditorPane, type EditorMode } from './components/EditorPane'
import { CanvasPane } from './components/CanvasPane'
import { StatusBar, type SyncState } from './components/StatusBar'
import { type ShapeNodeData } from './components/ShapeNode'
import { ContextMenu, type MenuItem } from './components/ContextMenu'
import { SettingsModal } from './components/SettingsModal'
import { SAMPLE_NODES, SAMPLE_EDGES, SAMPLE_PLAN_ROUTE } from './data/sample'
import { files, settings, baseName, vaultJoin, relToVault, type FileNode } from './fileApi'
import { exportCanvasImage, type ImageFormat } from './exportImage'
import { ElkLayoutEngine, type Positions } from './core/layout'
import {
  serializeDocument,
  parseDocument,
  MAIN_BLOCK,
  emptyGraph,
  getBlock,
  withBlock,
  extractToSubprocess,
  inlineSubprocess,
  collapseChain,
  mergeDuplicates,
  uniqueBlockName,
  type FlowDocument
} from '@flowlm/core'
import { toFlowGraph, graphToFlowNodes, graphToFlowEdges } from './flowAdapter'
import { estimateNodeSize } from './nodeSize'
import { defaultEdgeProps } from './flowDefaults'
import { SHAPES, type ShapeKind } from './shapes'

const SIDEBAR_W = 230
const SPLITTER_W = 6
const MIN_PANE = 320
const PARSE_DEBOUNCE_MS = 300

const TITLE = 'Robot vacuum control flow'

const INITIAL_DOC: FlowDocument = {
  title: TITLE,
  blocks: [
    { name: MAIN_BLOCK, graph: toFlowGraph(SAMPLE_NODES, SAMPLE_EDGES) },
    { name: 'Plan route', graph: SAMPLE_PLAN_ROUTE }
  ]
}

function positionsFromNodes(nodes: Node<ShapeNodeData>[]): Positions {
  const m: Positions = new Map()
  for (const n of nodes) m.set(n.id, { x: n.position.x, y: n.position.y })
  return m
}

/** First file in a depth-first walk of the vault tree (dirs are listed first). */
function findFirstFile(tree: FileNode[]): FileNode | null {
  for (const n of tree) {
    if (n.type === 'file') return n
    const inChild = n.children && findFirstFile(n.children)
    if (inChild) return inChild
  }
  return null
}

// Shown only in the browser preview (no Electron file system).
const DEMO_VAULT = { path: '~/Obsidian/Cybersecurity/Diagrams', name: 'Cybersecurity' }
const DEMO_TREE: FileNode[] = [
  { name: 'Examples', path: 'Examples', type: 'dir', children: [
    { name: 'incident-flow.md', path: 'Examples/incident-flow.md', type: 'file' },
    { name: 'robot-vacuum.md', path: 'Examples/robot-vacuum.md', type: 'file' },
    { name: 'triage-pipeline.md', path: 'Examples/triage-pipeline.md', type: 'file' }
  ] },
  { name: 'caldera-killchain.md', path: 'caldera-killchain.md', type: 'file' },
  { name: 'onboarding-runbook.md', path: 'onboarding-runbook.md', type: 'file' }
]

export default function App() {
  // The active block is shown on the canvas; `modelRef` holds the whole document.
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<ShapeNodeData>>(SAMPLE_NODES)
  const [edges, setEdges, onEdgesChange] = useEdgesState(SAMPLE_EDGES)
  const [doc, setDoc] = useState(() => serializeDocument(INITIAL_DOC))
  const [path, setPath] = useState<string[]>([MAIN_BLOCK])
  const [syncState, setSyncState] = useState<SyncState>('synced')
  const [mode, setMode] = useState<EditorMode>('source')
  const [cursor, setCursor] = useState({ line: 1, col: 1 })
  const [editorWidth, setEditorWidth] = useState<number | null>(null)
  const [menu, setMenu] = useState<{
    x: number
    y: number
    kind: 'node' | 'selection' | 'pane'
    node?: Node<ShapeNodeData>
  } | null>(null)
  const [exportMenu, setExportMenu] = useState<{ x: number; y: number } | null>(null)
  const [vault, setVault] = useState(DEMO_VAULT)
  const [tree, setTree] = useState<FileNode[]>(DEMO_TREE)
  const [currentFile, setCurrentFile] = useState<{ path: string; name: string; rel: string | null } | null>(
    null
  )
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [mcpEnabled, setMcpEnabled] = useState(false)

  const activeName = path[path.length - 1]

  const modelRef = useRef<FlowDocument>(INITIAL_DOC)
  const positionsRef = useRef<Map<string, Positions>>(
    new Map([[MAIN_BLOCK, positionsFromNodes(SAMPLE_NODES)]])
  )
  const layoutRef = useRef(new ElkLayoutEngine())
  const lastSyncedText = useRef(doc)
  const applyingProgrammatic = useRef(false) // canvas change came from nav / text parse
  const parseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pathRef = useRef(path)
  pathRef.current = path
  const editorRef = useRef<ReactCodeMirrorRef>(null)
  const mainRef = useRef<HTMLDivElement>(null)

  // Canvas → text: fold the active block's canvas back into the document model
  // and re-serialise (skipped when the canvas change came from nav / a text parse).
  useEffect(() => {
    if (applyingProgrammatic.current) {
      applyingProgrammatic.current = false
      return
    }
    let next = withBlock(modelRef.current, activeName, toFlowGraph(nodes, edges))
    // Lazy subprocess promotion: once a drilled-in block gains content, turn the
    // parent node that points at it (same label) into a subprocess shape.
    const p = pathRef.current
    if (p.length > 1 && nodes.length > 0) {
      const parentName = p[p.length - 2]
      const parent = getBlock(next, parentName)
      const idx =
        parent?.graph.nodes.findIndex(
          (n) => n.label.trim() === activeName && n.kind !== 'subprocess'
        ) ?? -1
      if (parent && idx >= 0) {
        const promoted = parent.graph.nodes.map((n, i) =>
          i === idx ? { ...n, kind: 'subprocess' as const } : n
        )
        next = withBlock(next, parentName, { ...parent.graph, nodes: promoted })
      }
    }
    modelRef.current = next
    positionsRef.current.set(activeName, positionsFromNodes(nodes))
    const text = serializeDocument(next)
    if (text !== lastSyncedText.current) {
      lastSyncedText.current = text
      setDoc(text)
    }
    setSyncState('synced')
  }, [nodes, edges, activeName])

  // Loads a block onto the canvas, laying it out (cached positions, or ELK).
  const loadBlock = useCallback(
    async (name: string, relayout: boolean) => {
      const block = getBlock(modelRef.current, name)
      const graph = block ? block.graph : emptyGraph()
      let positions = positionsRef.current.get(name)
      const haveAll = !!positions && graph.nodes.every((n) => positions!.has(n.id))
      if ((relayout || !haveAll) && graph.nodes.length > 0) {
        const sizes = graph.nodes.map((n) => {
          const s = estimateNodeSize(n.kind, n.label)
          return { id: n.id, width: s.w, height: s.h }
        })
        positions = await layoutRef.current.layout(graph, sizes)
        positionsRef.current.set(name, positions)
      }
      applyingProgrammatic.current = true
      setNodes(graphToFlowNodes(graph, positions ?? new Map()))
      setEdges(graphToFlowEdges(graph))
    },
    [setNodes, setEdges]
  )

  // Scrolls the source editor to a block's `## <name>` heading.
  const revealBlock = useCallback((name: string) => {
    const view = editorRef.current?.view
    if (!view) return
    const idx = view.state.doc.toString().indexOf(`## ${name}`)
    if (idx < 0) return
    const line = view.state.doc.lineAt(idx)
    view.dispatch({
      selection: { anchor: line.from },
      effects: EditorView.scrollIntoView(line.from, { y: 'start' })
    })
  }, [])

  const navigateTo = useCallback(
    (newPath: string[]) => {
      const name = newPath[newPath.length - 1]
      setPath(newPath)
      void loadBlock(name, false)
      revealBlock(name)
    },
    [loadBlock, revealBlock]
  )

  // Drill into a node's subprocess space (Ctrl/Cmd+click). We just navigate in —
  // the node is *not* converted to a subprocess and no block is persisted yet.
  // That happens lazily, once something is actually added inside (see the canvas →
  // text effect above), so an empty drill-in leaves the parent diagram untouched.
  const drillInto = useCallback(
    (node: Node<ShapeNodeData>) => {
      const name = node.data.label.trim()
      if (!name) return // can't name a block after an unlabelled node
      navigateTo([...pathRef.current, name])
    },
    [navigateTo]
  )

  const onNodeClick = useCallback<NodeMouseHandler<Node<ShapeNodeData>>>(
    (e, node) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        drillInto(node)
      }
    },
    [drillInto]
  )

  // Double-click starts an inline rename (connectors carry no label).
  const onNodeDoubleClick = useCallback<NodeMouseHandler<Node<ShapeNodeData>>>((_e, node) => {
    if (node.data.kind === 'connector') return
    setEditingId(node.id)
  }, [])

  // Commit a rename: update the label (and re-fit the node to it). The canvas →
  // text effect then re-serialises, so the change lands in the Markdown source.
  const commitRename = useCallback(
    (id: string, label: string) => {
      setEditingId(null)
      const trimmed = label.trim()
      if (!trimmed) return // empty rename: keep the previous label
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== id) return n
          const s = estimateNodeSize(n.data.kind, trimmed)
          return { ...n, data: { ...n.data, label: trimmed, w: s.w, h: s.h } }
        })
      )
    },
    [setNodes]
  )

  const cancelRename = useCallback(() => setEditingId(null), [])

  // Text → canvas: parse + relayout the active block (debounced, non-destructive).
  const runParse = useCallback(
    async (text: string) => {
      let parsed: FlowDocument
      try {
        parsed = parseDocument(text)
      } catch {
        setSyncState('error') // keep the last good diagram
        return
      }
      modelRef.current = parsed
      positionsRef.current.clear() // text has no positions; re-layout on demand
      const names = new Set(parsed.blocks.map((b) => b.name))
      const trimmed: string[] = []
      for (const n of pathRef.current) {
        if (names.has(n)) trimmed.push(n)
        else break
      }
      const newPath = trimmed.length ? trimmed : [MAIN_BLOCK]
      setPath(newPath)
      await loadBlock(newPath[newPath.length - 1], true)
      lastSyncedText.current = text
      setSyncState('synced')
    },
    [loadBlock]
  )

  const onDocChange = useCallback(
    (value: string) => {
      setDoc(value)
      if (value === lastSyncedText.current) return // echo of our own serialization
      setSyncState('parsing')
      if (parseTimer.current) clearTimeout(parseTimer.current)
      parseTimer.current = setTimeout(() => void runParse(value), PARSE_DEBOUNCE_MS)
    },
    [runParse]
  )

  useEffect(
    () => () => {
      if (parseTimer.current) clearTimeout(parseTimer.current)
    },
    []
  )

  // --- Files & export ------------------------------------------------------
  // Replaces the whole document from text (open / new file).
  const applyDocument = useCallback(
    async (text: string) => {
      let parsed: FlowDocument
      try {
        parsed = parseDocument(text)
      } catch {
        setDoc(text)
        lastSyncedText.current = text
        setSyncState('error')
        return
      }
      modelRef.current = parsed
      positionsRef.current.clear()
      setDoc(text)
      lastSyncedText.current = text
      const root = parsed.blocks[0]?.name ?? MAIN_BLOCK
      setPath([root])
      await loadBlock(root, true)
      setSyncState('synced')
    },
    [loadBlock]
  )

  const refreshTree = useCallback(async () => {
    if (!files) return
    const v = await files.listVault()
    setVault({ path: v.vaultPath, name: baseName(v.vaultPath) })
    setTree(v.tree)
    return v
  }, [])

  // On launch (Electron only): load the vault and open its first diagram.
  useEffect(() => {
    if (!files) return
    void (async () => {
      const v = await refreshTree()
      const firstFile = v && findFirstFile(v.tree)
      if (v && firstFile) {
        const abs = vaultJoin(v.vaultPath, firstFile.path)
        const content = await files!.read(abs)
        setCurrentFile({ path: abs, name: firstFile.name, rel: firstFile.path })
        await applyDocument(content)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const newDocument = useCallback(() => {
    const blank: FlowDocument = { title: 'Untitled', blocks: [{ name: MAIN_BLOCK, graph: emptyGraph() }] }
    modelRef.current = blank
    positionsRef.current.clear()
    const text = serializeDocument(blank)
    lastSyncedText.current = text
    setDoc(text)
    setCurrentFile(null)
    setPath([MAIN_BLOCK])
    applyingProgrammatic.current = true
    setNodes([])
    setEdges([])
    setSyncState('synced')
  }, [setNodes, setEdges])

  const openFile = useCallback(async () => {
    if (!files) return
    const res = await files.open()
    if (!res) return
    setCurrentFile({ path: res.path, name: baseName(res.path), rel: relToVault(res.path, vault.path) })
    await applyDocument(res.content)
  }, [applyDocument, vault.path])

  const openFromTree = useCallback(
    async (node: FileNode) => {
      if (!files || node.type !== 'file') return
      const abs = vaultJoin(vault.path, node.path)
      const content = await files.read(abs)
      setCurrentFile({ path: abs, name: node.name, rel: node.path })
      await applyDocument(content)
    },
    [applyDocument, vault.path]
  )

  const saveFile = useCallback(async () => {
    if (!files) return
    const res = await files.save({
      path: currentFile?.path ?? null,
      content: doc,
      suggestedName: currentFile?.name ?? 'untitled.md'
    })
    if (!res) return
    setCurrentFile({ path: res.path, name: res.name, rel: relToVault(res.path, vault.path) })
    await refreshTree()
  }, [currentFile, doc, vault.path, refreshTree])

  const copyForAI = useCallback(async () => {
    if (files) await files.writeClipboard(doc)
    else await navigator.clipboard?.writeText(doc).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [doc])

  const chooseVault = useCallback(async () => {
    if (!files) return
    const v = await files.chooseVault()
    if (!v) return
    setVault({ path: v.vaultPath, name: baseName(v.vaultPath) })
    setTree(v.tree)
  }, [])

  // Reflect the persisted MCP toggle on launch (desktop only).
  useEffect(() => {
    if (!settings) return
    void settings.get().then((s) => setMcpEnabled(s.mcpEnabled))
  }, [])

  const toggleMcp = useCallback(async (enabled: boolean) => {
    if (!settings) return
    setMcpEnabled(enabled) // optimistic; main process persists + starts/stops
    await settings.setMcpEnabled(enabled)
  }, [])

  const doExport = useCallback(
    async (format: ImageFormat) => {
      const name = (currentFile?.name ?? 'diagram').replace(/\.md$/, '')
      try {
        await exportCanvasImage(format, nodes, name)
      } catch {
        setSyncState('error')
      }
    },
    [nodes, currentFile]
  )

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, ...defaultEdgeProps() }, eds)),
    [setEdges]
  )

  const deleteEdge = useCallback(
    (id: string) => setEdges((eds) => eds.filter((e) => e.id !== id)),
    [setEdges]
  )

  // Drops a fresh shape on the canvas, centred on `center` (a flow-space point),
  // selected and ready to drag. The canvas → text effect folds it into the source.
  const addShape = useCallback(
    (kind: ShapeKind, center: { x: number; y: number }) => {
      const label = SHAPES[kind].label
      const size = estimateNodeSize(kind, label)
      const node: Node<ShapeNodeData> = {
        id: crypto.randomUUID(),
        type: 'shape',
        position: { x: center.x - size.w / 2, y: center.y - size.h / 2 },
        data: { kind, label, w: size.w, h: size.h },
        selected: true
      }
      setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), node])
    },
    [setNodes]
  )

  // --- Refactors -----------------------------------------------------------
  // Snapshot of the document with the live canvas folded into the active block.
  const liveDoc = useCallback(
    () => withBlock(modelRef.current, activeName, toFlowGraph(nodes, edges)),
    [activeName, nodes, edges]
  )

  const applyRefactor = useCallback(
    async (newDoc: FlowDocument) => {
      modelRef.current = newDoc
      const text = serializeDocument(newDoc)
      lastSyncedText.current = text
      setDoc(text)
      positionsRef.current.delete(activeName) // active block changed → relayout
      await loadBlock(activeName, true)
      setSyncState('synced')
    },
    [activeName, loadBlock]
  )

  const refExtract = useCallback(
    (ids: string[]) => {
      const d = liveDoc()
      void applyRefactor(extractToSubprocess(d, activeName, ids, uniqueBlockName(d)))
    },
    [liveDoc, applyRefactor, activeName]
  )
  const refInline = useCallback(
    (nodeId: string) => void applyRefactor(inlineSubprocess(liveDoc(), activeName, nodeId)),
    [liveDoc, applyRefactor, activeName]
  )
  const refCollapse = useCallback(
    (ids: string[]) => {
      const d = liveDoc()
      const g = getBlock(d, activeName)!.graph
      void applyRefactor(withBlock(d, activeName, collapseChain(g, ids)))
    },
    [liveDoc, applyRefactor, activeName]
  )
  const refMerge = useCallback(() => {
    const d = liveDoc()
    const g = getBlock(d, activeName)!.graph
    void applyRefactor(withBlock(d, activeName, mergeDuplicates(g)))
  }, [liveDoc, applyRefactor, activeName])
  const refTidy = useCallback(() => {
    positionsRef.current.delete(activeName)
    void loadBlock(activeName, true)
  }, [activeName, loadBlock])

  const buildMenuItems = (m: NonNullable<typeof menu>): MenuItem[] => {
    if (m.kind === 'pane') {
      return [
        { label: 'Merge duplicate nodes', onClick: refMerge },
        { label: 'Tidy layout', onClick: refTidy }
      ]
    }
    const selectedIds = nodes.filter((n) => n.selected).map((n) => n.id)
    const node = m.node
    const ids =
      node && !selectedIds.includes(node.id) ? [node.id] : selectedIds.length ? selectedIds : []
    const items: MenuItem[] = [
      {
        label: 'Extract to subprocess',
        hint: ids.length ? `${ids.length} node${ids.length === 1 ? '' : 's'}` : undefined,
        disabled: ids.length < 1,
        onClick: () => refExtract(ids)
      }
    ]
    if (node?.data.kind === 'subprocess') {
      items.push({ label: 'Inline subprocess', onClick: () => refInline(node.id) })
    }
    items.push({ label: 'Collapse linear chain', disabled: ids.length < 2, onClick: () => refCollapse(ids) })
    items.push({ label: 'Merge duplicate nodes', onClick: refMerge })
    items.push({ separator: true, label: '' })
    items.push({ label: 'Tidy layout', onClick: refTidy })
    return items
  }

  const onNodeContextMenu = useCallback<NodeMouseHandler<Node<ShapeNodeData>>>((e, node) => {
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY, kind: 'node', node })
  }, [])
  const onSelectionContextMenu = useCallback((e: React.MouseEvent, _nodes: Node<ShapeNodeData>[]) => {
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY, kind: 'selection' })
  }, [])
  const onPaneContextMenu = useCallback((e: React.MouseEvent | MouseEvent) => {
    e.preventDefault()
    setMenu({ x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY, kind: 'pane' })
  }, [])

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const main = mainRef.current
    if (!main) return
    const rect = main.getBoundingClientRect()
    const splitter = e.currentTarget as HTMLElement
    splitter.classList.add('dragging')

    const onMove = (ev: MouseEvent) => {
      const available = rect.width - SIDEBAR_W - SPLITTER_W
      const next = ev.clientX - rect.left - SIDEBAR_W - SPLITTER_W / 2
      setEditorWidth(Math.max(MIN_PANE, Math.min(available - MIN_PANE, next)))
    }
    const onUp = () => {
      splitter.classList.remove('dragging')
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  const editorCol = editorWidth === null ? '1fr' : `${editorWidth}px`

  const fileName = currentFile?.name ?? 'untitled.md'

  return (
    <div className="app">
      <TitleBar />
      <Toolbar
        onNew={newDocument}
        onOpen={openFile}
        onSave={saveFile}
        onExportImage={(e) => setExportMenu({ x: e.clientX, y: e.clientY })}
        onCopyForAI={copyForAI}
        onSettings={() => setSettingsOpen(true)}
        copied={copied}
      />
      <div className="main" ref={mainRef} style={{ ['--editor-w' as string]: editorCol }}>
        <Sidebar
          vaultName={vault.name}
          vaultPath={vault.path}
          tree={tree}
          activePath={currentFile?.rel ?? null}
          currentRel={currentFile?.rel ?? null}
          canChooseVault={!!files}
          onChooseVault={chooseVault}
          onOpenFile={openFromTree}
        />
        <EditorPane
          fileName={fileName}
          value={doc}
          mode={mode}
          onChange={onDocChange}
          onModeChange={setMode}
          onCursorChange={(line, col) => setCursor({ line, col })}
          editorRef={editorRef}
        />
        <div className="splitter" onMouseDown={startDrag} />
        <CanvasPane
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDeleteEdge={deleteEdge}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onNodeContextMenu={onNodeContextMenu}
          onSelectionContextMenu={onSelectionContextMenu}
          onPaneContextMenu={onPaneContextMenu}
          onAddShape={addShape}
          editingNodeId={editingId}
          onRenameCommit={commitRename}
          onRenameCancel={cancelRename}
          path={path}
          onNavigate={(i) => navigateTo(path.slice(0, i + 1))}
        />
      </div>
      <StatusBar
        nodeCount={nodes.length}
        edgeCount={edges.length}
        charCount={doc.length}
        cursor={cursor}
        syncState={syncState}
      />
      {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={buildMenuItems(menu)} onClose={() => setMenu(null)} />
      )}
      {exportMenu && (
        <ContextMenu
          x={exportMenu.x}
          y={exportMenu.y}
          items={[
            { label: 'Export as PNG', onClick: () => void doExport('png') },
            { label: 'Export as JPEG', onClick: () => void doExport('jpeg') },
            { label: 'Export as SVG', onClick: () => void doExport('svg') }
          ]}
          onClose={() => setExportMenu(null)}
        />
      )}
      {settingsOpen && (
        <SettingsModal
          vaultPath={vault.path}
          canChange={!!files}
          onChangeVault={chooseVault}
          mcpEnabled={mcpEnabled}
          onToggleMcp={toggleMcp}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {copied && <div className="toast">Copied for AI</div>}
    </div>
  )
}
