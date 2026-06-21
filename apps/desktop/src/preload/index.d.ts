import type { FlowlmApi } from './index'

declare global {
  interface Window {
    // Absent when the renderer runs in a plain browser (the dev:web preview).
    flowlm?: FlowlmApi
  }
}

export {}
