import type { Context } from '@deepseek-ai/cordis'
export const name: 'desktop-office'
export const inject: string[]
export interface Config {
  resources: string
  cli: string
}
export function apply(ctx: Context, config: Config): Promise<void>

export interface OfficeTemplateSelection {
  id: string
  mode: 'word' | 'excel'
  revision: string
}
/** Shared, persisted workflow selection and audit owned by the Desktop composer. */
export interface OfficeModes {
  state(sessionId: string): Promise<{ documentMode?: 'word' | 'excel'; selectedDocumentTemplate?: OfficeTemplateSelection; presentationMode?: 'ppt' }>
  select(sessionId: string, mode: 'word' | 'excel' | null): Promise<boolean>
  selectTemplate(sessionId: string, template: OfficeTemplateSelection): Promise<boolean>
  deselectTemplate(sessionId: string): Promise<boolean>
  record(sessionId: string, operation: string, facts: Record<string, unknown>): Promise<boolean>
}
declare module '@deepseek-ai/cordis' {
  interface Context { officeModes: OfficeModes }
}
