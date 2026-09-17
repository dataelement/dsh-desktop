/**
 * Event log for issue reports: what the market did and how it failed,
 * exportable as plain text from `/dsh-market/logs`.
 *
 * Privacy: entries are sanitized on write — the home directory collapses to
 * `~`, and common credential shapes (API keys, GitHub/npm tokens, bearer
 * headers) are masked. The in-memory buffer dies with the process and holds
 * at most {@link MAX_ENTRIES} entries; a process that also configures a
 * persistent sink appends every event there, capped at
 * {@link PERSISTENT_MAX_BYTES}, because the failures worth reporting most —
 * the ones that only appear after a restart — used to take their story with
 * them when the process died (#341).
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { homedir } from 'node:os';
const MAX_ENTRIES = 200;
const DETAIL_MAX = 600;
const PERSISTENT_MAX_BYTES = 256 * 1024;
const entries = [];
let persistentFile = null;
/** Bytes in the sink file, tracked so the cap holds without a stat per event. */
let persistentBytes = 0;
function sanitize(text) {
    return text
        .replaceAll(homedir(), '~')
        // Log-injection guard: control characters (newlines above all) would
        // forge extra lines in the exported log file. The #98 routes pass
        // user-supplied names into logEvent (bundle-order order entries, trial
        // messages), so strip them at the single choke point (issue #98
        // analysis: log filtering).
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .replace(/sk-[A-Za-z0-9_-]{8,}/g, 'sk-***')
        .replace(/gh[pousr]_[A-Za-z0-9]{16,}/g, 'gh*_***')
        .replace(/npm_[A-Za-z0-9]{16,}/g, 'npm_***')
        .replace(/bearer\s+\S+/gi, 'Bearer ***')
        .replace(/(authorization|token|apikey|api-key|password)(["':=\s]+)\S+/gi, '$1$2***');
}
/**
 * Append one event, sanitized and truncated.
 * @param level - severity for the export listing.
 * @param event - short machine-ish event name (e.g. `install`, `hot-mount`).
 * @param detail - free-form context; credentials and home paths are masked.
 */
export function logEvent(level, event, detail) {
    const entry = {
        at: new Date().toISOString(),
        level,
        event,
        detail: sanitize(detail).slice(0, DETAIL_MAX),
    };
    entries.push(entry);
    if (entries.length > MAX_ENTRIES)
        entries.splice(0, entries.length - MAX_ENTRIES);
    if (persistentFile === null)
        return;
    try {
        const line = `${JSON.stringify(entry)}\n`;
        appendFileSync(persistentFile, line);
        persistentBytes += line.length;
        // Trimming only on mount left the cap unenforced for the life of a
        // process: 20k events grew the file to 3.2 MB in a measurement, and a
        // retry loop is exactly the situation that both logs hardest and never
        // restarts. Re-trim in place once the ceiling is crossed.
        if (persistentBytes > PERSISTENT_MAX_BYTES)
            trimPersistentLog(persistentFile);
    }
    catch {
        // Only append failures reach this: a read-only or full disk. The
        // in-memory log still serves this session's export; persistence
        // disables itself so one bad write cannot break every future event.
        persistentFile = null;
    }
}
/**
 * Rewrite the sink keeping only its newest half, and resync the byte count.
 * @param file - the sink file to trim in place.
 */
function trimPersistentLog(file) {
    const lines = readFileSync(file, 'utf8').split('\n').filter(line => line !== '');
    const kept = [];
    let bytes = 0;
    for (let index = lines.length - 1; index >= 0 && bytes <= PERSISTENT_MAX_BYTES / 2; index -= 1) {
        kept.unshift(`${lines[index]}\n`);
        bytes += lines[index].length + 1;
    }
    writeFileSync(file, kept.join(''));
    persistentBytes = bytes;
}
/**
 * Append events to a profile-owned file, or stop doing so.
 *
 * Called once per mount with `<profile>/.dsh-market/log.ndjson` and with
 * `null` on dispose. An oversized file is trimmed to its newest half on
 * configure, so one long-lived profile cannot grow it without bound.
 * @param file - the sink file, or null to disable persistence.
 */
export function configurePersistentLog(file) {
    persistentFile = file;
    if (file === null)
        return;
    try {
        mkdirSync(dirname(file), { recursive: true });
        persistentBytes = existsSync(file) ? statSync(file).size : 0;
        if (persistentBytes <= PERSISTENT_MAX_BYTES)
            return;
        trimPersistentLog(file);
    }
    catch {
        // Only configure-time filesystem failures reach this (the directory
        // cannot be created, the file cannot be read or rewritten). The market
        // must mount regardless; the session simply runs memory-only.
        persistentFile = null;
    }
}
/**
 * The newest persisted lines, for the export's prior-session section.
 * @param file - the sink file to read.
 * @param maxLines - how many trailing lines to return.
 * @returns parsed-or-raw lines, newest last; empty when nothing is readable.
 */
export function readPersistentLog(file, maxLines = 80) {
    try {
        return readFileSync(file, 'utf8').split('\n').filter(line => line !== '').slice(-maxLines);
    }
    catch {
        // Only a missing or unreadable file reaches this: there are no prior
        // sessions to show, which is the empty answer.
        return [];
    }
}
/**
 * How to read the `at` fields, said once at the top.
 *
 * Every line is stamped in UTC and stays that way: this file is written to
 * be attached to an issue, and a maintainer comparing two reporters' logs
 * needs one clock, not each machine's. Localizing the lines would make the
 * artifact worse at the only job it has.
 *
 * But the reader is looking at their own wall clock, and #449 is what that
 * costs when nobody says so — a UTC+8 user saw `07:32` for something they
 * watched happen at `15:32` and could not tell whether the log was skewed
 * or their own machine was. So the offset is stated, with the arithmetic
 * already done: "add 8h" is a fact they can use without converting
 * anything, and it is the one line that turns the timestamps from
 * suspicious into usable.
 * @returns the note, or null when this machine is already on UTC.
 */
function timezoneNote(now = new Date()) {
    // getTimezoneOffset is minutes to ADD to local to reach UTC, so it is
    // positive west of Greenwich — the opposite sign from how offsets are
    // written. Negate it once here rather than at each use.
    const minutes = -now.getTimezoneOffset();
    if (minutes === 0)
        return null;
    const sign = minutes < 0 ? '-' : '+';
    const abs = Math.abs(minutes);
    const hh = String(Math.floor(abs / 60)).padStart(2, '0');
    const mm = String(abs % 60).padStart(2, '0');
    let zone = '';
    try {
        const named = Intl.DateTimeFormat().resolvedOptions().timeZone;
        zone = typeof named === 'string' && named !== '' ? ` (${named})` : '';
    }
    catch { /* a runtime without full ICU still gets the offset */ }
    const shift = mm === '00' ? `${String(Math.floor(abs / 60))}h` : `${String(Math.floor(abs / 60))}h${mm}m`;
    const direction = minutes < 0 ? 'subtract' : 'add';
    return `timestamps: UTC — this machine is UTC${sign}${hh}:${mm}${zone}, so ${direction} ${shift} for local time`;
}
/**
 * The export document for bug reports.
 * @param header - environment lines to prepend (version, platform — no paths).
 * @returns plain text, newest entry last.
 */
export function exportLogs(header, snapshot = [], priorSessions = []) {
    const note = timezoneNote();
    const head = [
        ...Object.entries(header).map(([key, value]) => `${key}: ${sanitize(value)}`),
        ...(note === null ? [] : [note]),
    ];
    const lines = entries.map(e => `${e.at} [${e.level}] ${e.event}: ${e.detail}`);
    return [
        '# dsh-market log export',
        ...head,
        '',
        // The state of the profile RIGHT NOW, which does not depend on anything
        // having been recorded this session (#341). The buffer dies with the
        // process, so the failures worth reporting most — the ones that only
        // appear after a restart — were exactly the ones whose export said
        // "(no events this session)". This part still answers.
        ...(snapshot.length > 0 ? ['## profile state', ...snapshot.map(line => sanitize(line)), ''] : []),
        ...(priorSessions.length > 0 ? ['## previous sessions (persisted log)', ...priorSessions.map(line => sanitize(line)), ''] : []),
        '## events this session',
        ...(lines.length > 0 ? lines : ['(none — the buffer starts empty on every start)']),
        '',
    ].join('\n');
}
