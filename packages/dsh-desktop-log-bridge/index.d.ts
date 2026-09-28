import type { Context } from '@deepseek-ai/cordis'

export declare const name: 'dsh-desktop-log-bridge'
/** Marks every bridged line in harness.log. */
export declare const LINE_PREFIX: '[harness-log]'
/** Written once per launch when the bridge is active. */
export declare const BRIDGE_READY_LINE: string
export declare function bridgeLines(type: string, source: string, text: unknown): string[]
export declare function createLimitedWriter(
  write: (text: string) => void,
  now?: () => number
): (lines: string[]) => void
export declare function apply(ctx: Context): void
