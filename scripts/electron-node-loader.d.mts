export const HARNESS_INTERNAL_MODULES: readonly string[]

export interface ElectronNodeRuntime {
  electron: string | null
  node: string
  v8: string
}

export type ElectronNodeLoaderProbe =
  | { ok: true; runtime: ElectronNodeRuntime }
  | { ok: false; detail: string }

export function harnessLoaderAnchor(projectRoot: string): string
export function electronExecutable(projectRoot: string): string
export function probeElectronNodeLoader(options: {
  executable: string
  anchor: string
  timeoutMs?: number
}): ElectronNodeLoaderProbe
