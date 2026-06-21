import { useMemo } from 'react'
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { EditorView } from '@codemirror/view'
import { flowlmEditorTheme } from './editorTheme'
import { MermaidPreview } from './MermaidPreview'

export type EditorMode = 'source' | 'preview'

interface EditorPaneProps {
  fileName: string
  value: string
  mode: EditorMode
  onChange: (value: string) => void
  onModeChange: (mode: EditorMode) => void
  onCursorChange?: (line: number, col: number) => void
  editorRef?: React.Ref<ReactCodeMirrorRef>
}

export function EditorPane({
  fileName,
  value,
  mode,
  onChange,
  onModeChange,
  onCursorChange,
  editorRef
}: EditorPaneProps) {
  const extensions = useMemo(() => [markdown(), EditorView.lineWrapping, flowlmEditorTheme], [])

  return (
    <section className="editor">
      <div className="pane-tab">
        <span className="dot" />
        <span className="name">{fileName}</span>
        <div className="modeswitch">
          <button className={mode === 'source' ? 'on' : ''} onClick={() => onModeChange('source')}>
            Source
          </button>
          <button className={mode === 'preview' ? 'on' : ''} onClick={() => onModeChange('preview')}>
            Preview
          </button>
        </div>
      </div>

      {mode === 'source' ? (
        <CodeMirror
          ref={editorRef}
          className="editor-code"
          value={value}
          theme="none"
          height="100%"
          extensions={extensions}
          onChange={onChange}
          onUpdate={(vu) => {
            if (!onCursorChange) return
            if (vu.selectionSet || vu.docChanged) {
              const head = vu.state.selection.main.head
              const line = vu.state.doc.lineAt(head)
              onCursorChange(line.number, head - line.from + 1)
            }
          }}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLine: true,
            highlightActiveLineGutter: true,
            foldGutter: false,
            bracketMatching: true
          }}
        />
      ) : (
        <MermaidPreview doc={value} />
      )}
    </section>
  )
}
