/**
 * Unpackaged Windows development deadlocks in `@deepseek-ai/dsh-hmr`:
 * the watcher never becomes ready, so profile boot never finishes.
 * Packaged launches keep the upstream service.
 */
export function skipBlockingWindowsDevHmr(packaged: boolean, platform: NodeJS.Platform): boolean {
  return !packaged && platform === 'win32'
}
