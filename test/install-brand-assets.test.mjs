import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

async function fixture(icons, run) {
  const root = await mkdtemp(path.join(tmpdir(), 'dsh-brand-assets-'))
  try {
    const dist = path.join(root, 'node_modules/@deepseek-ai/dsh-web-frontend/dist')
    await Promise.all(['scripts', 'build', path.relative(root, dist)].map(dir => mkdir(path.join(root, dir), { recursive: true })))
    const script = path.join(root, 'scripts/install-brand-assets.mjs')
    await writeFile(script, await readFile(new URL('../scripts/install-brand-assets.mjs', import.meta.url)))
    for (const name of ['icon.png', 'logo-light.png', 'logo-dark.png']) await writeFile(path.join(root, 'build', name), 'test-icon')
    await writeFile(path.join(dist, 'index.html'), '<link rel="icon" href="./favicon.svg" />')
    await writeFile(path.join(dist, 'manifest.webmanifest'), JSON.stringify({ name: 'Harness', icons }))
    await run({ dist, execute: () => execFileSync(process.execPath, [script], { encoding: 'utf8', stdio: 'pipe' }) })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

describe('brand assets installation across Harness versions', () => {
  it.each([
    [{ src: './favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
    [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  ].map(icons => ({ icons })))('replaces the known icon set and remains idempotent: $icons', async ({ icons }) => {
    const custom = { src: 'custom.png', sizes: '32x32', type: 'image/png' }
    await fixture([...icons, custom], async ({ dist, execute }) => {
      execute()
      const file = path.join(dist, 'manifest.webmanifest')
      const first = await readFile(file, 'utf8')
      expect(JSON.parse(first).icons).toEqual([
        { src: '/dsh-desktop-logo.png', sizes: '1254x1254', type: 'image/png', purpose: 'any' }, custom
      ])
      expect(await readFile(path.join(dist, 'dsh-desktop-logo.png'), 'utf8')).toBe('test-icon')
      execute()
      expect(await readFile(file, 'utf8')).toBe(first)
    })
  })

  it('rejects unrecognized upstream icons rather than silently leaving mixed branding', async () => {
    await fixture([{ src: 'unknown.svg' }], async ({ execute }) => {
      expect(execute).toThrow('no icon entry to replace')
    })
  })
})
