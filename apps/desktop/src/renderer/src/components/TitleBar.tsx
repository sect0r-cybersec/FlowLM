import { BrandMark, Minimize, Maximize, Close } from './Icons'

export function TitleBar() {
  const win = window.flowlm?.window

  return (
    <div className="titlebar">
      <div className="brand">
        <BrandMark />
        <span>FlowLM</span>
      </div>
      <div className="spacer" />
      <div className="winctl">
        <button title="Minimise" onClick={() => win?.minimize()}>
          <Minimize />
        </button>
        <button title="Maximise" onClick={() => win?.toggleMaximize()}>
          <Maximize />
        </button>
        <button title="Close" onClick={() => win?.close()}>
          <Close />
        </button>
      </div>
    </div>
  )
}
