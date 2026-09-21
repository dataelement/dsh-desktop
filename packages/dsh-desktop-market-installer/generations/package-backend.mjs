import { randomUUID } from 'node:crypto'
import { mkdir, open, readFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { installGeneration, verifyGenerationPeers } from './installer.mjs'
import {
  listGenerations,
  readDesired,
  withRegistryLock,
  writeDesired
} from './registry.mjs'
import { projectGenerations, publishGenerationManifest, publishInstalledGeneration } from './projection.mjs'

const PROFILE = 'web'
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
 */
export function createGenerationPackageBackend(options) {
  const {
    dshHome,
    nodeExecutablePath,
    pnpmEntryPath,
    environment = process.env,
    spawnProcess,
    runInstall
  } = options

  return Object.freeze({
    async install(request) {
      const log = await createOperationLog(dshHome)
      let closed = false
      const finishLog = async () => {
        if (closed) return { output: '', truncated: false }
        closed = true
        return log.close()
      }
      const emit = async (text, stream = 'stdout') => {
        await log.append(text)
        request.onOutput?.(text, stream)
      }

      try {
        request.signal?.throwIfAborted()
        let expectedPluginName = request.expectedName
        let sourceDirectory
        let sourceSpec
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
          const install = await installGeneration({
            dshHome,
            profile: PROFILE,
            pluginSpec: request.spec,
            expectedPluginName,
            sourceDirectory,
            sourceSpec,
            nodeExecutablePath,
            pnpmEntryPath,
            environment,
            spawnProcess,
            runInstall,
            onTrace: line => { void emit(`${line}\n`) },
            onOutput: text => { void emit(text) }
          })
          if (!install.ok || install.generation === undefined) {
            return { ok: false, detail: install.detail ?? 'generation install failed' }
          }
          request.signal?.throwIfAborted()
          const generation = install.generation
          const peers = await verifyGenerationPeers(dshHome, generation)
          if (!peers.ok) {
            return { ok: false, detail: `generation peer validation failed: ${peers.problems.join('; ')}` }
          }
          const replaced = beforeGenerations.some(item =>
            beforeDesired.includes(item.id) && item.pluginName === generation.pluginName
          )
          const nextDesired = replaceDesiredGeneration(
            beforeDesired,
            await listGenerations(dshHome),
            generation.pluginName,
            generation.id
          )
          await writeDesired(dshHome, nextDesired)
          try {
            await publishInstalledGeneration(dshHome, generation.pluginName, PROFILE, {
              syncBundles: false
            })
          } catch (error) {
            await writeDesired(dshHome, beforeDesired)
            throw error
          }

          let committed = false
          const rollback = async () => {
            if (committed) return
            await writeDesired(dshHome, beforeDesired)
            await projectGenerations(dshHome, PROFILE)
          }
          return {
            ok: true,
            bundle: generation.pluginName,
            replaced,
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
        await withRegistryLock(dshHome, async () => {
          request.signal?.throwIfAborted()
          const beforeDesired = await readDesired(dshHome)
          const generations = await listGenerations(dshHome)
          const removedIds = new Set(
            generations.filter(item => item.pluginName === request.name).map(item => item.id)
          )
          const nextDesired = beforeDesired.filter(id => !removedIds.has(id))
          if (nextDesired.length === beforeDesired.length) {
            throw new Error(`No enabled generation for ${request.name}.`)
          }
          await writeDesired(dshHome, nextDesired)
          try {
            await publishGenerationManifest(dshHome, PROFILE, { syncBundles: true })
          } catch (error) {
            await writeDesired(dshHome, beforeDesired)
            throw error
          }
          await emit(`generation-remove: staged ${request.name} for removal on restart\n`)
        })
        const captured = await log.close()
        return { packageResult: { exitCode: 0, ...captured, logPath: log.path } }
      } catch (error) {
        await emit(`generation-remove: ${errorText(error)}\n`, 'stderr').catch(() => undefined)
        const captured = await log.close()
        return { packageResult: { exitCode: 1, ...captured, logPath: log.path } }
      }
    }
  })
}
