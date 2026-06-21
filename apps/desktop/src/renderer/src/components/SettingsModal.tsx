import { Close } from './Icons'

interface SettingsModalProps {
  vaultPath: string
  canChange: boolean
  onChangeVault: () => void
  onClose: () => void
}

export function SettingsModal({ vaultPath, canChange, onChangeVault, onClose }: SettingsModalProps) {
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
        </div>
      </div>
    </div>
  )
}
