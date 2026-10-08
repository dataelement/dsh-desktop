import { createHash } from 'node:crypto'
import { lstat, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { patchPath, projectRoot } from './patch-path'

type PackageName = 'core' | 'adapter'
const packageNames: Record<PackageName, string> = { core: 'dsh-ppt', adapter: 'dsh-ppt-composer' }

async function artifact(name: PackageName): Promise<Map<string, Buffer>> {
  const root = path.join(projectRoot, '.build', 'ppt-runtime', 'packages', packageNames[name])
  const entries = new Map<string, Buffer>()
  async function visit(directory: string, relative = ''): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const child = path.join(directory, entry.name)
      const childRelative = path.posix.join(relative, entry.name)
      if (entry.isDirectory()) await visit(child, childRelative)
      else if (entry.isFile()) entries.set(`package/${childRelative}`, await readFile(child))
    }
  }
  await visit(root)
  return entries
}

function artifactText(entries: Map<string, Buffer>): string {
  return Buffer.concat([...entries.values()]).toString('utf8')
}

describe('DSH PPT built-in plugin', () => {
  it('builds local source packages into staged and installed distributions', async () => {
    const lock = JSON.parse(await readFile(path.join(projectRoot, 'package-lock.json'), 'utf8')) as {
      packages: Record<string, { resolved?: string; link?: boolean }>
    }
    const sources: Record<PackageName, string> = {
      core: 'packages/ppt-runtime/core',
      adapter: 'packages/ppt-runtime/adapter'
    }

    for (const name of Object.keys(packageNames) as PackageName[]) {
      const packageName = packageNames[name]
      expect(lock.packages[`node_modules/${packageName}`]).toMatchObject({
        resolved: sources[name], link: true
      })
      expect((await lstat(path.join(projectRoot, 'node_modules', packageName))).isSymbolicLink()).toBe(false)
      const staged = await artifact(name)
      expect(await readFile(path.join(projectRoot, 'node_modules', packageName, 'lib/client.js'))).toEqual(
        staged.get('package/lib/client.js')
      )
    }
  })

  it('injects personal-template UI into both clients without bundling checkout dependencies', async () => {
    for (const name of ['core', 'adapter'] as const) {
      const entries = await artifact(name)
      expect([...entries.keys()].some(file => file.startsWith('package/node_modules/'))).toBe(false)
      const client = entries.get('package/lib/client.js')?.toString('utf8') ?? ''
      expect(client).toContain('function PersonalTemplateManager(')
      expect(client).not.toContain('/* PERSONAL_TEMPLATE_MANAGER */')
    }
  })

  it('ships Harness 0.2.0-compatible peer ranges in both generated packages', async () => {
    const expected = '^0.1.5-rc.1 || ^0.1.6-alpha.2 || ^0.1.7-rc.1 || ^0.1.7-rc.2 || ^0.2.0-rc.1'
    const core = JSON.parse((await artifact('core')).get('package/package.json')!.toString('utf8'))
    const adapter = JSON.parse((await artifact('adapter')).get('package/package.json')!.toString('utf8'))
    expect(core.peerDependencies['@deepseek-ai/cordis']).toBe('~4.0.4')
    expect(adapter.peerDependencies['@deepseek-ai/cordis']).toBe('~4.0.4')

    for (const [name, range] of Object.entries(core.peerDependencies as Record<string, string>)) {
      if (name.startsWith('@deepseek-ai/dsh-')) expect(range).toBe(expected)
    }
    expect(adapter.peerDependencies['@deepseek-ai/dsh-invariants']).toBe(expected)
  })

  it('ships one PPT composer surface and excludes the Tencent route', async () => {
    const core = artifactText(await artifact('core'))
    const adapter = artifactText(await artifact('adapter'))
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
    const entries = await artifact('core')
    const host = entries.get('package/lib/index.js')?.toString('utf8') ?? ''
    const chunk = /from "\.\/(pptd-[A-Za-z0-9_-]+\.js)"/u.exec(host)?.[1]

    expect(chunk).toBeDefined()
    expect(entries.has(`package/lib/${chunk}`)).toBe(true)
  })

  it('exposes geometry-derived text capacity to the PPT authoring workflow', async () => {
    const entries = await artifact('core')
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
    const entries = await artifact('core')
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
    const entries = await artifact('core')
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
    const core = await artifact('core')
    const referenceImages = [...core].filter(([name]) => name.startsWith('package/skills/dsh-ppt/references/') && name.endsWith('.jpg'))
    const allowed = new Set(referenceImages.map(([, bytes]) => createHash('sha256').update(bytes).digest('hex')))
    expect(allowed.size).toBe(192)
    expect([...core.keys()].filter(name => name.startsWith('package/lib/bundled-template-projects/'))).toHaveLength(0)
    expect([...core.keys()].join('\n')).not.toContain('dsh-green-pulse')
    expect(core.get('package/skills/dsh-ppt/SKILL.md')!.toString()).toContain('DSH-PPT-AUTHORING-20260910-V4')
    expect(core.get('package/skills/dsh-ppt/SKILL.md')!.toString()).toContain('选用个人模板时')
    expect(core.get('package/skills/dsh-ppt/SKILL.md')!.toString()).not.toContain('带可编辑工程的内置模板')
    const manifestSource = core.get('package/lib/preview-manifest.js')!.toString()
    const manifest = JSON.parse(/export const previewFiles = (.*);/u.exec(manifestSource)![1]!) as Record<string, string>
    expect(Object.keys(manifest)).toHaveLength(192)
    for (const [hash, relative] of Object.entries(manifest)) {
      const image = core.get(`package/skills/dsh-ppt/references/${relative}`)!
      expect(createHash('sha256').update(image).digest('hex')).toBe(hash)
    }
    expect(core.get('package/lib/index.js')!.toString()).toContain('registerPreviewAssets(ctx, previewFiles')
    for (const name of ['core', 'adapter'] as const) {
      const entries = await artifact(name)
      for (const [file, bytes] of entries) {
        expect(denied.has(createHash('sha256').update(bytes).digest('hex')), file).toBe(false)
        expect(excluded.some(item => file === `package/${item.file}`), file).toBe(false)
      }
      const client = entries.get('package/lib/client.js')!.toString()
      expect(client).not.toContain('data:image/jpeg;base64,')
      expect(Buffer.byteLength(client)).toBeLessThan(120_000)
      const urls = [...client.matchAll(/\/dsh-ppt\/previews\/([a-f0-9]{64})\.jpg/gu)]
      expect(urls).toHaveLength(192)
      for (const url of urls) expect(allowed.has(url[1]!)).toBe(true)
      if (name === 'adapter') expect([...entries.keys()].some(file => file.endsWith('.jpg'))).toBe(false)
    }
  })

  it('keeps hero mode actions available while requiring a session for the shared composer dock', async () => {
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
      'renderSlot("conversation.hero.modeActions", zone ?? {})',
      agentPreset
    )
    const owner = client.indexOf('extensionZone: zone')
    const input = client.indexOf('className: clsx(InputBar_module_css_default.card', owner)
    const catalog = client.indexOf(
      'input !== void 0 && sessionId !== void 0 ? renderSlot("conversation.composer.dock", extensionZone ?? {}) : null',
      input
    )
    const modeScope = client.slice(client.indexOf('"conversation.hero.modeActions": {'), client.indexOf('"conversation.hero.modeActions": {') + 180)
    const dockScope = client.slice(client.indexOf('"conversation.composer.dock": {'), client.indexOf('"conversation.composer.dock": {') + 160)

    expect(cluster).toBeGreaterThan(-1)
    expect(modeActions).toBeGreaterThan(agentPreset)
    expect(owner).toBeGreaterThan(-1)
    expect(input).toBeGreaterThan(owner)
    expect(catalog).toBeGreaterThan(input)
    expect(modeScope).toContain('scope: "session-maybe"')
    expect(dockScope).toContain('scope: "session"')
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

  it('keeps the PPT slot kind and scope aligned with their published types', async () => {
    const root = path.join(projectRoot, 'node_modules', '@deepseek-ai', 'dsh-client-ui-conversation', 'lib')
    const runtime = await readFile(path.join(root, 'client.js'), 'utf8')
    const types = await readFile(path.join(root, 'types/client/contract/slots.d.ts'), 'utf8')
    for (const [name, scope] of [
      ['conversation.hero.modeActions', 'session-maybe'],
      ['conversation.hero.dock', 'session-maybe'],
      ['conversation.input.accessory', 'session'],
      ['conversation.composer.dock', 'session']
    ] as const) {
      const escaped = name.replaceAll('.', '\\.')
      expect(runtime).toMatch(new RegExp(`"${escaped}": \\{\\s*kind: "list",\\s*scope: "${scope}"`))
      expect(types).toMatch(new RegExp(`'${escaped}': \\{\\s*kind: 'list';\\s*scope: '${scope}'`))
    }
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
    const editor = client.indexOf('(0, react_jsx_runtime.jsx)(DraftEditor, {', promptRow)

    expect(promptRow).toBeGreaterThan(-1)
    expect(accessory).toBeGreaterThan(promptRow)
    expect(editor).toBeGreaterThan(accessory)
    expect(client).toContain('children: accessory ?? (sessionId === void 0 ? null : renderSlot("conversation.input.accessory", extensionZone))')
  })

  it('declares both local source packages and mounts only the PPT composer', async () => {
    const manifest = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>
    }
    const profilePatch = await readFile(path.join(projectRoot, 'build', 'dsh-desktop.patch.yml'), 'utf8')

    expect(manifest.dependencies['dsh-ppt']).toBe('file:packages/ppt-runtime/core')
    expect(manifest.dependencies['dsh-ppt-composer']).toBe('file:packages/ppt-runtime/adapter')
    expect(profilePatch).toContain("name: 'dsh-ppt-composer'")
    expect(profilePatch).not.toContain('office-ppt-standard-adapter')
    expect(profilePatch).not.toContain('name: dsh-ppt')
    expect(profilePatch).not.toContain('workbuddy')
  })
})

function sourceSlice(source: string, start: string, end: string): string {
  const from = source.indexOf(start)
  const to = source.indexOf(end, from)
  if (from < 0 || to < 0) throw new Error(`missing ${start}`)
  return source.slice(from, to)
}

describe('opening PPT template card', () => {
  it('keeps the footer on the first loaded user message and its send echo', async () => {
    const chat = await readFile(path.join(projectRoot, 'node_modules', '@deepseek-ai', 'dsh-client-ui-chat', 'lib', 'client.js'), 'utf8')
    const openingUserMessageTarget = new Function(`${sourceSlice(chat, 'function openingUserMessageTarget', 'function observedInputs')}\nreturn openingUserMessageTarget;`)() as (
      hasMore: boolean,
      order: readonly string[],
      kindAt: (key: string) => string | undefined,
      pendingInputs: readonly { requestId?: string; placement?: string }[]
    ) => { leadingUserKey: string | null; leadingPendingId: string | null }
    const kindAt = (key: string) => ({ a: 'context', b: 'user', c: 'user' })[key]

    expect(openingUserMessageTarget(true, ['b'], kindAt, [])).toEqual({ leadingUserKey: null, leadingPendingId: null })
    expect(openingUserMessageTarget(false, ['a', 'b', 'c'], kindAt, [{ requestId: 'echo', placement: 'transcript' }])).toEqual({
      leadingUserKey: 'b',
      leadingPendingId: null
    })
    expect(openingUserMessageTarget(false, ['a'], kindAt, [
      { id: 'steer' } as { requestId?: string },
      { requestId: 'echo', placement: 'transcript' }
    ])).toEqual({ leadingUserKey: null, leadingPendingId: 'echo' })
    expect(openingUserMessageTarget(false, [], () => undefined, [{ requestId: 'steer', placement: 'steering' }])).toEqual({
      leadingUserKey: null,
      leadingPendingId: null
    })
    expect(chat).toContain('renderSlot("conversation.chat.userMessageFooter", { leading: true })')
    expect(chat).toContain('footer: item.requestId === leadingPendingId ? messageFooter : null')
    expect(chat).toContain('const showBubble = hasBody || footer != null')
    expect(chat).toContain('i)), footer]')
    expect(chat).toMatch(/"conversation\.chat\.userMessageFooter": \{\s*kind: "list",\s*scope: "session"/)
  })

  it('publishes the footer slot and restores the persisted template into a preview card', async () => {
    const types = await readFile(path.join(projectRoot, 'node_modules', '@deepseek-ai', 'dsh-client-ui-chat', 'lib', 'types', 'client', 'contract', 'slots.d.ts'), 'utf8')
    const adapter = await readFile(path.join(projectRoot, 'packages', 'ppt-runtime', 'adapter', 'lib', 'client.js'), 'utf8')
    const card = sourceSlice(adapter, 'function OfficePptOpeningTemplateCard', 'function OfficePptStandardInputAccessory')

    expect(types).toMatch(/'conversation\.chat\.userMessageFooter': \{\s*kind: 'list';\s*scope: 'session';/)
    expect(adapter).toContain('name: "conversation.chat.userMessageFooter"')
    expect(card).toContain('loadTemplateState')
    expect(card).toContain('applyLoadedTemplates')
    expect(card).toContain('showModal()')
    expect(card).toContain('data-ppt-opening-template')
    expect(card).toContain('className: "dsh-ppt-opening-title"')
    expect(card).toContain('OpeningPptFileIcon')
    expect(adapter).toContain('dsh-ppt-opening-file{flex:none;color:var(--dsw-static-amber-500)}')
    expect(adapter).toContain('dsh-ppt-opening-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:0;background:transparent;padding:0;color:color-mix(in srgb,var(--dsw-alias-state-business-primary) 68%,var(--dsw-alias-label-primary));font:inherit;font-size:13px;line-height:20px;text-align:left;text-decoration:none;cursor:pointer}')
    expect(adapter).not.toContain('text-decoration:underline')
    expect(card).not.toContain('dsh-ppt-opening-card')
    expect(card).not.toContain('template/select')
    expect(card).not.toContain('template/deselect')
    expect(card).not.toContain('session.blank')
    expect(adapter).toContain('"opening.preview": "预览模板 {name}"')
    expect(adapter).toContain('"opening.preview": "Preview template {name}"')
    expect(adapter).toContain('"opening.close": "关闭预览"')
    expect(adapter).toContain('"opening.close": "Close preview"')
  })
})
