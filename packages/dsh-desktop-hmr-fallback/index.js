import { watch } from 'node:fs'
import { stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { Service } from '@deepseek-ai/cordis'

/**
 * The `hmr` service Harness needs, for hosts that cannot give it Node's
 * internal module loader.
 *
 * `runProfile` creates the full Cordis HMR service after boot whenever no
 * `hmr` service exists, and that service throws on construction without
 * `ctx.loader.internal` — taking the rest of profile boot with it, user
 * patch-layer watching included. A packaged Electron app is such a host: the
 * macOS Harness runs in a utility process, and `--expose-internals` reaches
 * its `execArgv` without reaching Node's option parser, so the internal
 * loader is absent no matter what the command line says. The
 * `node-addon-require-builtin` fallback the loader tries next is built for
 * plain Node and reports `Unsupported/no-realm` under Electron.
 *
 * Module-level hot replacement genuinely needs those internals and is not
 * reproduced here. Watching the user patch layer does not — that is a file
 * watcher and a callback — and it is the capability profile boot actually
 * asks for. The desktop already owns a full Harness restart for everything
 * else.
 */
export const name = 'dsh-desktop-hmr-fallback'
export const inject = ['loader']

const DEBOUNCE_MS = 100

export class ConfigWatchHmr extends Service {
  constructor(ctx) {
    super(ctx, 'hmr')
  }

  /**
   * Watch one exact config path and refresh on change — the subset of the
   * Cordis HMR contract `watchUserPatches` uses.
   * @param filename - config path to watch.
   * @param refresh - callback run serially on add, change, or unlink.
   * @returns a disposer, matching the service this stands in for.
   */
  async registerConfig(filename, refresh) {
    const target = resolve(filename)
    let signature = await stamp(target)
    let pending
    let queue = Promise.resolve()

    const check = () => {
      // Directory events do not reliably name the file that changed — macOS
      // omits it often enough that trusting the name refreshes on every
      // neighbour. The file's own mtime and size do say.
      queue = queue
        .then(async () => {
          const next = await stamp(target)
          if (next === signature) return
          signature = next
          // Serially, like the service this replaces: a refresh overlapping
          // itself would compose the patch layer against a half-applied tree.
          await refresh()
        })
        .catch((error) => this.ctx.logger?.warn?.(error))
    }
    const watcher = watch(dirname(target), { persistent: false }, () => {
      clearTimeout(pending)
      pending = setTimeout(check, DEBOUNCE_MS)
      pending.unref?.()
    })
    watcher.on('error', () => undefined)

    return async () => {
      clearTimeout(pending)
      watcher.close()
      await queue.catch(() => undefined)
    }
  }
}

/** A file's identity for change detection: empty while it does not exist. */
async function stamp(path) {
  try {
    const info = await stat(path)
    return `${info.mtimeMs}:${info.size}`
  } catch {
    return ''
  }
}

export function apply(ctx) {
  // A host that can reach Node's internals keeps the real thing, module-level
  // hot replacement included: development runs and the bundled-Node platforms
  // are unaffected by this package's presence.
  if (ctx.loader.internal !== undefined) return
  ctx.plugin(ConfigWatchHmr)
}
