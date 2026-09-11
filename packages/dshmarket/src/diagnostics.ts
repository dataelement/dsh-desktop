/** Versioned, read-only diagnostics shared by the host route and client. */
export const DIAGNOSTIC_SCHEMA = 'dsh-market/diagnostics/v1' as const

/** Conservative first set of known, identity-sensitive host contracts. */
export const KNOWN_SHARED_HOST_PACKAGES = [
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-attachment',
  '@deepseek-ai/dsh-llm',
  '@deepseek-ai/dsh-system-prompt',
  '@deepseek-ai/dsh-tools',
] as const

const knownSharedHostPackages = new Set<string>(KNOWN_SHARED_HOST_PACKAGES)

export interface PackageManifestFact {
  packageName: string
  manifest: unknown
}

export interface SharedHostPackageDependencyFinding {
  code: 'shared-host-package-dependency'
  severity: 'warning'
  subject: {
    kind: 'package'
    name: string
  }
  evidence: {
    basis: 'manifest-declaration'
    dependency: string
    declaredRange: string
    declaredIn: 'dependencies'
  }
}

export type DiagnosticFinding = SharedHostPackageDependencyFinding

export interface DiagnosticReportV1 {
  schema: typeof DIAGNOSTIC_SCHEMA
  findings: DiagnosticFinding[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Report exact manifest declarations; the resolved dependency tree is not inspected. */
function inspectKnownHostDependencyDeclarations(
  packageName: string,
  manifest: unknown,
): SharedHostPackageDependencyFinding[] {
  if (!isRecord(manifest) || !isRecord(manifest.dependencies)) return []

  const findings: SharedHostPackageDependencyFinding[] = []
  for (const dependency of Object.keys(manifest.dependencies).sort()) {
    const declaredRange = manifest.dependencies[dependency]
    if (!knownSharedHostPackages.has(dependency) || typeof declaredRange !== 'string') continue
    findings.push({
      code: 'shared-host-package-dependency',
      severity: 'warning',
      subject: { kind: 'package', name: packageName },
      evidence: {
        basis: 'manifest-declaration',
        dependency,
        declaredRange,
        declaredIn: 'dependencies',
      },
    })
  }
  return findings
}

/** Build a stable diagnostic envelope from installed package manifests. */
export function diagnosePackageManifests(packages: readonly PackageManifestFact[]): DiagnosticReportV1 {
  const sortedPackages = [...packages].sort((a, b) =>
    a.packageName < b.packageName ? -1 : a.packageName > b.packageName ? 1 : 0,
  )
  return {
    schema: DIAGNOSTIC_SCHEMA,
    findings: sortedPackages.flatMap(({ packageName, manifest }) => {
      if (!isRecord(manifest) || manifest.dsh === undefined) return []
      return inspectKnownHostDependencyDeclarations(packageName, manifest)
    }),
  }
}
