import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ensureRegistryDirectories, generationId, writeGenerationMeta } from './registry.mjs'

/**
 * Install one plugin as its own immutable generation.
 *
 * pnpm runs in a fresh staging directory, the tree is promoted by a single
 * rename into a path the id guarantees is new, and nothing writes into it
 * afterward. On Windows that keeps the operation clear of the one thing pnpm
 * cannot do there — rename over an existing directory — which is what wedges a
 * shared hoisted install into a no-progress spin.
 *
 * Two things a standalone install gets wrong that this corrects before
 * promotion:
 *
 *   1. pnpm resolves the transitive closure of a plugin's @deepseek-ai peers
 *      and installs it privately too. The host owns those, so every one that
 *      matches a host-singleton pattern is deleted from the generation —
 *      resolution then walks up to the shared copy.
 *
 *   2. with no host present during the install, pnpm drops a copy of every
 *      unmet peer (react included) straight into node_modules. A second React
 *      instance breaks hooks, so the hoist is unconditional.
 */

/** Packages the host is the sole owner of; a generation must never carry its own copy. */
const HOST_SINGLETON_PATTERNS = [/^react$/u, /^react-dom$/u, /^@deepseek-ai\//u]

function isHostSingleton(name) {
  return HOST_SINGLETON_PATTERNS.some((pattern) => pattern.test(name))
}

function installationClosureDir(dshHome) {
  return join(dshHome, 'profiles', 'node_modules')
}

async function defaultRunInstall(options, stagingDir) {
  const spawnProcess = options.spawnProcess ?? spawn
  return new Promise((resolve) => {
    const child = spawnProcess(
      options.nodeExecutablePath,
      [options.pnpmEntryPath, 'add', options.pluginSpec],
      {
        cwd: stagingDir,
        env: {
          ...(options.environment ?? process.env),
          CI: 'true',
          NO_COLOR: '1',
          npm_config_side_effects_cache: 'false'
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
      }
    )
    let output = ''
    const collect = (chunk) => {
      output = `${output}${chunk.toString()}`.slice(-64 * 1024)
      options.onOutput?.(chunk.toString())
    }
    child.stdout?.on('data', collect)
    child.stderr?.on('data', collect)
    // A generation install that needs a timeout has already failed the point of
    // the exercise; record it rather than waiting the full ceiling out.
    const timer = setTimeout(() => child.kill('SIGKILL'), 5 * 60 * 1000)
    options.registerChild?.(child)
    child.once('close', (code) => {
      clearTimeout(timer)
      resolve({ code: code ?? 1, output })
    })
    child.once('error', (error) => {
      clearTimeout(timer)
      resolve({ code: 1, output: `${output}\n${error.message}` })
    })
  })
}

/**
 * Delete every host-singleton package from a generation's own node_modules,
 * one level deep plus one level into each scope. Returns what was removed.
 */
async function hoistHostSingletons(generationDir) {
  const modules = join(generationDir, 'node_modules')
  const removed = []
  let entries
  try {
    entries = await readdir(modules, { withFileTypes: true })
  } catch {
    return removed
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (entry.name.startsWith('@')) {
      let scoped = []
      try {
        scoped = await readdir(join(modules, entry.name))
      } catch {
        continue
      }
      for (const inner of scoped) {
        const full = `${entry.name}/${inner}`
        if (isHostSingleton(full)) {
          await rm(join(modules, entry.name, inner), { recursive: true, force: true })
          removed.push(full)
        }
      }
    } else if (isHostSingleton(entry.name)) {
      await rm(join(modules, entry.name), { recursive: true, force: true })
      removed.push(entry.name)
    }
  }
  return removed
}

/** The one diagnostic line worth surfacing from a failed pnpm run. */
function diagnosticLine(output) {
  const lines = output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
  const named = lines.filter((line) => /EPERM|EBUSY|EEXIST|ENOENT|ERR_PNPM|error/iu.test(line))
  return (named.at(-1) ?? lines.at(-1))?.slice(0, 400)
}

export async function installGeneration(options) {
  const { dshHome, pluginSpec, onTrace } = options
  const trace = (line) => onTrace?.(`generation-install: ${line}`)
  const layout = await ensureRegistryDirectories(dshHome)
  const pluginName = pluginSpec.replace(/@[^@/]+$/u, '') || pluginSpec

  const stagingDir = join(layout.staging, randomUUID())
  await mkdir(stagingDir, { recursive: true })
  await writeFile(
    join(stagingDir, 'package.json'),
    `${JSON.stringify({ name: 'dsh-generation', private: true, version: '0.0.0' }, undefined, 2)}\n`
  )
  // node-linker=hoisted keeps every package a real directory under the
  // generation's own node_modules — no links into a `.pnpm` store that the
  // promotion rename would strand.
  await writeFile(join(stagingDir, '.npmrc'), 'node-linker=hoisted\nside-effects-cache=false\n')

  const cleanupStaging = () => rm(stagingDir, { recursive: true, force: true }).catch(() => undefined)

  try {
    trace(`installing ${pluginSpec} into staging`)
    const runInstall = options.runInstall ?? ((dir) => defaultRunInstall(options, dir))
    const started = Date.now()
    const { code, output } = await runInstall(stagingDir)
    if (code !== 0) {
      trace(`pnpm exited ${code} after ${Date.now() - started}ms`)
      for (const line of output.split(/\r?\n/u).slice(-8)) {
        if (line.trim()) trace(`output| ${line.trim()}`)
      }
      await cleanupStaging()
      return { ok: false, detail: diagnosticLine(output) ?? `pnpm exited ${code}` }
    }
    trace(`installed in ${Date.now() - started}ms`)

    const installedManifestPath = join(stagingDir, 'node_modules', pluginName, 'package.json')
    if (!existsSync(installedManifestPath)) {
      await cleanupStaging()
      return { ok: false, detail: `pnpm reported success but ${pluginName} is not on disk` }
    }
    const manifest = JSON.parse(await readFile(installedManifestPath, 'utf8'))
    const version = typeof manifest.version === 'string' ? manifest.version : '0.0.0'

    const hoisted = await hoistHostSingletons(stagingDir)
    if (hoisted.length > 0) {
      trace(`hoisted ${hoisted.length} host singletons: ${hoisted.slice(0, 6).join(', ')}…`)
    }

    const lockfileText = await readFile(join(stagingDir, 'pnpm-lock.yaml'), 'utf8').catch(() => randomUUID())
    const id = generationId(pluginName, version, lockfileText)
    const generationDir = join(layout.generations, id)

    if (existsSync(generationDir)) {
      trace(`generation ${id} already exists, reusing`)
      await cleanupStaging()
    } else {
      await writeGenerationMeta(stagingDir, { pluginName, version })
      await rename(stagingDir, generationDir)
      trace(`promoted to ${id}`)
    }

    return { ok: true, hoisted, generation: { id, pluginName, version, directory: generationDir } }
  } catch (error) {
    await cleanupStaging()
    return { ok: false, detail: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * A quick check that a promoted generation's peers all resolve to the host.
 * Not a gate on install — a diagnostic the caller can log or surface.
 */
export async function verifyGenerationPeers(dshHome, generation) {
  const { createRequire } = await import('node:module')
  const closure = installationClosureDir(dshHome)
  const packageRoot = join(generation.directory, 'node_modules', generation.pluginName)
  const manifestPath = join(packageRoot, 'package.json')
  if (!existsSync(manifestPath)) return { ok: false, problems: ['plugin package root missing'] }

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const requireFromPlugin = createRequire(manifestPath)
  const problems = []
  for (const peer of Object.keys(manifest.peerDependencies ?? {})) {
    let resolved
    try {
      resolved = requireFromPlugin.resolve(peer)
    } catch {
      resolved = undefined
    }
    if (resolved === undefined) continue
    if (isHostSingleton(peer) && !resolved.startsWith(closure)) {
      problems.push(`${peer} resolves outside the installation closure: ${resolved}`)
    }
  }
  return { ok: problems.length === 0, problems }
}
