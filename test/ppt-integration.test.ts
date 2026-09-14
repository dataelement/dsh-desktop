import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { patchPath, projectRoot } from './patch-path'

const artifacts = JSON.parse(await readFile(path.join(projectRoot, 'packages/ppt-runtime/artifacts.json'), 'utf8')) as Record<'core' | 'adapter', { file: string; sha256: string }>

async function artifact(name: keyof typeof artifacts): Promise<Buffer> {
  return readFile(path.join(projectRoot, 'packages', 'ppt-bundles', artifacts[name].file))
}

function tarEntries(archive: Buffer): Map<string, Buffer> {
  const tar = gunzipSync(archive)
  const entries = new Map<string, Buffer>()
  let offset = 0
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512)
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/u, '')
    if (name.length === 0) break
    const prefix = header.subarray(345, 500).toString('utf8').replace(/\0.*$/u, '')
    const sizeText = header.subarray(124, 136).toString('ascii').replace(/\0.*$/u, '').trim()
    const size = Number.parseInt(sizeText || '0', 8)
    const contentOffset = offset + 512
    const fullName = prefix.length === 0 ? name : `${prefix}/${name}`
    entries.set(fullName, tar.subarray(contentOffset, contentOffset + size))
    offset = contentOffset + Math.ceil(size / 512) * 512
  }
  return entries
}

describe('DSH PPT built-in plugin', () => {
  it('pins the reviewed plugin artifacts byte-for-byte', async () => {
    const lock = JSON.parse(await readFile(path.join(projectRoot, 'package-lock.json'), 'utf8')) as {
      packages: Record<string, { integrity?: string }>
    }
    const packagePaths = {
      core: 'node_modules/dsh-ppt',
      adapter: 'node_modules/dsh-ppt-composer'
    } as const

    for (const name of Object.keys(artifacts) as (keyof typeof artifacts)[]) {
      const archive = await artifact(name)
      expect(createHash('sha256').update(archive).digest('hex')).toBe(artifacts[name].sha256)
      expect(lock.packages[packagePaths[name]]?.integrity).toBe(
        `sha512-${createHash('sha512').update(archive).digest('base64')}`
      )
    }
  })

  it('ships one PPT composer surface and excludes the Tencent route', async () => {
    const core = gunzipSync(await artifact('core')).toString('utf8')
    const adapter = gunzipSync(await artifact('adapter')).toString('utf8')
    const excluded = /\b(?:tencent|slidep|editor_sdk)\b|workbuddy[- ]runtime|\bppt_(?:create|render|write_page)\b/iu

    expect(core).toContain('dsh-ppt')
    expect(core).toContain('pptd_render')
    expect(core).toContain('ppt_get_template_reference')
    expect(core).not.toMatch(excluded)
    expect(adapter).toContain('conversation.hero.modeActions')
    expect(adapter).toContain('dsh-ppt')
    expect(adapter).not.toMatch(excluded)
  })

  it('ships every JavaScript chunk imported by the Host entry', async () => {
    const archive = gunzipSync(await artifact('core')).toString('utf8')
    const chunk = /from "\.\/(pptd-[A-Za-z0-9_-]+\.js)"/u.exec(archive)?.[1]

    expect(chunk).toBeDefined()
    expect(archive).toContain(`package/lib/${chunk}`)
  })

  it('exposes geometry-derived text capacity to the PPT authoring workflow', async () => {
    const entries = tarEntries(await artifact('core'))
    const protocol = entries.get('package/lib/types/protocol.d.ts')?.toString('utf8') ?? ''
    const host = entries.get('package/lib/index.js')?.toString('utf8') ?? ''
    const skill = entries.get('package/skills/dsh-ppt/SKILL.md')?.toString('utf8') ?? ''

    expect(host).toContain('ctx.inject(["webServer"]')
    expect(host).toMatch(/"webServer"/)
    expect(protocol).toContain('readonly textCapacity?: number')
    expect(host).toContain('textCapacity: zone.textCapacity ?? geometricTextCapacity(zone, fontSize)')
    expect(skill).toContain('每个文本区的 `textCapacity` 是该区域的最大建议字符数')
  })

  it('blocks overflowing text before rendering and preserves the authored font size', async () => {
    const entries = tarEntries(await artifact('core'))
    const chunkName = [...entries.keys()].find(name => /^package\/lib\/pptd-[A-Za-z0-9_-]+\.js$/u.test(name))
    const renderer = chunkName === undefined ? '' : entries.get(chunkName)?.toString('utf8') ?? ''
    const renderTextStart = renderer.indexOf('function renderText(')
    const renderTextEnd = renderer.indexOf('function solidFill(', renderTextStart)
    const renderText = renderer.slice(renderTextStart, renderTextEnd)

    expect(renderer).toContain('code: "text-overflow"')
    expect(renderer).toContain('severity: "error"')
    expect(renderer).toContain('请缩短文案、增大文本框或拆分页面')
    expect(renderTextStart).toBeGreaterThan(-1)
    expect(renderTextEnd).toBeGreaterThan(renderTextStart)
    expect(renderText).not.toContain('fit: "shrink"')
  })

  it('ships sixteen maintained templates, English previews and Chinese sources', async () => {
    const entries = tarEntries(await artifact('core'))
    const designs = [...entries.keys()].filter(name => /^package\/skills\/dsh-ppt\/references\/[^/]+\/[^/]+\/design\.md$/u.test(name))
    const expected = [
      ['work/curated-modular-logistics-system', 12],
      ['consulting/curated-swiss-signal-grid', 12],
      ['work/curated-nordic-operating-report', 12],
      ['work/dsh-engineering-blueprint', 12],
      ['academic/dsh-course-workshop', 12],
      ['editorial/dsh-editorial-notebook', 12],
      ...[["editorial/dsh-soft-editorial", 12], ["work/dsh-editorial-forest", 12], ["consulting/dsh-signal", 12], ["business/dsh-blue-professional", 12], ["promotion/dsh-broadside", 12], ["academic/dsh-monochrome", 12], ["business/dsh-neo-grid-bold", 12], ["promotion/dsh-sakura-chroma", 12], ["promotion/dsh-playful", 12], ["consulting/dsh-cartesian", 12]]
    ] as const
    expect(designs).toHaveLength(expected.length)
    for (const [directory, count] of expected) {
      const root = `package/skills/dsh-ppt/references/${directory}`
      expect(designs).toContain(`${root}/design.md`)
      expect(entries.has(`${root}/source/deck.pptd`)).toBe(true)
      expect(entries.has(`${root}/source-zh/deck.pptd`)).toBe(true)
      expect([...entries.keys()].filter(name => name.startsWith(`${root}/source/pages/`) && name.endsWith('.page'))).toHaveLength(count)
      expect([...entries.keys()].filter(name => name.startsWith(`${root}/pages/`) && name.endsWith('.jpg'))).toHaveLength(count)
    }
    expect(entries.has('package/licenses/html-anything/LICENSE')).toBe(true)
    expect(entries.get('package/licenses/zara/LICENSE')?.toString()).toContain('Copyright (c) 2026 Zara Zhang')
    expect(entries.has('package/licenses/html-anything/deck-blueprint.md')).toBe(true)
    expect(entries.get('package/THIRD_PARTY_NOTICES.md')?.toString()).toContain('Apache-2.0')
  })

  it('excludes withdrawn bytes and shares build-listed local preview assets without embedded copies', async () => {
    const excluded = JSON.parse(await readFile(path.join(projectRoot, 'packages/ppt-runtime/excluded-assets.json'), 'utf8')) as { file: string; sha256: string }[]
    const denied = new Set(excluded.map(item => item.sha256))
    const core = tarEntries(await artifact('core'))
    const allowed = new Set([...core].filter(([name]) => name.endsWith('.jpg')).map(([, bytes]) => createHash('sha256').update(bytes).digest('hex')))
    expect(allowed.size).toBe(192)
    const manifestSource = core.get('package/lib/preview-manifest.js')!.toString()
    const manifest = JSON.parse(/export const previewFiles = (.*);/u.exec(manifestSource)![1]!) as Record<string, string>
    expect(Object.keys(manifest)).toHaveLength(192)
    for (const [hash, relative] of Object.entries(manifest)) {
      const image = core.get(`package/skills/dsh-ppt/references/${relative}`)!
      expect(createHash('sha256').update(image).digest('hex')).toBe(hash)
    }
    expect(core.get('package/lib/index.js')!.toString()).toContain('registerPreviewAssets(ctx, previewFiles')
    for (const name of ['core', 'adapter'] as const) {
      const entries = tarEntries(await artifact(name))
      for (const [file, bytes] of entries) {
        expect(denied.has(createHash('sha256').update(bytes).digest('hex')), file).toBe(false)
        expect(excluded.some(item => file === `package/${item.file}`), file).toBe(false)
      }
      const client = entries.get('package/lib/client.js')!.toString()
      expect(client).not.toContain('data:image/jpeg;base64,')
      expect(Buffer.byteLength(client)).toBeLessThan(100_000)
      const urls = [...client.matchAll(/\/dsh-ppt\/previews\/([a-f0-9]{64})\.jpg/gu)]
      expect(urls).toHaveLength(192)
      for (const url of urls) expect(allowed.has(url[1]!)).toBe(true)
      if (name === 'adapter') expect([...entries.keys()].some(file => file.endsWith('.jpg'))).toBe(false)
    }
  })

  it('places the PPT action beside the agent preset and the catalog below the input', async () => {
    const client = await readFile(path.join(
      projectRoot,
      'node_modules',
      '@deepseek-ai',
      'dsh-client-ui-conversation',
      'lib',
      'client.js'
    ), 'utf8')
    const cluster = client.indexOf('className: ConversationRoot_module_css_default.heroModeCluster')
    const agentPreset = client.indexOf('renderSlot("conversation.hero.agentPreset", {})', cluster)
    const modeActions = client.indexOf(
      'zone !== void 0 && renderSlot("conversation.hero.modeActions", zone)',
      agentPreset
    )
    const owner = client.indexOf('extensionZone: zone')
    const input = client.indexOf('className: clsx(InputBar_module_css_default.card', owner)
    const catalog = client.indexOf(
      'extensionZone !== void 0 ? renderSlot("conversation.composer.dock", extensionZone) : null',
      input
    )

    expect(cluster).toBeGreaterThan(-1)
    expect(modeActions).toBeGreaterThan(agentPreset)
    expect(owner).toBeGreaterThan(-1)
    expect(input).toBeGreaterThan(owner)
    expect(catalog).toBeGreaterThan(input)
  })

  it('integrates hero mode actions with the adjacent agent-preset control style', async () => {
    const patch = await readFile(patchPath('@deepseek-ai/dsh-client-ui-conversation'), 'utf8')

    expect(patch).toContain(
      '[data-slot=conversation\\\\.hero\\\\.agentPreset]>span{width:max-content!important;min-width:0!important',
    )
    // The CSS-module hash is regenerated by every upstream build, so match the
    // desktop rules by class name rather than by the prefix of the day.
    expect(patch).toMatch(/\.[A-Za-z0-9_-]+_heroModeCluster\{width:max-content/)
    expect(patch).not.toMatch(/\.[A-Za-z0-9_-]+_heroModeCluster\{margin-left:auto/)
    expect(patch).toMatch(/\.[A-Za-z0-9_-]+_heroModeCluster button\{/)
    expect(patch).toContain('height:28px')
    expect(patch).toContain('border:0!important')
    expect(patch).toContain('color:var(--dsw-alias-label-primary)!important')
    expect(patch).toContain('button[data-selected=true]')
    expect(patch).toContain('var(--dsw-alias-state-business-primary) 10%')
    expect(patch).toContain('button:focus-visible')
  })

  it('renders the selected template before editable prompt text', async () => {
    const client = await readFile(path.join(
      projectRoot,
      'node_modules',
      '@deepseek-ai',
      'dsh-client-ui-conversation',
      'lib',
      'client.js'
    ), 'utf8')
    const promptRow = client.indexOf('className: InputBar_module_css_default.promptRow')
    const accessory = client.indexOf('className: InputBar_module_css_default.accessory', promptRow)
    const scroll = client.indexOf('ref: scrollRef', promptRow)

    expect(promptRow).toBeGreaterThan(-1)
    expect(accessory).toBeGreaterThan(promptRow)
    expect(scroll).toBeGreaterThan(accessory)
    expect(client).toContain('children: accessory ?? renderSlot("conversation.input.accessory", extensionZone)')
  })

  it('declares both local artifacts and mounts only the PPT composer', async () => {
    const manifest = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>
    }
    const profilePatch = await readFile(path.join(projectRoot, 'build', 'dsh-desktop.patch.yml'), 'utf8')

    expect(manifest.dependencies['dsh-ppt']).toBe(
      `file:packages/ppt-bundles/${artifacts.core.file}`
    )
    expect(manifest.dependencies['dsh-ppt-composer']).toBe(
      `file:packages/ppt-bundles/${artifacts.adapter.file}`
    )
    expect(profilePatch).toContain("name: 'dsh-ppt-composer'")
    expect(profilePatch).not.toContain('office-ppt-standard-adapter')
    expect(profilePatch).not.toContain('name: dsh-ppt')
    expect(profilePatch).not.toContain('workbuddy')
  })
})
