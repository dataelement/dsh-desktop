// Generates the two workbench documents from their sources in docs/:
//
//   docs/workbench-standard.zh.md           -> the workbench development spec
//   docs/workbench-market-acceptance.zh.md  -> the workbench market acceptance spec
//
// The website is the one public home of both documents: --site takes the
// homepage repository's workbench/ directory and writes each document's
// Markdown (for Agents) and a reading page (for people) at SITE_DOCUMENTS
// below. Desktop bundles the same Markdown for offline reading only.
//
//   node scripts/build-workbench-guide.mjs                  rewrite Desktop's bundled copies
//   node scripts/build-workbench-guide.mjs --check          fail if they drifted
//   node scripts/build-workbench-guide.mjs --site <dir>     write both documents for the website
//   node scripts/build-workbench-guide.mjs --site-check <dir>

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { renderDocumentPage } from './workbench-doc-page.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

export const GUIDE_TARGET = 'packages/dsh-desktop-workbenches/development-guide.zh.md'
// The development spec is itself the document shipped to authors and Agents.
export const GUIDE_SOURCE = 'docs/workbench-standard.zh.md'
// The market acceptance spec ships separately: developing for local use never
// needs it, and listing in the market needs only it.
export const ACCEPTANCE_TARGET = 'packages/dsh-desktop-workbenches/market-acceptance.zh.md'
export const ACCEPTANCE_SOURCE = 'docs/workbench-market-acceptance.zh.md'
// Each document has a reading page for people and the Markdown source for Agents.
export const SITE_DOCUMENTS = {
  development: {
    file: 'docs/development.md', url: 'https://dshdesktop.com/workbench/docs/development.md',
    page: 'docs/development/index.html', pageUrl: 'https://dshdesktop.com/workbench/docs/development/'
  },
  acceptance: {
    file: 'docs/market-acceptance.md', url: 'https://dshdesktop.com/workbench/docs/market-acceptance.md',
    page: 'docs/market-acceptance/index.html', pageUrl: 'https://dshdesktop.com/workbench/docs/market-acceptance/'
  }
}

const withTrailingNewline = text => (text.endsWith('\n') ? text : `${text}\n`)

export function renderGuideFromSource(readFile = path => readFileSync(join(root, path), 'utf8')) {
  return withTrailingNewline(readFile(GUIDE_SOURCE))
}

export function renderAcceptanceFromSource(readFile = path => readFileSync(join(root, path), 'utf8')) {
  return withTrailingNewline(readFile(ACCEPTANCE_SOURCE))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2)
  const target = join(root, GUIDE_TARGET)
  const siteIndex = argv.findIndex(value => value === '--site' || value === '--site-check')
  const siteDir = siteIndex === -1 ? null : argv[siteIndex + 1]
  if (siteIndex !== -1 && !siteDir) {
    console.error('--site requires the path of the homepage workbench/ directory')
    process.exit(2)
  }

  const check = argv.includes('--check') || argv.includes('--site-check')
  const outputs = siteDir
    ? [[SITE_DOCUMENTS.development, renderGuideFromSource()], [SITE_DOCUMENTS.acceptance, renderAcceptanceFromSource()]]
        .flatMap(([doc, markdown]) => [
          { destination: join(siteDir, doc.file), label: doc.url, rendered: markdown },
          { destination: join(siteDir, doc.page), label: doc.pageUrl, rendered: renderDocumentPage(markdown, { markdownUrl: doc.url }) }
        ])
    : [
        { destination: target, label: GUIDE_TARGET, rendered: renderGuideFromSource() },
        { destination: join(root, ACCEPTANCE_TARGET), label: ACCEPTANCE_TARGET, rendered: renderAcceptanceFromSource() }
      ]
  let stale = false
  for (const { destination, label, rendered } of outputs) {
    const current = (() => {
      try { return readFileSync(destination, 'utf8') } catch { return null }
    })()
    if (check) {
      if (rendered !== current) {
        console.error(`${label} is out of date or missing. Regenerate it from this repository.`)
        stale = true
      } else console.log(`${label} matches its sources.`)
    } else if (rendered === current) {
      console.log(`${label} is already up to date.`)
    } else {
      mkdirSync(dirname(destination), { recursive: true })
      writeFileSync(destination, rendered)
      console.log(`wrote ${label}`)
    }
  }
  if (stale) process.exit(1)
}
