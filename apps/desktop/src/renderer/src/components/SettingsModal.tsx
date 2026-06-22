import { Close } from './Icons'

interface SettingsModalProps {
  vaultPath: string
  canChange: boolean
  onChangeVault: () => void
  mcpEnabled: boolean
  onToggleMcp: (enabled: boolean) => void
  onClose: () => void
}

export function SettingsModal({
  vaultPath,
  canChange,
  onChangeVault,
  mcpEnabled,
  onToggleMcp,
  onClose
}: SettingsModalProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span>Settings</span>
          <button className="modal-close" onClick={onClose} title="Close">
            <Close />
          </button>
        </div>
        <div className="modal-body">
          <div className="setting">
            <div className="setting-label">Vault folder</div>
            <div className="setting-desc">
              Diagrams are saved here as plain <code>.md</code> files — point it at an Obsidian vault
              or any folder.
            </div>
            <div className="setting-row">
              <code className="setting-value" title={vaultPath}>
                {vaultPath}
              </code>
              <button className="tbtn" onClick={onChangeVault} disabled={!canChange}>
                Change…
              </button>
            </div>
            {!canChange && (
              <div className="setting-desc">Changing the vault is available in the desktop app.</div>
            )}
          </div>

          <div className="setting">
            <label className="setting-toggle">
              <div>
                <div className="setting-label">MCP server</div>
                <div className="setting-desc">
                  Let AI assistants read and write your diagrams over the bundled FlowLM MCP
                  server. Off by default.
                </div>
              </div>
              <input
                type="checkbox"
                role="switch"
                checked={mcpEnabled}
                disabled={!canChange}
                onChange={(e) => onToggleMcp(e.target.checked)}
              />
            </label>
            {!canChange && (
              <div className="setting-desc">The MCP server is available in the desktop app.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
