// Regenerates the workbench development guide from the two documents it is a
// copy of. The guide has two derived copies, and both are generated here so the
// public documentation cannot drift from the version the application ships:
//
//   packages/dsh-desktop-workbenches/development-guide.zh.md   bundled, served
//                                                             by the plugin API
//   workbench/skills/workbench-development/SKILL.md           published on the
//                                                             website
//
// The published copy lives in the homepage repository, so pass its path when
// that checkout is available.
//
//   node scripts/build-workbench-guide.mjs                    rewrite the bundle
//   node scripts/build-workbench-guide.mjs --check            fail if it drifted
//   node scripts/build-workbench-guide.mjs --skill <path>     rewrite the published copy
//   node scripts/build-workbench-guide.mjs --skill-check <path>

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

export const GUIDE_TARGET = 'packages/dsh-desktop-workbenches/development-guide.zh.md'
export const GUIDE_SOURCES = {
  standard: 'docs/workbench-standard.zh.md',
  implementation: 'docs/workbenches.md'
}

// The published copy is an Agent Skill, so it carries the frontmatter that the
// Agent host reads. The bundled copy is plain Markdown for the plugin API.
export const SKILL_FRONTMATTER = `---
name: workbench-development
description: Develop, validate, install, and prepare a DSH Desktop workbench for market submission. Use when a user asks to build a DSH Desktop workbench, turn a business workflow into a workbench, or submit a workbench to the DSH workbench market.
---

`

const GUIDE_HEADER = `# DSH Desktop 工作台开发指南

本文随 DSH Desktop 分发，也发布在独立的工作台市场栏目，供任意 Agent 直接读取。

`

const GUIDE_BETWEEN = `

---

# 实现与交付说明

`

const withTrailingNewline = text => (text.endsWith('\n') ? text : `${text}\n`)

export function renderGuide({ standard, implementation }) {
  return `${GUIDE_HEADER}${withTrailingNewline(standard)}${GUIDE_BETWEEN}${withTrailingNewline(implementation)}`
}

export function readGuideSources(readFile = path => readFileSync(join(root, path), 'utf8')) {
  return { standard: readFile(GUIDE_SOURCES.standard), implementation: readFile(GUIDE_SOURCES.implementation) }
}

export function renderGuideFromSources(readFile) {
  return renderGuide(readGuideSources(readFile))
}

export function renderSkillFromSources(readFile) {
  return `${SKILL_FRONTMATTER}${renderGuideFromSources(readFile)}`
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2)
  const target = join(root, GUIDE_TARGET)
  const skillIndex = argv.findIndex(value => value === '--skill' || value === '--skill-check')
  const skillPath = skillIndex === -1 ? null : argv[skillIndex + 1]
  if (skillIndex !== -1 && !skillPath) {
    console.error('--skill requires the path of the published SKILL.md')
    process.exit(2)
  }

  const check = argv.includes('--check') || argv.includes('--skill-check')
  const rendered = skillPath ? renderSkillFromSources() : renderGuideFromSources()
  const destination = skillPath ?? target
  const label = skillPath ?? GUIDE_TARGET
  const current = (() => {
    try { return readFileSync(destination, 'utf8') } catch { return null }
  })()

  if (check) {
    if (rendered !== current) {
      console.error(`${label} is out of date or missing. Regenerate it from this repository.`)
      process.exit(1)
    }
    console.log(`${label} matches its sources.`)
  } else if (rendered === current) {
    console.log(`${label} is already up to date.`)
  } else {
    mkdirSync(dirname(destination), { recursive: true })
    writeFileSync(destination, rendered)
    console.log(`wrote ${label}`)
  }
}
