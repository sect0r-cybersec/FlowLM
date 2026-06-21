import { Plus, Folder, Save, Image, Sparkle, Gear } from './Icons'

interface ToolbarProps {
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  onExportImage: (e: React.MouseEvent) => void
  onCopyForAI: () => void
  onSettings: () => void
  copied: boolean
}

export function Toolbar({
  onNew,
  onOpen,
  onSave,
  onExportImage,
  onCopyForAI,
  onSettings,
  copied
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <button className="tbtn" onClick={onNew}>
        <Plus />
        New
      </button>
      <button className="tbtn" onClick={onOpen}>
        <Folder />
        Open
      </button>
      <button className="tbtn" onClick={onSave}>
        <Save />
        Save
      </button>
      <button className="tbtn" onClick={onExportImage}>
        <Image />
        Save to Image
      </button>

      <span className="grow" />

      <button className="copy-ai" onClick={onCopyForAI}>
        <Sparkle />
        {copied ? 'Copied!' : 'Copy for AI'}
      </button>
      <button className="gear" title="Settings" onClick={onSettings}>
        <Gear />
      </button>
    </div>
  )
}
