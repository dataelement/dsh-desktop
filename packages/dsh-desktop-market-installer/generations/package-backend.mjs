import { randomUUID } from 'node:crypto'
import { mkdir, open, readFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { forgetPlugin, recordPluginSwitch } from '../plugin-state.mjs'
import { installGeneration, verifyGenerationPeers } from './installer.mjs'
import {
  SHARED_TREE_ONLY,
  listGenerations,
  readDesired,
  withRegistryLock,
  writeDesired
} from './registry.mjs'
import {
  REAL_DIRECTORY_IN_PLACE,
  projectGenerations,
  publishGenerationManifest,
  publishInstalledGeneration
} from './projection.mjs'

const PROFILE = 'web'
const profileDirectory = dshHome => join(dshHome, 'profiles', PROFILE)
const MAX_OUTPUT_BYTES = 16 * 1024

function errorText(error) {
  return error instanceof Error ? error.message : String(error)
}

function packageNameFromRegistrySpec(spec) {
  const match = /^(?<name>@[^/]+\/[^@]+|[^@/][^@]*)?(?:@[^@]+)?$/u.exec(spec)
  return match?.groups?.name || undefined
}

async function localPackageName(path) {
  const manifest = JSON.parse(await readFile(join(path, 'package.json'), 'utf8'))
  if (typeof manifest.name !== 'string' || manifest.name.length === 0) {
    throw new Error('The local package manifest names no package.')
  }
  return manifest.name
}

function replaceDesiredGeneration(desired, generations, pluginName, generationId) {
  const byId = new Map(generations.map(generation => [generation.id, generation]))
  return [
    ...desired.filter(id => byId.get(id)?.pluginName !== pluginName),
    generationId
  ]
}

async function createOperationLog(dshHome) {
  const directory = join(dshHome, 'profiles', PROFILE, '.plugin-manager', 'logs', randomUUID())
  await mkdir(directory, { recursive: true, mode: 0o700 })
  const path = join(directory, 'generation.log')
  const file = await open(path, 'wx', 0o600)
  let output = Buffer.alloc(0)
  let truncated = false
  return {
    path,
    async append(text) {
      const bytes = Buffer.from(text)
      await file.write(bytes)
      output = Buffer.concat([output, bytes])
      if (output.length > MAX_OUTPUT_BYTES) {
        truncated = true
        output = output.subarray(output.length - MAX_OUTPUT_BYTES)
      }
    },
    async close() {
      await file.close()
      return { output: output.toString('utf8'), truncated }
    }
  }
}

/**
 * Host package-mutation backend consumed by the patched Harness Plugin Manager.
 * Staging and promotion happen before publication; the returned rollback remains
 * live only until Plugin Manager has validated the bundle and begins enablement.
 *
 * Packages that are not the generation registry's — the market, which lives in
 * the shared tree, and plugins pnpm still owns in the Profile — resolve
 * `undefined`, and Plugin Manager runs its ordinary pnpm path for them.
 * Enable switches from every surface land in the shared package switch
 * (plugin-state.mjs), which launch reconciliation never rewrites.
 */
export function createGenerationPackageBackend(options) {
  const {
    dshHome,
    dshEntryPath,
    nodeExecutablePath,
    pnpmEntryPath,
    environment = process.env,
    spawnProcess,
    runInstall
  } = options

  return Object.freeze({
    async install(request) {
      const log = await createOperationLog(dshHome)
      let activeChild
      const abortChild = () => activeChild?.kill('SIGKILL')
      request.signal?.addEventListener('abort', abortChild, { once: true })
      let closed = false
      let outputWrites = Promise.resolve()
      const finishLog = async () => {
        if (closed) return { output: '', truncated: false }
        await outputWrites
        closed = true
        return log.close()
      }
      const emit = (text, stream = 'stdout') => {
        outputWrites = outputWrites.then(async () => {
          await log.append(text)
          request.onOutput?.(text, stream)
        })
        return outputWrites
      }

      try {
        request.signal?.throwIfAborted()
        let expectedPluginName = request.expectedName
        let sourceDirectory
        let sourceSpec = request.sourceSpec
        if (request.kind === 'registry') {
          expectedPluginName ??= packageNameFromRegistrySpec(request.spec)
        } else if (request.kind === 'path') {
          const path = request.path
          if (typeof path !== 'string' || !isAbsolute(path)) {
            throw new Error('Desktop generation installation requires an absolute local package path.')
          }
          expectedPluginName ??= await localPackageName(path)
          sourceDirectory = path
          sourceSpec = request.spec
        }
        if (expectedPluginName !== undefined && SHARED_TREE_ONLY.has(expectedPluginName)) {
          await finishLog()
          return undefined
        }

        const result = await withRegistryLock(dshHome, async () => {
          request.signal?.throwIfAborted()
          const beforeDesired = await readDesired(dshHome)
          const beforeGenerations = await listGenerations(dshHome)
          const install = await installGeneration({
            dshHome,
            profile: PROFILE,
            pluginSpec: request.spec,
            expectedPluginName,
            sourceDirectory,
            sourceSpec,
            registry: request.registry,
            expectedVersion: request.expectedVersion,
            autoInstallPeers: request.autoInstallPeers,
            minimumReleaseAge: request.minimumReleaseAge,
            nodeExecutablePath,
            pnpmEntryPath,
            environment,
            spawnProcess,
            registerChild: child => {
              activeChild = child
              if (request.signal?.aborted) abortChild()
            },
            runInstall,
            onTrace: line => { void emit(`${line}\n`) },
            onOutput: text => { void emit(text) }
          })
          if (!install.ok || install.generation === undefined) {
            return { ok: false, detail: install.detail ?? 'generation install failed' }
          }
          request.signal?.throwIfAborted()
          const generation = install.generation
          const peers = await verifyGenerationPeers(dshHome, generation, { dshEntryPath })
          if (!peers.ok) {
            return { ok: false, detail: `generation peer validation failed: ${peers.problems.join('; ')}` }
          }
          const replacedGeneration = beforeGenerations.some(item =>
            beforeDesired.includes(item.id) && item.pluginName === generation.pluginName
          )
          const nextDesired = replaceDesiredGeneration(
            beforeDesired,
            await listGenerations(dshHome),
            generation.pluginName,
            generation.id
          )
          await writeDesired(dshHome, nextDesired)
          let deferredSwitch = false
          try {
            await publishInstalledGeneration(dshHome, generation.pluginName, PROFILE, {
              syncBundles: false
            })
          } catch (error) {
            if (error?.code !== REAL_DIRECTORY_IN_PLACE) {
              await writeDesired(dshHome, beforeDesired)
              throw error
            }
            // A pnpm-owned copy is loaded from that directory; it cannot be
            // replaced while Harness runs. Launch projection swaps it for the
            // generation link, so this install completes on restart.
            try {
              await publishGenerationManifest(dshHome, PROFILE, { syncBundles: false })
            } catch (manifestError) {
              await writeDesired(dshHome, beforeDesired)
              throw manifestError
            }
            deferredSwitch = true
            void emit(`generation-install: ${generation.pluginName} replaces a Profile-owned copy on restart\n`)
          }

          let committed = false
          const rollback = async () => {
            if (committed) return
            await withRegistryLock(dshHome, async () => {
              if (committed) return
              const currentDesired = await readDesired(dshHome)
              // A newer operation may already have replaced this package. Its
              // pointer must win, while unrelated package changes are kept.
              if (!currentDesired.includes(generation.id)) return
              const previousIds = beforeDesired.filter(id =>
                beforeGenerations.some(item => item.id === id && item.pluginName === generation.pluginName)
              )
              const restored = [
                ...currentDesired.filter(id => id !== generation.id),
                ...previousIds
              ]
              await writeDesired(dshHome, restored)
              try {
                await projectGenerations(dshHome, PROFILE)
              } catch (error) {
                await writeDesired(dshHome, currentDesired)
                throw error
              }
              committed = true
            })
          }
          return {
            ok: true,
            bundle: generation.pluginName,
            replaced: replacedGeneration || deferredSwitch,
            rollback,
            commit: () => { committed = true }
          }
        })

        if (!result.ok) {
          await emit(`generation-install: ${result.detail}\n`, 'stderr')
          const captured = await finishLog()
          return {
            packageResult: {
              exitCode: 1,
              ...captured,
              logPath: log.path
            }
          }
        }
        const captured = await finishLog()
        return {
          packageResult: {
            exitCode: 0,
            ...captured,
            logPath: log.path
          },
          bundle: result.bundle,
          replaced: result.replaced,
          rollback: result.rollback,
          commit: result.commit
        }
      } catch (error) {
        await emit(`generation-install: ${errorText(error)}\n`, 'stderr').catch(() => undefined)
        const captured = await finishLog()
        return {
          packageResult: {
            exitCode: 1,
            ...captured,
            logPath: log.path
          }
        }
      } finally {
        request.signal?.removeEventListener('abort', abortChild)
      }
    },

    async remove(request) {
      const log = await createOperationLog(dshHome)
      const emit = async (text, stream = 'stdout') => {
        await log.append(text)
        request.onOutput?.(text, stream)
      }
      try {
        request.signal?.throwIfAborted()
        const owned = await withRegistryLock(dshHome, async () => {
          request.signal?.throwIfAborted()
          const beforeDesired = await readDesired(dshHome)
          const generations = await listGenerations(dshHome)
          const removedIds = new Set(
            generations.filter(item => item.pluginName === request.name).map(item => item.id)
          )
          const nextDesired = beforeDesired.filter(id => !removedIds.has(id))
          // Not an enabled generation: pnpm owns this package (or the market
          // does, in the shared tree), so Plugin Manager removes it with pnpm.
          if (nextDesired.length === beforeDesired.length) return false
          await writeDesired(dshHome, nextDesired)
          try {
            await publishGenerationManifest(dshHome, PROFILE, { syncBundles: true })
          } catch (error) {
            await writeDesired(dshHome, beforeDesired)
            throw error
          }
          await emit(`generation-remove: staged ${request.name} for removal on restart\n`)
          return true
        })
        const captured = await log.close()
        if (!owned) return undefined
        return { packageResult: { exitCode: 0, ...captured, logPath: log.path } }
      } catch (error) {
        await emit(`generation-remove: ${errorText(error)}\n`, 'stderr').catch(() => undefined)
        const captured = await log.close()
        return { packageResult: { exitCode: 1, ...captured, logPath: log.path } }
      }
    },

    async switched(request) {
      await recordPluginSwitch(profileDirectory(dshHome), request.name, request.enabled, {
        rowIds: request.rowIds ?? []
      })
    },

    async removed(request) {
      await forgetPlugin(profileDirectory(dshHome), request.name)
    }
  })
}
