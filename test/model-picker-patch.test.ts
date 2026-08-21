import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { hasPatch, patchPath, projectRoot } from './patch-path'

const settingsModelsClient = path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh-client-ui-settings-models',
  'lib',
  'client.js'
)

/**
 * Harness took the select-all toggle upstream in 0.1.0-rc.8, so the desktop
 * patch no longer carries it. Assert against the composed package instead: the
 * behavior still has to be there, and the patch still has to stay out of it.
 */
describe('DSH Desktop available-model picker', () => {
  it('ships one state-driven select-all toggle', async () => {
    const client = await readFile(settingsModelsClient, 'utf8')

    expect(client).toContain('const allCandidatesPicked =')
    expect(client).toContain('activeCandidates.every((candidate) => picked.has(candidate.id))')
    expect(client).toContain(
      'children: t(allCandidatesPicked ? "fetchDeselectAll" : "fetchSelectAll")'
    )
    expect(client).toContain('const toggleAllCandidates =')
  })

  it('includes English and Chinese copy for both toggle states', async () => {
    const client = await readFile(settingsModelsClient, 'utf8')

    expect(client).toContain('fetchSelectAll: "Select all"')
    expect(client).toContain('fetchDeselectAll: "Deselect all"')
    expect(client).toContain('fetchSelectAll: "全选"')
    expect(client).toContain('fetchDeselectAll: "取消全选"')
  })

  it('leaves the toggle to Harness rather than re-patching it', async () => {
    expect(hasPatch('@deepseek-ai/dsh-client-ui-settings-models')).toBe(true)
    const patch = await readFile(
      patchPath('@deepseek-ai/dsh-client-ui-settings-models'),
      'utf8'
    )

    expect(patch).not.toContain('const allCandidatesPicked =')
    expect(patch).not.toContain('fetchSelectAll: "Select all"')
  })
})

describe('DSH Desktop model image-input declarations', () => {
  it('renders one shared per-model control for both adapter field names', async () => {
    const client = await readFile(settingsModelsClient, 'utf8')

    expect(client).toContain('function ModelImageInputToggle(props)')
    expect(client).toContain('field: "inputModalities"')
    expect(client).toContain('field: "input"')
    expect(client.match(/compact: true/g)).toHaveLength(2)
    expect(client).toContain('dshModelModalityToggleCompact')
    expect(client).toContain(
      '"data-tooltip": props.compact ? `${props.t("modelImageInput")}: ${props.t("modelImageInputHint")}`'
    )
    expect(client).toContain('.dshModelModalityToggleCompact:hover:after')
    expect(client).toContain('.dshModelModalityToggleCompact:focus-within:after')
    expect(client).toContain(
      'children: props.t(props.compact ? "modelImageInputShort" : "modelImageInput")'
    )
    expect(client).toContain('return enabled ? ["text", "image"] : ["text"]')
  })

  it('ships localized capability copy and an endpoint warning', async () => {
    const client = await readFile(settingsModelsClient, 'utf8')

    expect(client).toContain('modelImageInput: "Image input"')
    expect(client).toContain('modelImageInputShort: "Vision"')
    expect(client).toContain('the endpoint must support them')
    expect(client).toContain('modelImageInput: "支持图片输入"')
    expect(client).toContain('modelImageInputShort: "视觉"')
    expect(client).toContain('请确认接口实际支持')
  })

  it('captures the image-input control in the reproducible dependency patch', async () => {
    const patch = await readFile(
      patchPath('@deepseek-ai/dsh-client-ui-settings-models'),
      'utf8'
    )

    expect(patch).toContain('ModelImageInputToggle')
    expect(patch).toContain('field: "inputModalities"')
    expect(patch).toContain('field: "input"')
  })
})
