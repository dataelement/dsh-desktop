import { delimiter } from 'node:path'

/**
 * Electron's Node mode for the Host, plus the shell launcher directory used by package scripts.
 * `dshHome` is always set so the child does not fall through to `~/.dsh`.
 */
export function desktopNodeEnvironment(
  executable: string,
  bin: string | undefined,
  environment: NodeJS.ProcessEnv,
  dshHome: string
): NodeJS.ProcessEnv {
  return {
    ...environment,
    DSH_HOME: dshHome,
    ELECTRON_RUN_AS_NODE: '1',
    ...(bin === undefined ? {} : {
      DSH_DESKTOP_NODE_EXECUTABLE: executable,
      PATH: `${bin}${delimiter}${environment.PATH ?? ''}`
    })
  }
}
