// Generates the workbench documents from their sources in docs/:
//
//   docs/workbench-standard.zh.md           -> the workbench development spec
//   docs/workbench-market-acceptance.zh.md  -> the workbench market acceptance spec
//   docs/workbench-quickstart.zh.md         -> the short execution flow
//
// The website is the one public home of both documents: --site takes the
// homepage repository's workbench/ directory and writes each document's
// Markdown (for Agents) and a reading page (for people) at SITE_DOCUMENTS
// below. Desktop bundles the same Markdown for offline reading only.
//
//   node scripts/build-workbench-guide.mjs                  rewrite Desktop's bundled copies
//   node scripts/build-workbench-guide.mjs --check          fail if they drifted
//   node scripts/build-workbench-guide.mjs --site <dir>     write all documents for the website
//   node scripts/build-workbench-guide.mjs --site-check <dir>

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { renderDocumentPage } from './workbench-doc-page.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

export const GUIDE_TARGET = 'packages/dsh-desktop-workbenches/development-guide.zh.md'
export const GUIDE_EN_TARGET = 'packages/dsh-desktop-workbenches/development-guide.en.md'
// The development spec is itself the document shipped to authors and Agents.
export const GUIDE_SOURCE = 'docs/workbench-standard.zh.md'
export const GUIDE_EN_SOURCE = 'docs/workbench-standard.en.md'
// The market acceptance spec ships separately: developing for local use never
// needs it, and listing in the market needs only it.
export const ACCEPTANCE_TARGET = 'packages/dsh-desktop-workbenches/market-acceptance.zh.md'
export const ACCEPTANCE_EN_TARGET = 'packages/dsh-desktop-workbenches/market-acceptance.en.md'
export const ACCEPTANCE_SOURCE = 'docs/workbench-market-acceptance.zh.md'
export const ACCEPTANCE_EN_SOURCE = 'docs/workbench-market-acceptance.en.md'
export const QUICKSTART_SOURCE = 'docs/workbench-quickstart.zh.md'
export const QUICKSTART_EN_SOURCE = 'docs/workbench-quickstart.en.md'
// Each document has a reading page for people and the Markdown source for Agents.
export const SITE_DOCUMENTS = {
  development: {
    file: 'docs/development.md', url: 'https://dshdesktop.com/workbench/docs/development.md',
    page: 'docs/development/index.html', pageUrl: 'https://dshdesktop.com/workbench/docs/development/'
  },
  acceptance: {
    file: 'docs/market-acceptance.md', url: 'https://dshdesktop.com/workbench/docs/market-acceptance.md',
    page: 'docs/market-acceptance/index.html', pageUrl: 'https://dshdesktop.com/workbench/docs/market-acceptance/'
  },
  quickstart: {
    file: 'docs/quickstart.md', url: 'https://dshdesktop.com/workbench/docs/quickstart.md',
    page: 'docs/quickstart/index.html', pageUrl: 'https://dshdesktop.com/workbench/docs/quickstart/'
  },
  developmentEn: {
    file: 'docs/development-en.md', url: 'https://dshdesktop.com/workbench/docs/development-en.md',
    page: 'docs/development-en/index.html', pageUrl: 'https://dshdesktop.com/workbench/docs/development-en/', alternatePageUrl: 'https://dshdesktop.com/workbench/docs/development/', language: 'en'
  },
  acceptanceEn: {
    file: 'docs/market-acceptance-en.md', url: 'https://dshdesktop.com/workbench/docs/market-acceptance-en.md',
    page: 'docs/market-acceptance-en/index.html', pageUrl: 'https://dshdesktop.com/workbench/docs/market-acceptance-en/', alternatePageUrl: 'https://dshdesktop.com/workbench/docs/market-acceptance/', language: 'en'
  },
  quickstartEn: {
    file: 'docs/quickstart-en.md', url: 'https://dshdesktop.com/workbench/docs/quickstart-en.md',
    page: 'docs/quickstart-en/index.html', pageUrl: 'https://dshdesktop.com/workbench/docs/quickstart-en/', alternatePageUrl: 'https://dshdesktop.com/workbench/docs/quickstart/', language: 'en'
  }
}

SITE_DOCUMENTS.development.alternatePageUrl = SITE_DOCUMENTS.developmentEn.pageUrl
SITE_DOCUMENTS.acceptance.alternatePageUrl = SITE_DOCUMENTS.acceptanceEn.pageUrl
SITE_DOCUMENTS.quickstart.alternatePageUrl = SITE_DOCUMENTS.quickstartEn.pageUrl

const withTrailingNewline = text => (text.endsWith('\n') ? text : `${text}\n`)

export function renderGuideFromSource(readFile = path => readFileSync(join(root, path), 'utf8')) {
  return withTrailingNewline(readFile(GUIDE_SOURCE))
}

export function renderAcceptanceFromSource(readFile = path => readFileSync(join(root, path), 'utf8')) {
  return withTrailingNewline(readFile(ACCEPTANCE_SOURCE))
}

export function renderQuickstartFromSource(readFile = path => readFileSync(join(root, path), 'utf8')) {
  return withTrailingNewline(readFile(QUICKSTART_SOURCE))
}

export const renderEnglishGuideFromSource = (readFile = path => readFileSync(join(root, path), 'utf8')) => withTrailingNewline(readFile(GUIDE_EN_SOURCE))
export const renderEnglishAcceptanceFromSource = (readFile = path => readFileSync(join(root, path), 'utf8')) => withTrailingNewline(readFile(ACCEPTANCE_EN_SOURCE))
export const renderEnglishQuickstartFromSource = (readFile = path => readFileSync(join(root, path), 'utf8')) => withTrailingNewline(readFile(QUICKSTART_EN_SOURCE))

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
    ? [[SITE_DOCUMENTS.development, renderGuideFromSource()], [SITE_DOCUMENTS.acceptance, renderAcceptanceFromSource()], [SITE_DOCUMENTS.quickstart, renderQuickstartFromSource()], [SITE_DOCUMENTS.developmentEn, renderEnglishGuideFromSource()], [SITE_DOCUMENTS.acceptanceEn, renderEnglishAcceptanceFromSource()], [SITE_DOCUMENTS.quickstartEn, renderEnglishQuickstartFromSource()]]
        .flatMap(([doc, markdown]) => [
          { destination: join(siteDir, doc.file), label: doc.url, rendered: markdown },
          { destination: join(siteDir, doc.page), label: doc.pageUrl, rendered: renderDocumentPage(markdown, { markdownUrl: doc.url, language: doc.language || 'zh-CN', alternatePageUrl: doc.alternatePageUrl }) }
        ])
    : [
        { destination: target, label: GUIDE_TARGET, rendered: renderGuideFromSource() },
        { destination: join(root, ACCEPTANCE_TARGET), label: ACCEPTANCE_TARGET, rendered: renderAcceptanceFromSource() },
        { destination: join(root, GUIDE_EN_TARGET), label: GUIDE_EN_TARGET, rendered: renderEnglishGuideFromSource() },
        { destination: join(root, ACCEPTANCE_EN_TARGET), label: ACCEPTANCE_EN_TARGET, rendered: renderEnglishAcceptanceFromSource() }
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
