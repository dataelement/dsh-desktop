import type { Context } from '@deepseek-ai/cordis'
export const name: 'desktop-office'
export interface Config {
  resources: string
  cli: string
}
export function apply(ctx: Context, config: Config): Promise<void>
