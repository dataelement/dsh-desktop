/**
 * Host-contract compatibility preflight for #195.
 *
 * Pure evaluation of what `analyzeProfile()` already reports: a confirmed
 * peer mismatch (`satisfied === false`) is translated into a directional
 * verdict:
 *
 * - `belowMin`: the resolved version is older than every alternative's lower
 *   bound — the environment is too old for the plugin's declared contract.
 * - `aboveMax`: the resolved version is newer than every alternative's upper
 *   bound (or the exact pin). This is only a risk when the author expressed
 *   an explicit upper bound or exact pin; otherwise it is a warning, because
 *   the ecosystem currently has many sloppy `^0.0.1`-style declarations that
 *   work in practice.
 *
 * Everything else stays informational: `*`, prerelease-vs-`*` artifacts,
 * unparseable ranges, and optional peers never produce a risk here.
 */
import { analyzeProfile, compareSemver } from "./check.js";
import { profileDir, readInstalledManifest } from "./profile.js";
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
function parseComparator(part) {
    const p = part.trim();
    const m = /^(\^|~|>=|<=|>|<)?(.*)$/.exec(p);
    if (m === null)
        return null;
    const target = (m[2] ?? '').trim();
    if (!SEMVER.test(target))
        return null;
    const raw = m[1] ?? '';
    return { op: raw === '' ? 'exact' : raw, target };
}
/** Next breaking bump for `^` / `~`, using `-0` so prereleases compare consistently. */
function nextBound(target, kind) {
    const m = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/.exec(target);
    if (m === null)
        return null;
    const major = Number(m[1]);
    const minor = Number(m[2]);
    const patch = Number(m[3]);
    if (kind === '^') {
        if (major > 0)
            return `${major + 1}.0.0-0`;
        if (minor > 0)
            return `0.${minor + 1}.0-0`;
        return `0.0.${patch + 1}-0`;
    }
    return `${major}.${minor + 1}.0-0`;
}
function boundsFor(range) {
    const alternatives = [];
    for (const rawAlternative of range.split('||')) {
        const parts = rawAlternative.trim().split(/\s+/).filter(Boolean);
        const parsed = parts.map(parseComparator);
        if (parsed.some(part => part === null))
            return null;
        let lower = null;
        let upper = null;
        let explicitUpper = false;
        let exact = null;
        for (const part of parsed) {
            const p = part;
            if (p.op === 'exact') {
                exact = p.target;
                continue;
            }
            if (p.op === '^' || p.op === '~') {
                const bound = nextBound(p.target, p.op);
                if (bound === null)
                    return null;
                if (lower === null || compareSemver(p.target, lower.target) > 0)
                    lower = p;
                if (upper === null || compareSemver(bound, upper.target) < 0)
                    upper = { op: '<=', target: bound };
                continue;
            }
            if (p.op === '>=' || p.op === '>') {
                if (lower === null || compareSemver(p.target, lower.target) > 0)
                    lower = p;
            }
            else {
                if (upper === null || compareSemver(p.target, upper.target) < 0)
                    upper = p;
                explicitUpper = true;
            }
        }
        alternatives.push({ lower, upper, explicitUpper, exact });
    }
    return alternatives;
}
function belowAllMins(resolved, bounds) {
    return bounds.every(alternative => {
        if (alternative.exact !== null)
            return compareSemver(resolved, alternative.exact) < 0;
        if (alternative.lower === null)
            return false;
        const lower = alternative.lower;
        return lower.op === '>' ? compareSemver(resolved, lower.target) <= 0 : compareSemver(resolved, lower.target) < 0;
    });
}
function aboveAllMaxes(resolved, bounds) {
    return bounds.every(alternative => {
        if (alternative.exact !== null)
            return compareSemver(resolved, alternative.exact) > 0;
        if (alternative.upper === null)
            return false;
        const upper = alternative.upper;
        return upper.op === '<' ? compareSemver(resolved, upper.target) >= 0 : compareSemver(resolved, upper.target) > 0;
    });
}
function hasExplicitUpperOrExact(bounds) {
    return bounds.every(alternative => alternative.exact !== null || alternative.explicitUpper);
}
/** Translate one confirmed peer mismatch into a directional verdict. */
export function classifyPeer(plugin, peer, range, resolved, optional) {
    if (resolved === null)
        return { kind: 'none' };
    if (optional) {
        return {
            kind: 'warning',
            warning: { plugin, peer, range, resolved, reason: 'optional' },
        };
    }
    const bounds = boundsFor(range);
    if (bounds === null)
        return { kind: 'none' };
    if (belowAllMins(resolved, bounds)) {
        return {
            kind: 'risk',
            risk: { plugin, peer, range, resolved, direction: 'belowMin' },
        };
    }
    if (aboveAllMaxes(resolved, bounds)) {
        return hasExplicitUpperOrExact(bounds)
            ? {
                kind: 'risk',
                risk: { plugin, peer, range, resolved, direction: 'aboveMax' },
            }
            : {
                kind: 'warning',
                warning: { plugin, peer, range, resolved, reason: 'aboveMax' },
            };
    }
    return { kind: 'none' };
}
/** Whether a peer is declared optional in the installed plugin manifest. */
export function isOptionalPeer(profileDirectory, plugin, peer) {
    const manifest = readInstalledManifest('web', plugin, profileDirectory);
    return manifest?.peerDependenciesMeta?.[peer]?.optional === true;
}
/** Evaluate the current profile with the same machinery `/dsh-market/check` uses. */
export function assessCompatibility(profileDirectory, options) {
    const report = analyzeProfile(profileDirectory, options);
    const risks = [];
    const warnings = [];
    for (const mismatch of report.peerMismatches) {
        if (mismatch.satisfied !== false)
            continue;
        const optional = isOptionalPeer(profileDirectory, mismatch.plugin, mismatch.name);
        const verdict = classifyPeer(mismatch.plugin, mismatch.name, mismatch.range, mismatch.resolved, optional);
        if (verdict.kind === 'risk')
            risks.push(verdict.risk);
        else if (verdict.kind === 'warning')
            warnings.push(verdict.warning);
    }
    return { risks, warnings, duplicateNames: report.duplicateNames };
}
function riskId(risk) {
    return `${risk.plugin}\u0000${risk.peer}\u0000${risk.direction}`;
}
/** Risks present after a mutation but absent before it. */
export function introducedRisks(before, after) {
    const seen = new Set(before.risks.map(riskId));
    return after.risks.filter(risk => !seen.has(riskId(risk)));
}
/**
 * Cross-layer name collisions present after a mutation but absent before it
 * (#230 by @dxc-dxc).
 *
 * Keyed by NAME alone, not by the layer set: a collision the operation made
 * worse — same name, now shadowing across one more layer — is still the same
 * collision the profile already had, and re-reporting it would put the
 * operator back in front of a problem they did not just cause.
 *
 * This is what makes surfacing these safe at all. The underlying
 * `duplicateNames` is informational precisely because a healthy-but-messy
 * profile can carry collisions indefinitely; only the newly introduced ones
 * are attributable to the install that just ran, and therefore undoable by
 * rolling it back.
 */
export function introducedDuplicateNames(before, after) {
    const seen = new Set(before.duplicateNames.map(entry => entry.name));
    return after.duplicateNames.filter(entry => !seen.has(entry.name));
}
/** Convenience wrapper matching the profile helper signature. */
export function assessProfile(profile, explicitDir) {
    return assessCompatibility(profileDir(profile, explicitDir));
}
