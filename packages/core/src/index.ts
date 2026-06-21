/**
 * @flowlm/core — the pure, framework-free heart of FlowLM (model, shapes,
 * serializer, parser, refactors). Imported by both the desktop app and the MCP
 * server so they can never disagree on what a valid diagram is.
 */
export * from './model'
export * from './shapes'
export * from './serialize'
export * from './parse'
export * from './refactor'
