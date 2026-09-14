import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

const FORBIDDEN = [
  { label: 'BrowserContext tracing', pattern: /\.\s*tracing\s*\./u },
  { label: 'HAR recording', pattern: /\brecordHar(?:Content|Mode|OmitContent|Path)?\b/u },
  { label: 'Playwright trace option', pattern: /\btrace\s*:\s*(?:true|['"`](?:on|retain-on-failure|on-first-retry)['"`])/u },
  { label: 'trace CLI flag', pattern: /--trace(?:=|\s)/u },
  { label: 'HAR CLI flag', pattern: /--(?:save-|record-)?har(?:=|\s)/iu },
  { label: 'trace environment switch', pattern: /\b(?:PLAYWRIGHT|PW_TEST)[A-Z_]*TRACE[A-Z_]*\b/u },
]

function browserSources(web = resolve(ROOT, 'tests', 'web')) {
  const sources = []
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name)
      if (entry.isDirectory()) {
        if (entry.name !== 'fixtures') visit(path)
        continue
      }
      if (!/\.(?:[cm]?[jt]sx?)$/u.test(entry.name)
        || /\.(?:spec|test)\.(?:[cm]?[jt]sx?)$/u.test(entry.name)) continue
      sources.push(path)
    }
  }
  visit(web)
  return sources
}

function scan(label, text) {
  const matches = FORBIDDEN
    .filter(rule => rule.pattern.test(text))
    .map(rule => rule.label)
  return matches.length === 0 ? [] : [`${label}: ${matches.join(', ')}`]
}

export function checkAuthenticatedBrowserLane(paths = []) {
  const failures = []
  if (paths.length > 0) {
    for (const path of paths) failures.push(...scan(path, readFileSync(resolve(path), 'utf8')))
    return failures
  }

  for (const path of [...browserSources(), resolve(ROOT, 'vitest.web.config.ts')]) {
    failures.push(...scan(path, readFileSync(path, 'utf8')))
  }

  const packageJson = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'))
  const testWeb = packageJson?.scripts?.['test:web']
  if (typeof testWeb !== 'string' || !testWeb.includes('node scripts/check-web-auth-capture.mjs')) {
    failures.push('package.json: test:web must run the authenticated-lane guard before Vitest')
  } else {
    failures.push(...scan('package.json scripts.test:web', testWeb))
  }

  const workflow = readFileSync(resolve(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8')
  if (!workflow.includes('npm run test:web')) {
    failures.push('.github/workflows/ci.yml: Web E2E must run through npm run test:web')
  }
  failures.push(...scan('.github/workflows/ci.yml', workflow))
  return failures
}

const invokedDirectly = process.argv[1] !== undefined
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invokedDirectly) {
  const args = process.argv.slice(2)
  const sourceRoot = args[0] === '--browser-source-root' ? args[1] : undefined
  const failures = sourceRoot === undefined
    ? checkAuthenticatedBrowserLane(args)
    : browserSources(resolve(sourceRoot)).flatMap(path => scan(path, readFileSync(path, 'utf8')))
  if (failures.length > 0) {
    process.stderr.write(`authenticated browser capture guard failed:\n${failures.join('\n')}\n`)
    process.exitCode = 1
  } else {
    process.stdout.write('authenticated browser capture guard passed\n')
  }
}
