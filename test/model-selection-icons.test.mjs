import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'

it.each(['dsh-client-ui-model-selection', 'dsh-client-ui-settings-models'])('%s uses only icons exported by the installed primitives package', async (packageName) => {
  const require = createRequire(import.meta.url)
  const client = await readFile(require.resolve(`@deepseek-ai/${packageName}/package.json`).replace('package.json', 'lib/client.js'), 'utf8')
  const primitives = await readFile(require.resolve('@deepseek-ai/dsh-client-ui-primitives'), 'utf8')
  const exports = primitives.match(/export \{([^}]+)\}/)?.[1].split(',').map(name => name.trim().split(/\s+as\s+/).at(-1))
  expect(exports).toBeDefined()
  const icons = [...new Set([...client.matchAll(/_deepseek_ai_dsh_client_ui_primitives\.(Icon\w+)/g)].map(match => match[1]))]
  expect(icons.length).toBeGreaterThan(0)
  for (const icon of icons) expect(exports, `missing model selector icon ${icon}`).toContain(icon)
})
