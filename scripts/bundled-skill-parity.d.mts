export interface BundledSkillParityOptions {
  sourceSkillDirectory: string
  packagedSkillDirectory: string
}

export interface BundledSkillParityResult {
  slug: string
  version: string
  fingerprint: string
}

export function bundledSkillFingerprint(root: string): string

export function verifyBundledSkillParity(
  options: BundledSkillParityOptions
): BundledSkillParityResult
