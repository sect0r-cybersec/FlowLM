import { build } from 'esbuild'

// Bundles @flowlm/core in; keeps the SDK / zod / mermaid-ast as runtime deps.
await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  outfile: 'dist/index.js',
  banner: { js: '#!/usr/bin/env node' },
  external: ['@modelcontextprotocol/sdk', 'zod', 'mermaid-ast']
})

console.log('Built dist/index.js')
