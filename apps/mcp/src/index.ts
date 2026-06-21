import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { homedir } from 'os'
import { join } from 'path'
import { Vault } from './vault'

// Vault location: --vault arg, FLOWLM_VAULT env, else the app's default folder.
const cliVault = process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : undefined
const vaultPath = process.env.FLOWLM_VAULT || cliVault || join(homedir(), 'Documents', 'FlowLM')
const vault = new Vault(vaultPath)

const ok = (text: string) => ({ content: [{ type: 'text' as const, text }] })
const fail = (e: unknown) => ({
  content: [{ type: 'text' as const, text: e instanceof Error ? e.message : String(e) }],
  isError: true
})

const server = new McpServer({ name: 'flowlm', version: '0.1.0' })

server.registerTool(
  'list_diagrams',
  {
    title: 'List diagrams',
    description: `List all FlowLM diagram (.md) files in the vault at ${vaultPath}.`
  },
  async () => {
    try {
      const files = await vault.list()
      return ok(files.length ? files.join('\n') : '(no diagrams in vault)')
    } catch (e) {
      return fail(e)
    }
  }
)

server.registerTool(
  'read_diagram',
  {
    title: 'Read diagram',
    description: 'Read a diagram as Markdown (with fenced mermaid blocks).',
    inputSchema: { path: z.string().describe('Vault-relative path to a .md diagram') }
  },
  async ({ path }) => {
    try {
      return ok(await vault.read(path))
    } catch (e) {
      return fail(e)
    }
  }
)

const contentSchema = {
  path: z.string().describe('Vault-relative .md path'),
  content: z
    .string()
    .describe('Full Markdown document: a title heading plus ## blocks with fenced mermaid charts')
}

server.registerTool(
  'create_diagram',
  {
    title: 'Create diagram',
    description:
      'Create a new diagram. Content is validated as a FlowLM document before writing; fails if the file already exists.',
    inputSchema: contentSchema
  },
  async ({ path, content }) => {
    try {
      await vault.create(path, content)
      return ok(`Created ${path}`)
    } catch (e) {
      return fail(e)
    }
  }
)

server.registerTool(
  'update_diagram',
  {
    title: 'Update diagram',
    description:
      'Overwrite an existing diagram. Content is validated as a FlowLM document before writing; fails if the file does not exist.',
    inputSchema: contentSchema
  },
  async ({ path, content }) => {
    try {
      await vault.update(path, content)
      return ok(`Updated ${path}`)
    } catch (e) {
      return fail(e)
    }
  }
)

async function main(): Promise<void> {
  await server.connect(new StdioServerTransport())
  // Note: stdout is the MCP channel — diagnostics must go to stderr.
  console.error(`FlowLM MCP server ready. Vault: ${vaultPath}`)
}

main().catch((e) => {
  console.error('FlowLM MCP server failed to start:', e)
  process.exit(1)
})
