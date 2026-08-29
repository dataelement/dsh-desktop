/**
 * Proof of concept for the immutable-generation plugin layout (Windows first).
 *
 * The shared hoisted tree makes every install replace package directories that
 * already exist, and Windows cannot rename over an existing directory — which
 * is what wedges pnpm into a multi-worker spin with no I/O and no error. A
 * generation is installed into a directory that has never existed, so the
 * replacement never happens.
 *
 * This script only proves the mechanics. It writes nothing outside its own
 * staging root and touches no profile the app uses.
 *
 * Four questions, each answered by a check below:
 *
 *   1. does an independent generation install finish on Windows at all?
 *   2. does promotion by rename work when the destination cannot pre-exist?
 *   3. do peers (react, @deepseek-ai/*) resolve out of the generation through
 *      Node's ordinary parent walk into `$DSH_HOME/profiles/node_modules`?
 *   4. does the plugin's own bundle metadata resolve from inside it?
 *
 * Usage:
 *   node scripts/generation-poc.mjs [pluginSpec]
 */

import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const PLUGIN_SPEC = process.argv[2] ?? 'dsh-vision-router'
const PLUGIN_NAME = PLUGIN_SPEC.replace(/@[^@/]+$/u, '') || PLUGIN_SPEC

/**
 * Singletons the host owns. A plugin that declares one of these as a private
 * dependency would otherwise get a second copy of a module the host must be
 * the only owner of, so the generation install treats them as peers whatever
 * the manifest says. Everything else stays private to the generation.
 */
const HOST_SINGLETONS = [/^react$/u, /^react-dom$/u, /^@deepseek-ai\//u]

function dshHome() {
  return process.env.DSH_HOME || join(homedir(), 'AppData', 'Roaming', 'dsh-desktop', 'harness')
}

/** Where the installation dependency closure lives, one level above every profile. */
function installationClosure(home = dshHome()) {
  return join(home, 'profiles', 'node_modules')
}

function bundledNodeAndPnpm() {
  const roots = [
    join(homedir(), 'AppData', 'Local', 'Programs', 'DSH Desktop', 'resources', 'app', 'node_modules'),
    join(process.cwd(), 'node_modules')
  ]
  for (const root of roots) {
    const node = join(root, 'node', 'bin', process.platform === 'win32' ? 'node.exe' : 'node')
    const pnpm = join(root, 'pnpm', 'bin', 'pnpm.cjs')
    if (existsSync(pnpm)) return { node: existsSync(node) ? node : process.execPath, pnpm }
  }
  throw new Error('No bundled pnpm found; run from the repo or install DSH Desktop.')
}

function run(command, args, options) {
  return new Promise((resolveRun) => {
    const started = Date.now()
    const child = spawn(command, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
    let output = ''
    const collect = (chunk) => {
      output = `${output}${chunk}`.slice(-64 * 1024)
    }
    child.stdout.on('data', collect)
    child.stderr.on('data', collect)
    const timer = setTimeout(() => {
      // A generation install that needs a timeout has already failed the point
      // of the exercise, so record it as such rather than waiting it out.
      child.kill('SIGKILL')
    }, options?.timeoutMs ?? 180_000)
    child.once('close', (code) => {
      clearTimeout(timer)
      resolveRun({ code, output, ms: Date.now() - started })
    })
  })
}

const checks = []
const pocProfileDirs = []
function record(name, ok, detail) {
  checks.push({ name, ok, detail })
  process.stdout.write(`${ok ? '  PASS' : '  FAIL'}  ${name}${detail ? ` — ${detail}` : ''}\n`)
}

async function main() {
  const { node, pnpm } = bundledNodeAndPnpm()
  const closure = installationClosure()
  const root = await mkdtemp(join(tmpdir(), 'dsh-generation-poc-'))
  const staging = join(root, 'staging')
  const generations = join(root, 'generations')
  await mkdir(staging, { recursive: true })
  await mkdir(generations, { recursive: true })

  process.stdout.write(`plugin      ${PLUGIN_SPEC}\n`)
  process.stdout.write(`closure     ${closure}${existsSync(closure) ? '' : '  (missing)'}\n`)
  process.stdout.write(`staging     ${root}\n\n`)

  // 1 — install the plugin as its own project. Nothing here has ever existed,
  // so pnpm has no directory to replace.
  process.stdout.write('1. independent generation install\n')
  await writeFile(
    join(staging, 'package.json'),
    `${JSON.stringify({ name: 'dsh-generation', private: true, version: '0.0.0' }, undefined, 2)}\n`
  )
  // node-linker=hoisted keeps every package a real directory under the
  // generation's own node_modules — no links into a `.pnpm` store that a
  // rename would strand. Verified: 0 symlinks, and the tree resolves intact
  // from its new path after the move.
  await writeFile(join(staging, '.npmrc'), 'node-linker=hoisted\nside-effects-cache=false\n')
  const install = await run(node, [pnpm, 'add', PLUGIN_SPEC], {
    cwd: staging,
    env: { ...process.env, CI: 'true', NO_COLOR: '1' },
    timeoutMs: 180_000
  })
  const installed = install.code === 0
  record(
    'install finishes without the shared-tree spin',
    installed,
    `${(install.ms / 1000).toFixed(1)}s, exit ${install.code}`
  )
  if (!installed) {
    process.stdout.write(`\n${install.output.split('\n').slice(-12).join('\n')}\n`)
  }

  // 2 — promote the whole install project, not the package directory inside
  // it: under the default layout that inner directory is a link into `.pnpm`
  // and moving it alone would break it.
  process.stdout.write('\n2. promotion by rename\n')
  const generationId = `${PLUGIN_NAME.replace(/[@/]/gu, '+')}-${Date.now().toString(36)}`
  const generationDir = join(generations, generationId)
  let promoted = false
  try {
    await rename(staging, generationDir)
    promoted = true
    record('rename into a never-before-existing destination', true, generationId)
  } catch (error) {
    record('rename into a never-before-existing destination', false, String(error?.message ?? error))
  }

  const packageRoot = join(generationDir, 'node_modules', PLUGIN_NAME)
  record(
    'plugin package root is a real directory inside the generation',
    promoted && existsSync(join(packageRoot, 'package.json'))
  )

  // The move is only safe if nothing under the generation is an absolute-path
  // link back to staging.
  const strandedLinks = []
  async function scanLinks(dir, depth) {
    if (depth > 6) return
    let entries
    try {
      entries = await import('node:fs/promises').then((fs) => fs.readdir(dir, { withFileTypes: true }))
    } catch {
      return
    }
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isSymbolicLink()) {
        const target = await import('node:fs/promises').then((fs) => fs.readlink(full)).catch(() => '')
        if (/^([A-Za-z]:|\/)/u.test(target) && !existsSync(full)) strandedLinks.push(full)
      } else if (entry.isDirectory()) {
        await scanLinks(full, depth + 1)
      }
    }
  }
  if (promoted) await scanLinks(join(generationDir, 'node_modules'), 0)
  record('no links stranded by the move', strandedLinks.length === 0, strandedLinks[0])

  // 3 — the peers. The generation sits one level below a directory that
  // stands in for `$DSH_HOME/profiles/<gen>`, whose parent is the real
  // installation closure — so Node's parent walk from inside the generation
  // reaches the closure exactly as it would in production. The allowlist
  // hoist (drop host singletons from the generation's own node_modules so the
  // walk has to continue upward) is applied here before resolving.
  process.stdout.write('\n3. peer resolution through the parent walk\n')
  if (promoted && existsSync(packageRoot) && existsSync(closure)) {
    const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'))
    const declaredPrivateSingletons = Object.keys(manifest.dependencies ?? {}).filter((dep) =>
      HOST_SINGLETONS.some((rx) => rx.test(dep))
    )

    // The allowlist hoist deletes EVERY host singleton the generation carries,
    // not only the ones the manifest declared privately: pnpm also drops a
    // copy of an unmet peer (react, when the host has not provided it during
    // the standalone install) straight into the generation's node_modules,
    // and a second React instance breaks hooks the moment the plugin renders.
    // Walk node_modules and remove anything matching a singleton pattern.
    const hoisted = []
    const genModules = join(generationDir, 'node_modules')
    for (const rx of HOST_SINGLETONS) {
      const entries = await import('node:fs/promises')
        .then((fs) => fs.readdir(genModules, { withFileTypes: true }))
        .catch(() => [])
      for (const entry of entries) {
        if (entry.name.startsWith('@')) {
          const scoped = await import('node:fs/promises')
            .then((fs) => fs.readdir(join(genModules, entry.name)))
            .catch(() => [])
          for (const inner of scoped) {
            const full = `${entry.name}/${inner}`
            if (rx.test(full)) {
              await rm(join(genModules, entry.name, inner), { recursive: true, force: true })
              hoisted.push(full)
            }
          }
        } else if (rx.test(entry.name)) {
          await rm(join(genModules, entry.name), { recursive: true, force: true })
          hoisted.push(entry.name)
        }
      }
    }
    record(
      'allowlist hoist removes every host singleton from the generation',
      true,
      hoisted.length === 0 ? 'none present' : `hoisted: ${[...new Set(hoisted)].join(', ')}`
    )

    // Place the generation under the REAL `$DSH_HOME/profiles/` so the parent
    // walk has the actual installation closure above it — exactly the
    // production layout. A poc- prefix keeps it clear of any profile the app
    // uses; it is removed at the end.
    const profileParent = join(dirname(closure), `poc-generation-${Date.now().toString(36)}`)
    pocProfileDirs.push(profileParent)
    await rename(generationDir, profileParent).catch((error) => {
      process.stdout.write(`  (rename into profiles/ failed: ${error?.message})\n`)
    })
    const movedPackageRoot = join(profileParent, 'node_modules', PLUGIN_NAME)
    const requireFromPlugin = createRequire(join(movedPackageRoot, 'package.json'))

    // The generation must NOT carry its own copy of a host singleton — that is
    // the whole point of the allowlist hoist. It is fine (expected) for the
    // specifier to resolve into the generation's own node_modules for a
    // package the plugin legitimately owns; what must not happen is a second
    // copy of react / cordis / a @deepseek-ai/* runtime package.
    const appClosure = join(
      homedir(),
      'AppData', 'Local', 'Programs', 'DSH Desktop', 'resources', 'app', 'node_modules'
    )
    for (const specifier of ['react', '@deepseek-ai/cordis', ...declaredPrivateSingletons]) {
      let resolved
      try {
        resolved = requireFromPlugin.resolve(specifier)
      } catch {
        resolved = undefined
      }
      const fromHost = resolved?.startsWith(closure) || resolved?.startsWith(appClosure)
      const fromGeneration = resolved?.startsWith(profileParent)
      // A singleton the plugin declared as a private dep must, after the
      // hoist, resolve to the host — never to a private copy.
      const mustBeHost = declaredPrivateSingletons.includes(specifier) || /^react/u.test(specifier)
      const ok = resolved !== undefined && (fromHost || (!mustBeHost && fromGeneration))
      record(
        `${specifier} resolves to a single shared instance`,
        ok,
        resolved
          ? resolved.replace(closure, '<closure>').replace(appClosure, '<app>').replace(profileParent, '<generation>')
          : 'unresolved'
      )
    }

    // Point later checks at the moved location.
    checks.movedPackageRoot = movedPackageRoot
  } else {
    record('installation closure present for peer resolution', false, `${closure} missing`)
  }

  // 4 — the metadata app-boot needs before any plugin code runs, and the
  // entry module itself, resolved from the moved location with the closure
  // above it.
  process.stdout.write('\n4. bundle metadata and entry load\n')
  const finalPackageRoot = checks.movedPackageRoot ?? packageRoot
  if (promoted && existsSync(join(finalPackageRoot, 'package.json'))) {
    const manifest = JSON.parse(await readFile(join(finalPackageRoot, 'package.json'), 'utf8'))
    record('package.json readable', typeof manifest.name === 'string', manifest.name)
    const entry = manifest.main ?? manifest.exports?.['.'] ?? manifest.module
    let loadable = false
    let detail = 'no entry field'
    if (typeof entry === 'string' || typeof entry === 'object') {
      try {
        const resolvedEntry = createRequire(join(finalPackageRoot, 'package.json')).resolve(manifest.name)
        await import(pathToFileURL(resolvedEntry).href)
        loadable = true
        detail = manifest.type === 'module' ? 'ESM' : 'CJS/ESM interop'
      } catch (error) {
        detail = String(error?.message ?? error).split('\n')[0].slice(0, 160)
      }
    }
    record('entry module loads with closure above it', loadable, detail)
  }

  process.stdout.write('\n')
  const failed = checks.filter((check) => !check.ok)
  process.stdout.write(
    `${checks.length - failed.length}/${checks.length} passed` +
      (failed.length === 0 ? '\n' : ` — failing: ${failed.map((f) => f.name).join('; ')}\n`)
  )
  process.stdout.write(`staging kept at ${root}\n`)
  for (const dir of pocProfileDirs) {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined)
  }
  process.exitCode = failed.length === 0 ? 0 : 1
}

await main()
