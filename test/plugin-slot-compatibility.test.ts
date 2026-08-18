import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { SlotCore } from '@deepseek-ai/dsh-client-ui-slots'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

type RuntimeRegister = (
  options: Record<string, unknown>,
  component: () => null
) => () => void

function keyedSlotCore(name = 'settings.plugin.item'): {
  core: SlotCore
  register: RuntimeRegister
} {
  const core = new SlotCore()
  const register = core.register.bind(core) as unknown as RuntimeRegister
  register(
    {
      name: 'root',
      children: { [name]: { kind: 'keyed', scope: 'root' } }
    },
    () => null
  )
  return { core, register }
}

describe('legacy plugin settings slot compatibility', () => {
  it('uses an rc.6 list id as the rc.7 key and preserves disposal', () => {
    const { core, register } = keyedSlotCore()

    const dispose = register(
      { name: 'settings.plugin.item', id: 'github', order: 30 },
      () => null
    )

    expect(core.entriesOfSlot('settings.plugin.item')).toHaveLength(1)
    expect(core.entriesOfSlot('settings.plugin.item')[0]?.options).toMatchObject({
      id: 'github',
      key: 'github',
      order: 30
    })

    dispose()
    expect(core.entriesOfSlot('settings.plugin.item')).toHaveLength(0)
  })

  it('keeps explicit rc.7 keys authoritative and rejects collisions', () => {
    const { core, register } = keyedSlotCore()

    register(
      { name: 'settings.plugin.item', id: 'legacy-id', key: 'explicit-key' },
      () => null
    )

    expect(core.entriesOfSlot('settings.plugin.item')[0]?.options.key).toBe(
      'explicit-key'
    )
    expect(() =>
      register({ name: 'settings.plugin.item', key: 'explicit-key' }, () => null)
    ).toThrow('already has an entry for key "explicit-key"')
  })

  it('does not relax keyed registration for unrelated slots', () => {
    const { register } = keyedSlotCore('unrelated.keyed')

    expect(() =>
      register({ name: 'unrelated.keyed', id: 'legacy-id' }, () => null)
    ).toThrow('keyed slot "unrelated.keyed" requires options.key')
  })

  it('ships the matching legacy dispatch patch for the settings controller', async () => {
    const settingsPatch = await readFile(
      path.join(
        projectRoot,
        'patches',
        '@deepseek-ai+dsh-client-ui-settings-plugins+0.1.0-rc.7.patch'
      ),
      'utf8'
    )

    expect(settingsPatch).toContain(
      'entry.options.id === entry.options.key || served.has(entry.options.key)'
    )
  })

  it('patches the SlotCore bundle actually served by the desktop app', async () => {
    const indexHtml = await readFile(
      path.join(
        projectRoot,
        'node_modules',
        '@deepseek-ai',
        'dsh-web-frontend',
        'dist',
        'index.html'
      ),
      'utf8'
    )
    const asset = indexHtml.match(/src="\/(assets\/index-[^"]+\.js)"/)?.[1]
    expect(asset).toBeDefined()

    const compatibilityInstaller = await readFile(
      path.join(
        projectRoot,
        'scripts',
        'install-plugin-compatibility.mjs'
      ),
      'utf8'
    )
    const packageJson = JSON.parse(
      await readFile(path.join(projectRoot, 'package.json'), 'utf8')
    ) as { scripts: { postinstall: string } }

    expect(compatibilityInstaller).toContain(
      'r.name==="settings.plugin.item"&&u.kind==="keyed"&&r.key===void 0&&r.id!==void 0&&(r={...r,key:r.id})'
    )
    expect(packageJson.scripts.postinstall).toContain(
      'node scripts/install-plugin-compatibility.mjs'
    )

    const servedAsset = await readFile(
      path.join(
        projectRoot,
        'node_modules',
        '@deepseek-ai',
        'dsh-web-frontend',
        'dist',
        asset ?? ''
      ),
      'utf8'
    )
    expect(servedAsset).toContain(
      'r.name==="settings.plugin.item"&&u.kind==="keyed"&&r.key===void 0&&r.id!==void 0&&(r={...r,key:r.id})'
    )
  })
})
