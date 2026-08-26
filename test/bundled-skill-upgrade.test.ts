import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { synchronizeBundledESkillOverrides } from '../src/main/bundled-skill-sync'

const scratchDirectories: string[] = []

function scratchDirectory(): string {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'sherlock-skill-sync-'))
  scratchDirectories.push(directory)
  return directory
}

function writeSkill(
  root: string,
  version: string,
  body: string,
  source = 'eSkill'
): string {
  const skillDirectory = path.join(root, 'efund-ppt-maker')
  mkdirSync(skillDirectory, { recursive: true })
  writeFileSync(
    path.join(skillDirectory, '_meta.json'),
    `${JSON.stringify({
      slug: 'efund-ppt-maker',
      cnName: 'PPT制作助手',
      version,
      source
    })}\n`,
    'utf8'
  )
  writeFileSync(
    path.join(skillDirectory, 'SKILL.md'),
    `---\nname: efund-ppt-maker\ndescription: PowerPoint maker\n---\n\n${body}\n`,
    'utf8'
  )
  return skillDirectory
}

afterEach(() => {
  for (const directory of scratchDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('bundled eSkill synchronization', () => {
  it('backs up and replaces an older official user skill before Harness discovery', () => {
    const root = scratchDirectory()
    const bundledRoot = path.join(root, 'bundled')
    const userRoot = path.join(root, 'user-agents')
    writeSkill(bundledRoot, 'v1.0.6', 'bundled-v1.0.6')
    const userSkill = writeSkill(userRoot, 'v1.0.5', 'user-v1.0.5')

    const result = synchronizeBundledESkillOverrides({
      bundledSkillDirectory: bundledRoot,
      overrideSkillDirectories: [userRoot],
      now: new Date('2026-08-26T04:00:00.000Z')
    })

    expect(result.upgraded).toHaveLength(1)
    expect(result.upgraded[0]).toMatchObject({
      slug: 'efund-ppt-maker',
      fromVersion: 'v1.0.5',
      toVersion: 'v1.0.6',
      targetDirectory: userSkill
    })
    expect(readFileSync(path.join(userSkill, '_meta.json'), 'utf8')).toContain('"v1.0.6"')
    expect(readFileSync(path.join(userSkill, 'SKILL.md'), 'utf8')).toContain(
      'bundled-v1.0.6'
    )
    expect(
      readFileSync(path.join(result.upgraded[0]!.backupDirectory, 'SKILL.md'), 'utf8')
    ).toContain('user-v1.0.5')
  })

  it('preserves a user-authored skill with the same name', () => {
    const root = scratchDirectory()
    const bundledRoot = path.join(root, 'bundled')
    const userRoot = path.join(root, 'user-agents')
    writeSkill(bundledRoot, 'v1.0.6', 'bundled-v1.0.6')
    const userSkill = writeSkill(userRoot, 'v9.9.9', 'custom-content', 'user')

    const result = synchronizeBundledESkillOverrides({
      bundledSkillDirectory: bundledRoot,
      overrideSkillDirectories: [userRoot]
    })

    expect(result.upgraded).toEqual([])
    expect(readFileSync(path.join(userSkill, 'SKILL.md'), 'utf8')).toContain('custom-content')
  })

  it('repairs an official same-version copy when its content differs from the bundle', () => {
    const root = scratchDirectory()
    const bundledRoot = path.join(root, 'bundled')
    const userRoot = path.join(root, 'user-agents')
    writeSkill(bundledRoot, 'v1.0.6', 'bundled-current-content')
    const userSkill = writeSkill(userRoot, 'v1.0.6', 'stale-same-version-content')

    const result = synchronizeBundledESkillOverrides({
      bundledSkillDirectory: bundledRoot,
      overrideSkillDirectories: [userRoot],
      now: new Date('2026-08-26T04:00:00.000Z')
    })

    expect(result.upgraded).toHaveLength(1)
    expect(readFileSync(path.join(userSkill, 'SKILL.md'), 'utf8')).toContain(
      'bundled-current-content'
    )
  })
})
