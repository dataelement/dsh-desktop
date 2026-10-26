import { build } from 'esbuild'
import electron from 'electron'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const output = join(process.cwd(), 'artifacts', 'recovery-ui')
mkdirSync(output, { recursive: true })
await build({
  entryPoints: ['scripts/recovery-ui-smoke.ts'],
  outfile: join(output, 'smoke.cjs'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['electron']
})
await build({
  entryPoints: ['scripts/recovery-titlebar-preload.ts'],
  outfile: join(output, 'titlebar-preload.cjs'),
  bundle: true, platform: 'node', format: 'cjs', external: ['electron']
})
for (const scale of ['1', '1.25', '1.5']) {
  const result = spawnSync(electron, [join(output, 'smoke.cjs')], {
    env: { ...process.env, RECOVERY_UI_SCALE: scale, RECOVERY_UI_OUTPUT: output, RECOVERY_UI_TITLEBAR_PRELOAD: join(output, 'titlebar-preload.cjs') },
    stdio: 'inherit',
    timeout: 120_000
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
