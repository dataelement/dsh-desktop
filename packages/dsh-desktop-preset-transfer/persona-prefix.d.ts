export interface PersonaPrefixRewrite {
  text: string
  changed: boolean
  missingPrompt: boolean
}

export function migratePersonaPrefix(source: string): PersonaPrefixRewrite
