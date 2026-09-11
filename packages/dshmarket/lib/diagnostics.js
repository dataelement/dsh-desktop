/** Versioned, read-only diagnostics shared by the host route and client. */
export const DIAGNOSTIC_SCHEMA = 'dsh-market/diagnostics/v1';
/** Conservative first set of known, identity-sensitive host contracts. */
export const KNOWN_SHARED_HOST_PACKAGES = [
    '@deepseek-ai/cordis',
    '@deepseek-ai/dsh-attachment',
    '@deepseek-ai/dsh-llm',
    '@deepseek-ai/dsh-system-prompt',
    '@deepseek-ai/dsh-tools',
];
const knownSharedHostPackages = new Set(KNOWN_SHARED_HOST_PACKAGES);
function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
/** Report exact manifest declarations; the resolved dependency tree is not inspected. */
function inspectKnownHostDependencyDeclarations(packageName, manifest) {
    if (!isRecord(manifest) || !isRecord(manifest.dependencies))
        return [];
    const findings = [];
    for (const dependency of Object.keys(manifest.dependencies).sort()) {
        const declaredRange = manifest.dependencies[dependency];
        if (!knownSharedHostPackages.has(dependency) || typeof declaredRange !== 'string')
            continue;
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
        });
    }
    return findings;
}
/** Build a stable diagnostic envelope from installed package manifests. */
export function diagnosePackageManifests(packages) {
    const sortedPackages = [...packages].sort((a, b) => a.packageName < b.packageName ? -1 : a.packageName > b.packageName ? 1 : 0);
    return {
        schema: DIAGNOSTIC_SCHEMA,
        findings: sortedPackages.flatMap(({ packageName, manifest }) => {
            if (!isRecord(manifest) || manifest.dsh === undefined)
                return [];
            return inspectKnownHostDependencyDeclarations(packageName, manifest);
        }),
    };
}
