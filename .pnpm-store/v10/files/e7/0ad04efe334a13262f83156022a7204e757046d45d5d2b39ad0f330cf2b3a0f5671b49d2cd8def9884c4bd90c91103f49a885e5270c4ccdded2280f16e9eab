/**
 * pnpm `--reporter=ndjson` progress parser (P1-6).
 *
 * pnpm's ndjson reporter is a bole stream on stdout: one JSON object per
 * line, e.g.
 *
 *   {"time":...,"level":"debug","name":"pnpm:stage","prefix":"...","stage":"resolution_started"}
 *   {"time":...,"level":"debug","name":"pnpm:progress","packageId":"...","status":"resolved"}
 *   {"time":...,"level":"debug","name":"pnpm:fetching-progress","packageId":"...","status":"started","size":123}
 *   {"time":...,"level":"debug","name":"pnpm:ignored-scripts","packageNames":["esbuild"]}
 *   {"time":...,"level":"error","name":"pnpm","err":{"message":"..."}}
 *
 * Verified against real pnpm 11.16.0 output (2026-08). Older pnpm majors
 * emit a different shape or nothing at all — callers fall back to human
 * line parsing when `seen` stays false.
 *
 * The reducer is pure and unit-testable: `feed` mutates the tracker's
 * internal snapshot, `snapshot` returns a serializable copy.
 */
export function emptyProgress() {
    return {
        phase: null,
        done: 0,
        total: null,
        currentPackage: null,
        downloaded: null,
        size: null,
        seen: false,
        error: null,
        errorCode: null,
        ignoredBuilds: [],
    };
}
export function createProgressTracker() {
    const snap = emptyProgress();
    const seenPackages = new Set();
    function dedupe(packageId) {
        if (typeof packageId !== 'string' || packageId === '')
            return;
        if (!seenPackages.has(packageId)) {
            seenPackages.add(packageId);
            snap.done += 1;
        }
    }
    function feed(line) {
        let event;
        try {
            event = JSON.parse(line);
        }
        catch {
            return; // human fallback lines are handled by the caller
        }
        if (typeof event !== 'object' || event === null)
            return;
        const msg = event;
        const name = msg.name;
        if (typeof name !== 'string')
            return;
        if (name === 'pnpm:stage') {
            const stage = msg.stage;
            if (stage === 'resolution_started')
                snap.phase = 'resolving';
            else if (stage === 'resolution_done')
                snap.phase = 'downloading';
            else if (stage === 'importing_started' || stage === 'importing_done')
                snap.phase = 'linking';
            snap.seen = true;
            return;
        }
        if (name === 'pnpm:progress') {
            snap.seen = true;
            const status = msg.status;
            if (status === 'resolved') {
                if (snap.phase === null)
                    snap.phase = 'resolving';
                dedupe(msg.packageId);
            }
            else if (status === 'fetched' || status === 'found_in_store') {
                snap.phase = 'downloading';
                snap.currentPackage = typeof msg.packageId === 'string' ? msg.packageId : snap.currentPackage;
                dedupe(msg.packageId);
            }
            return;
        }
        if (name === 'pnpm:fetching-progress') {
            snap.seen = true;
            snap.phase = 'downloading';
            if (typeof msg.packageId === 'string')
                snap.currentPackage = msg.packageId;
            if (typeof msg.size === 'number')
                snap.size = msg.size;
            if (typeof msg.downloaded === 'number')
                snap.downloaded = msg.downloaded;
            dedupe(msg.packageId);
            return;
        }
        if (name === 'pnpm:lifecycle') {
            snap.seen = true;
            snap.phase = 'building';
            const wd = typeof msg.wd === 'string' ? msg.wd : '';
            const dep = typeof msg.depPath === 'string' ? msg.depPath : '';
            const base = wd.split(/[\\/]/).filter(Boolean).pop();
            snap.currentPackage = base ?? (dep !== '' ? dep : snap.currentPackage);
            return;
        }
        if (name === 'pnpm:stats') {
            // added/removed counts land after the import pass — still linking.
            if (msg.added !== undefined || msg.removed !== undefined)
                snap.phase = 'linking';
            snap.seen = true;
            return;
        }
        if (name === 'pnpm:ignored-scripts') {
            snap.seen = true;
            if (Array.isArray(msg.packageNames)) {
                for (const pkg of msg.packageNames) {
                    // pnpm's ndjson event reports version-qualified names (cloudflared@0.7.3);
                    // the approve-builds allowlist keys and node_modules lookups use bare
                    // package names, so strip the suffix (same rule as the human-line
                    // fallback in install.ts's parseIgnoredBuilds).
                    const at = typeof pkg === 'string' ? pkg.lastIndexOf('@') : -1;
                    const bare = at > 0 ? pkg.slice(0, at) : pkg;
                    if (typeof bare === 'string' && bare !== '' && !snap.ignoredBuilds.includes(bare))
                        snap.ignoredBuilds.push(bare);
                }
            }
            return;
        }
        if (name === 'pnpm' && msg.level === 'error') {
            const err = (msg.err ?? {});
            const message = typeof err.message === 'string' ? err.message : '';
            // Keep more than the old 400: ERR_PNPM_UNEXPECTED_STORE spends most of
            // its message naming two absolute store paths, and truncating them is
            // exactly the information a user needs to fix it by hand (#244).
            if (message !== '')
                snap.error = message.slice(0, 2000);
            if (typeof err.code === 'string' && err.code !== '')
                snap.errorCode = err.code;
            return;
        }
    }
    function reset() {
        seenPackages.clear();
        const fresh = emptyProgress();
        Object.assign(snap, fresh);
    }
    return {
        get snapshot() {
            return { ...snap, ignoredBuilds: [...snap.ignoredBuilds] };
        },
        feed,
        reset,
    };
}
