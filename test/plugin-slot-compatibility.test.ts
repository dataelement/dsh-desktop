import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

const SHIM_FRAGMENT =
  'n.name==="settings.plugin.item"&&u.kind==="keyed"&&n.key===void 0&&n.id!==void 0&&(n={...n,key:n.id})'

const FRONTEND_DIST = path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh-web-frontend',
  'dist'
)

describe('legacy plugin settings slot compatibility', () => {
  it('runs the postinstall shim and ships the new step in package.json', async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(projectRoot, 'package.json'), 'utf8')
    ) as { scripts: { postinstall: string } }
    const installer = await readFile(
      path.join(projectRoot, 'scripts', 'install-plugin-compatibility.mjs'),
      'utf8'
    )

    expect(packageJson.scripts.postinstall).toContain(
      'node scripts/install-plugin-compatibility.mjs'
    )
    expect(installer).toContain(
      'const u=l.spec;n.name==="settings.plugin.item"&&u.kind==="keyed"&&n.key===void 0&&n.id!==void 0&&(n={...n,key:n.id});const c=n.priority??0'
    )
    expect(installer).toContain('const u=l.spec,c=n.priority??0')
  })

  it('patches the SlotCore bundle actually served by the desktop app', async () => {
    const indexHtml = await readFile(path.join(FRONTEND_DIST, 'index.html'), 'utf8')
    const asset = indexHtml.match(/src="\/(assets\/index-[^"]+\.js)"/)?.[1]
    expect(asset).toBeDefined()

    const servedAsset = await readFile(path.join(FRONTEND_DIST, asset ?? ''), 'utf8')
    expect(servedAsset).toContain(SHIM_FRAGMENT)
    expect(servedAsset).not.toContain('const u=l.spec,c=n.priority??0')
  })
})
