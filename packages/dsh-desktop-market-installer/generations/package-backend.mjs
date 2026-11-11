import { randomUUID } from 'node:crypto'
import { mkdir, open, readFile, readlink, realpath } from 'node:fs/promises'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { forgetPlugin, recordPluginSwitch, validatePluginSwitch } from '../plugin-state.mjs'
import { DEFAULT_NPM_REGISTRY } from '../market-registry.mjs'
import { installGeneration, verifyGenerationPeers } from './installer.mjs'
import {
  listGenerations,
  readDesired,
  withRegistryLock,
  writeDesired
} from './registry.mjs'
import {
  REAL_DIRECTORY_IN_PLACE,
  projectGenerations,
  publishGenerationManifest,
  publishInstalledGeneration,
  windowsJunctionTargets
} from './projection.mjs'

function profileDirectory(dshHome, profile) {
  return join(dshHome, 'profiles', profile)
}
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

/** Caller holds the registry lock; no Profile or desired state is changed here. */
export async function assertNoPendingGenerationUpdates(dshHome, profile, requestedName) {
  const [desired, generations] = await Promise.all([readDesired(dshHome), listGenerations(dshHome)])
  const byId = new Map(generations.map(generation => [generation.id, generation]))
  const others = desired.map(id => {
    const generation = byId.get(id)
    if (!generation) throw new Error(`Desired generation is missing or unreadable: ${id}`)
    return generation
  }).filter(generation => generation.pluginName !== requestedName)
  if (others.length === 0) return
  const directory = profileDirectory(dshHome, profile)
  let manifest
  try {
    manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
  } catch (error) {
    throw new Error('Cannot check pending generation updates. Restart before changing another package.', { cause: error })
  }
  const projection = manifest?.dsh?.desktop?.generationProjection
  for (const generation of others) {
    let selected = projection?.version === 1 &&
      projection.plugins?.[generation.pluginName]?.generationId === generation.id
    let cause
    if (selected) {
      const path = join(directory, 'node_modules', generation.pluginName)
      try {
        const linked = await readlink(path)
        const target = join(await realpath(generation.directory), 'node_modules', generation.pluginName)
        selected = process.platform === 'win32'
          ? windowsJunctionTargets(path, linked, target)
          : resolve(dirname(path), linked) === target || resolve(dirname(path), linked) === resolve(generation.directory, 'node_modules', generation.pluginName)
      } catch (error) {
        cause = error
        // A damaged installed package with no old entry is still manageable.
        // A real directory or a link to another generation is a pending switch.
        if (error?.code !== 'ENOENT') selected = false
      }
    }
    if (!selected) {
      throw new Error(`Pending generation update for ${generation.pluginName}. Restart before changing another package, or replace/remove that pending package first.`, { cause })
    }
  }
}

async function createOperationLog(dshHome, profile) {
  const directory = join(dshHome, 'profiles', profile, '.plugin-manager', 'logs', randomUUID())
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
 * Removal of plugins pnpm still owns in the Profile resolves `undefined`,
 * and Plugin Manager runs its ordinary pnpm path for them.
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
    runInstall,
    profile = 'web'
  } = options

  return Object.freeze({
    supportsVerifiedInstall: true,
    async install(request) {
      const log = await createOperationLog(dshHome, profile)
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
        if (request.npmIntegrity !== undefined) {
          if (!request.expectedName || !request.expectedVersion || typeof request.npmIntegrity !== 'string' || !request.npmIntegrity) {
            throw new Error('Verified registry installation requires a package name, version and integrity.')
          }
          const registry = (request.registry ?? DEFAULT_NPM_REGISTRY).replace(/\/+$/u, '')
          const response = await (options.fetchImpl ?? fetch)(registry + '/' + request.expectedName.replace('/', '%2F') + '/' + encodeURIComponent(request.expectedVersion), {
            headers: { accept: 'application/json' }, signal: request.signal ?? AbortSignal.timeout(30_000)
          })
          if (!response.ok) throw new Error('Could not verify registry package integrity: HTTP ' + response.status)
          if ((await response.json())?.dist?.integrity !== request.npmIntegrity) {
            throw new Error('The package does not match the integrity listed in the workbench index.')
          }
        }
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

        const result = await withRegistryLock(dshHome, async () => {
          request.signal?.throwIfAborted()
          const beforeDesired = await readDesired(dshHome)
          const beforeGenerations = await listGenerations(dshHome)
          if (expectedPluginName !== undefined) {
            await assertNoPendingGenerationUpdates(dshHome, profile, expectedPluginName)
          }
          const install = await installGeneration({
            dshHome,
            profile,
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
          // Git/tarball identities are only known after staging. Check again using
          // the actual name before publication, even if the caller supplied one.
          await assertNoPendingGenerationUpdates(dshHome, profile, generation.pluginName)
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
          // Existing generations may still be executing (including the caller).
          // Publish updates only at cold start, without touching an in-use junction.
          let deferredSwitch = replacedGeneration && options.deferUpdates !== false
          try {
            if (!deferredSwitch) await publishInstalledGeneration(dshHome, generation.pluginName, profile, {
              syncBundles: false
            })
          } catch (error) {
            if (error?.code !== REAL_DIRECTORY_IN_PLACE || options.deferUpdates === false) {
              await writeDesired(dshHome, beforeDesired)
              if (error?.code === REAL_DIRECTORY_IN_PLACE && error instanceof Error) {
                error.message += ' Use the standard plugin manager to stage this update for restart.'
              }
              throw error
            }
            // Plugin Manager validates bundleDirectory rather than the Profile
            // path, which still exposes the old package here. Keep its manifest
            // consistent with those running bytes until cold-start projection.
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
              if (!deferredSwitch) {
                try {
                  await assertNoPendingGenerationUpdates(dshHome, profile, generation.pluginName)
                } catch (error) {
                  throw new Error('Rollback restored desired state but Profile cleanup is incomplete. Restart to finish cleanup without applying another pending update live.', { cause: error })
                }
              }
              try {
                if (!deferredSwitch) await projectGenerations(dshHome, profile)
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
            bundleDirectory: join(generation.directory, 'node_modules', generation.pluginName),
            replaced: replacedGeneration || deferredSwitch,
            restartRequired: deferredSwitch,
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
          bundleDirectory: result.bundleDirectory,
          replaced: result.replaced,
          restartRequired: result.restartRequired,
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
      const log = await createOperationLog(dshHome, profile)
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
          await assertNoPendingGenerationUpdates(dshHome, profile, request.name)
          const removedIds = new Set(
            generations.filter(item => item.pluginName === request.name).map(item => item.id)
          )
          const nextDesired = beforeDesired.filter(id => !removedIds.has(id))
          // Not an enabled generation: let Plugin Manager remove it with pnpm.
          if (nextDesired.length === beforeDesired.length) return false
          await writeDesired(dshHome, nextDesired)
          try {
            await publishGenerationManifest(dshHome, profile, { syncBundles: true })
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

    async validateSwitch(request) {
      await validatePluginSwitch(profileDirectory(dshHome, profile), request.name, request.enabled, {
        rowIds: request.rowIds ?? []
      })
    },

    async switched(request) {
      await recordPluginSwitch(profileDirectory(dshHome, profile), request.name, request.enabled, {
        rowIds: request.rowIds ?? []
      })
    },

    async removed(request) {
      await forgetPlugin(profileDirectory(dshHome, profile), request.name)
    }
  })
}
