# FlowLM

A visual-first flowchart desktop app whose canonical representation is concise,
AI-readable **Mermaid** text kept in sync with the canvas in both directions.
Draw a system, then paste the text into an LLM to design or extend others.

> "Mermaid in reverse" — you draw, the tool writes the text; type/paste the text
> and the diagram appears.

## Stack

- **Electron** + **electron-vite** + **React** + **TypeScript** (MIT)
- **React Flow** (`@xyflow/react` v12) — interactive canvas
- **CodeMirror 6** — text pane
- **mermaid** v11 — text preview render (M3+)
- Single dark theme, violet accent (Inter + JetBrains Mono)

## Monorepo

```
packages/core    @flowlm/core — pure model / serialize / parse / shapes / refactor
apps/desktop     @flowlm/desktop — the Electron app
apps/mcp         @flowlm/mcp — local stdio MCP server over a .md vault
```

`@flowlm/core` is the single source of diagram truth, imported by both the app and
the MCP server so they can never disagree on what a valid diagram is.

## Develop

```bash
npm install            # from repo root

npm run dev            # full Electron app (builds core first)
npm run dev:web        # browser-only UI preview, no Electron — http://localhost:5199

npm run typecheck      # tsc across all workspaces
npm run test           # vitest across all workspaces (60 tests)
npm run build          # build core + desktop installer bundle + mcp
npm run license-check  # fails on any license outside the allowlist (+ elkjs EPL exception)
```

## MCP server

A standalone local stdio server so Claude Code / Claude Desktop can read and edit a
diagram vault whether or not the app is running. Tools: `list_diagrams`,
`read_diagram`, `create_diagram`, `update_diagram`. Every write is validated through
the shared `@flowlm/core` parser, written atomically, and guarded against path
traversal. Point it at a vault with `FLOWLM_VAULT` (or a CLI arg):

```jsonc
// claude_desktop_config.json
{
  "mcpServers": {
    "flowlm": {
      "command": "node",
      "args": ["/path/to/apps/mcp/dist/index.js"],
      "env": { "FLOWLM_VAULT": "/path/to/your/vault" }
    }
  }
}
```

## Build order — all complete ✅

1. **Shell** — frameless window, toolbar, sidebar, two-pane (CodeMirror + React Flow), splitter, status bar.
2. **Serializer** — graph → Mermaid (all 8 shapes, gotchas handled).
3. **Parser + ELK layout** — Mermaid → graph, fully bidirectional, live preview.
4. **Subprocess model** — `[[ ]]` nodes, `## blocks`, double-click drill-down, breadcrumbs.
5. **Refactor menu** — extract / inline subprocess, collapse chain, merge duplicates, tidy.
6. **Files & export** — open/save `.md`, configurable vault + live browser, settings, Copy for AI, PNG/JPEG/SVG export, bundled fonts.
7. **MCP server** — `@flowlm/core` extracted; local stdio `@flowlm/mcp` (list/read/create/update).

## Licence

MIT (see [LICENSE](LICENSE)). elkjs is EPL-2.0 — the one documented allowlist exception.
