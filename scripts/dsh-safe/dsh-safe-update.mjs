#!/usr/bin/env node
/**
 * dsh-safe-update — keep DSH Desktop up to date without breaking plugins.
 *
 * Why plugins break on updates
 * ----------------------------
 * The DSH Desktop app bundles a DSH *core* (dsh-app-boot + @deepseek-ai/dsh-*).
 * Every plugin declares peerDependencies on @deepseek-ai/dsh-* core packages.
 * At profile boot, app-boot's evaluatePluginCompatibility checks each plugin:
 *   - peer range workspace:^|~|* counts as the current runtime (always OK)
 *   - any other range must semver.satisfies(runtime, range, {includePrerelease})
 *   - one failing peer => the plugin is DENIED at profile startup until an
 *     exact-version exemption exists in <profile>/compatibility.json.
 * Plugin authors pin peers to the core they tested on, so the *latest* plugin
 * version is often incompatible with the core your app bundles.
 *
 * Commands
 * --------
 *   audit        (default) report installed plugins vs bundled core. Read-only.
 *   fix          for every installed-but-incompatible plugin:
 *                   - newer compatible version exists -> print the exact
 *                     name@version to install in the plugin market
 *                   - otherwise grant an exemption in compatibility.json
 *                     (timestamped backup + advisory lock + change detection)
 *   pre-update   run AFTER updating the DSH Desktop app: auto-grant exemptions
 *                for plugins the new core no longer satisfies, then re-audit.
 *   spec <pkg>   print the newest version of <pkg> compatible with the core
 *                (paste into the plugin market UI).
 *   verify       validate compatibility.json against the official contract and
 *                report active / stale exemptions, then re-audit.
 *
 * Global flags:
 *   --dry-run    fix/pre-update print intended writes without touching files
 *   --json       machine-readable audit output (audit/verify)
 *
 * Exit codes:
 *   0  success, no incompatible plugins (or handled)
 *   2  success, incompatible plugins present (listed; exemptions may be needed)
 *   1  error (bad state, fetch failure, refused write)
 *
 * Safety design
 * -------------
 *   - audit/spec/verify are strictly read-only (verify writes nothing)
 *   - the ONLY file ever written is <profile>/compatibility.json
 *   - writes are atomic (tmp + rename), under an O_EXCL advisory lock
 *   - the file is re-read immediately before writing; if it changed since our
 *     read (e.g. the app or a second dsh-safe run touched it), the write is
 *     refused rather than clobbered
 *   - a timestamped backup is taken before every write
 *   - exemptions use the exact contract app-boot validates:
 *       { "<name>@<exactVersion>": ["<exactRuntime>", ...] }
 *   - never mutates plugin installs (the market UI owns generation links)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// DSH Desktop puts its own (Electron) node on PATH. Electron's node wraps fs
// with asar support and refuses to hand out raw .asar bytes. Re-spawn once
// with ELECTRON_NO_ASAR=1 so readFileSync below returns the archive as a file.
if (process.versions.electron && !process.env.ELECTRON_NO_ASAR) {
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync(process.execPath, process.argv.slice(1), {
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_NO_ASAR: '1' },
  });
  process.exit(r.status ?? 1);
}

const require = createRequire(import.meta.url);
const semver = require(path.join(path.dirname(fileURLToPath(import.meta.url)), 'vendor', 'semver', 'index.js'));

const APP = '/Applications/DSH Desktop.app';
const ASAR = path.join(APP, 'Contents', 'Resources', 'app.asar');
const DSH_HOME = path.join(process.env.HOME, 'Library', 'Application Support', 'dsh-desktop', 'harness');
const PROFILE_DIR = process.env.DSH_PROFILE_DIR ?? path.join(DSH_HOME, 'profiles', 'web');
const COMPAT_FILE = path.join(PROFILE_DIR, 'compatibility.json');
const LOCK_FILE = `${COMPAT_FILE}.lock`;
const LOCK_STALE_MS = 60_000;

// ---------------------------------------------------------------- arguments
const argv = process.argv.slice(2);
const FLAGS = new Set(argv.filter((a) => a.startsWith('--')));
const DRY_RUN = FLAGS.has('--dry-run');
const JSON_OUT = FLAGS.has('--json');
const cmd = (argv.find((a) => !a.startsWith('--')) ?? 'audit');

// ------------------------------------------------------------------- errors
class Fatal extends Error {}
function fail(message) {
  throw new Fatal(message);
}

// ---------------------------------------------------------------- runtime core
function readCoreVersion() {
  // Runtime version = the version of @deepseek-ai/dsh-app-boot bundled in
  // app.asar (getDshRuntimeVersion reads its own package.json). The asar is a
  // plain concatenation of file contents, so scan the raw bytes.
  let buf;
  try {
    buf = fs.readFileSync(ASAR);
  } catch (e) {
    fail(`cannot read ${ASAR}: ${e.message}`);
  }
  const text = buf.toString('latin1');
  const marker = '@deepseek-ai/dsh-app-boot';
  let i = -1;
  while ((i = text.indexOf(marker, i + 1)) !== -1) {
    // window starts right after the name so form 1 can be anchored at ^
    const window = text.slice(i + marker.length, i + marker.length + 600);
    // form 1: app package.json dependency map -> "<marker>": "0.1.7-rc.2"
    // (anchored: the version must follow the name, so JS imports can't match)
    const depMap = /^\s*\\?"?\s*:\s*"([0-9][^"]{0,32})"/.exec(window);
    if (depMap && semver.valid(depMap[1])) return { version: depMap[1], source: 'app.asar (app package.json deps)' };
    // form 2: the app-boot package.json itself -> "version":"0.1.7-rc.2"
    const self = /version\\?"?\s*:\s*\\?"?([0-9][^"\\,}]{0,32})/.exec(window);
    if (self && semver.valid(self[1])) return { version: self[1], source: 'app.asar (dsh-app-boot)' };
  }
  fail(`could not detect bundled core version from ${ASAR}`);
}

// ------------------------------------------------------------------- plugins
function readProfilePackageJson() {
  const pkgPath = path.join(PROFILE_DIR, 'package.json');
  try {
    const m = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (typeof m !== 'object' || m === null) fail(`profile package.json is not an object: ${pkgPath}`);
    return m;
  } catch (e) {
    if (e instanceof Fatal) throw e;
    fail(`cannot read profile package.json: ${e.message} (is the DSH Desktop profile ${PROFILE_DIR} intact?)`);
  }
}

function readInstalledPlugins() {
  const pkg = readProfilePackageJson();
  const deps = pkg.dependencies ?? {};
  const out = [];
  for (const [name, spec] of Object.entries(deps)) {
    const manifestPath = path.join(PROFILE_DIR, 'node_modules', name, 'package.json');
    if (!fs.existsSync(manifestPath)) {
      out.push({ name, spec, state: 'not-installed' });
      continue;
    }
    try {
      const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (typeof m !== 'object' || m === null || typeof m.version !== 'string' || !semver.valid(m.version)) {
        out.push({ name, spec, state: 'bad-manifest', note: `invalid version in ${manifestPath}` });
        continue;
      }
      out.push({ name, spec, manifest: m, state: 'installed' });
    } catch {
      out.push({ name, spec, state: 'bad-manifest', note: `unreadable manifest ${manifestPath}` });
    }
  }
  return out;
}

/** Mirror of app-boot evaluatePluginCompatibility (peer rules only). */
function incompatiblePeers(manifest, runtime) {
  const peers = manifest.peerDependencies ?? {};
  if (typeof peers !== 'object' || peers === null) return {};
  const bad = {};
  for (const [name, range] of Object.entries(peers)) {
    if (typeof range !== 'string') continue;
    if (name !== '@deepseek-ai/dsh' && !name.startsWith('@deepseek-ai/dsh-')) continue;
    const requirement = ['workspace:^', 'workspace:~', 'workspace:*'].includes(range) ? runtime : range;
    if (requirement.trim() === '' || !semver.satisfies(runtime, requirement, { includePrerelease: true })) {
      bad[name] = range;
    }
  }
  return bad;
}

// ------------------------------------------------------------------------ npm
const npmCache = new Map();
async function fetchNpm(name) {
  if (npmCache.has(name)) return npmCache.get(name);
  // scoped packages use the registry's canonical %2F form: @scope%2Fname
  const url = `https://registry.npmjs.org/${name.replace('/', '%2F')}`;
  let res;
  try {
    res = await fetch(url, { headers: { accept: 'application/json' } });
  } catch (e) {
    throw new Error(`npm ${name}: network error (${e.cause?.code ?? e.message})`);
  }
  if (!res.ok) throw new Error(`npm ${name}: HTTP ${res.status}`);
  const doc = await res.json();
  if (typeof doc !== 'object' || doc === null || typeof doc.versions !== 'object') {
    throw new Error(`npm ${name}: unexpected registry document`);
  }
  npmCache.set(name, doc);
  return doc;
}

/** Newest version whose dsh-* peer ranges all satisfy `runtime`; null if none. */
function safeLatestVersion(doc, runtime) {
  const versions = Object.keys(doc.versions ?? {});
  const sorted = semver.sort(versions.filter((v) => semver.valid(v)));
  for (let i = sorted.length - 1; i >= 0; i--) {
    const v = sorted[i];
    const manifest = doc.versions[v] ?? {};
    if (Object.keys(incompatiblePeers(manifest, runtime)).length === 0) return v;
  }
  return null;
}

// -------------------------------------------------------- compatibility.json
const EXEMPTION_KEY = /^((?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*)@([0-9][^@\s]*)$/;

function readExemptions() {
  if (!fs.existsSync(COMPAT_FILE)) return { exemptions: {}, created: true, rawText: null };
  const rawText = fs.readFileSync(COMPAT_FILE, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    fail(`compatibility.json is not valid JSON — repair it before running fix (file: ${COMPAT_FILE}): ${e.message}`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    fail(`compatibility.json is not a plain object — refusing to touch it: ${COMPAT_FILE}`);
  }
  return { exemptions: parsed, created: false, rawText };
}

/** Validate the file against the exact contract app-boot enforces. */
function validateExemptionShape(exemptions) {
  const problems = [];
  for (const [key, value] of Object.entries(exemptions)) {
    const m = EXEMPTION_KEY.exec(key);
    if (!m) problems.push(`bad key "${key}" (need exact name@version)`);
    else if (!semver.valid(m[2])) problems.push(`key "${key}": version "${m[2]}" is not exact SemVer`);
    if (!Array.isArray(value) || value.some((v) => typeof v !== 'string' || semver.valid(v) === null)) {
      problems.push(`key "${key}": value must be an array of exact runtime SemVer strings`);
    }
  }
  return problems;
}

function backupCompatFile() {
  if (!fs.existsSync(COMPAT_FILE)) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const bak = `${COMPAT_FILE}.bak-${stamp}`;
  try {
    fs.copyFileSync(COMPAT_FILE, bak);
  } catch (e) {
    fail(`backup of compatibility.json failed: ${e.message}`);
  }
  return bak;
}

function acquireLock() {
  try {
    const fd = fs.openSync(LOCK_FILE, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY, 0o644);
    fs.writeSync(fd, JSON.stringify({ pid: process.pid, at: Date.now() }) + '\n');
    fs.closeSync(fd);
    return;
  } catch (e) {
    if (e.code !== 'EEXIST') fail(`lock: ${e.message}`);
    // existing lock — is it stale?
    let age = Infinity;
    try {
      const info = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
      age = Date.now() - (info.at ?? 0);
    } catch { /* unreadable -> treat as stale */ }
    if (age < LOCK_STALE_MS) {
      fail(`another dsh-safe run is in progress (lock ${LOCK_FILE}, ${Math.round(age / 1000)}s old) — try again shortly`);
    }
    try { fs.unlinkSync(LOCK_FILE); } catch { /* proceed */ }
  }
}

function releaseLock() {
  try { fs.unlinkSync(LOCK_FILE); } catch { /* already gone */ }
}

/** Grants an exemption; returns the key only when a new entry was added. */
function grantExemption(exemptions, pluginName, pluginVersion, runtime) {
  if (!semver.valid(pluginVersion) || !semver.valid(runtime)) {
    fail(`refusing to write exemption with non-exact versions: ${pluginName}@${pluginVersion} / ${runtime}`);
  }
  const key = `${pluginName}@${pluginVersion}`;
  const list = Array.isArray(exemptions[key]) ? exemptions[key] : [];
  if (list.includes(runtime)) return null; // already granted
  list.push(runtime);
  exemptions[key] = list;
  return key;
}

function writeExemptions(exemptions, originalRawText) {
  // change detection: refuse to clobber concurrent modifications
  const currentRaw = fs.existsSync(COMPAT_FILE) ? fs.readFileSync(COMPAT_FILE, 'utf8') : null;
  if (originalRawText !== null && currentRaw !== originalRawText) {
    fail(`compatibility.json changed while we were working (app or another process?) — aborting, re-run to merge`);
  }
  const problems = validateExemptionShape(exemptions);
  if (problems.length) fail(`refusing to write invalid exemption data:\n  - ${problems.join('\n  - ')}`);
  const tmp = `${COMPAT_FILE}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(exemptions, null, 2) + '\n');
    fs.renameSync(tmp, COMPAT_FILE);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    fail(`write failed: ${e.message}`);
  }
}

// ---------------------------------------------------------------------- audit
async function auditPlugins(runtime) {
  const rows = [];
  for (const p of readInstalledPlugins()) {
    if (p.state !== 'installed') {
      rows.push({ ...p, status: 'NOT INSTALLED' });
      continue;
    }
    const bad = incompatiblePeers(p.manifest, runtime);
    const row = {
      name: p.name,
      spec: p.spec,
      installed: p.manifest.version,
      status: Object.keys(bad).length ? 'INCOMPATIBLE' : 'OK',
      badPeers: Object.keys(bad).length ? bad : undefined,
    };
    if (p.spec.startsWith('github:') || p.spec.startsWith('git+')) {
      row.source = 'git-pinned';
      try {
        const doc = await fetchNpm(p.name);
        row.npmLatest = doc['dist-tags']?.latest ?? null;
      } catch { row.npmLatest = 'n/a (not on npm)'; }
      rows.push(row);
      continue;
    }
    try {
      const doc = await fetchNpm(p.name);
      row.npmLatest = doc['dist-tags']?.latest ?? null;
      row.safeLatest = safeLatestVersion(doc, runtime);
      if (row.safeLatest && semver.gt(row.safeLatest, row.installed, { includePrerelease: true })) {
        row.safeUpgrade = `${p.name}@${row.safeLatest}`;
      }
    } catch (e) {
      row.npmError = e.message;
    }
    rows.push(row);
  }
  return rows;
}

function printAudit(runtime, rows) {
  const pad = (s, n) => String(s ?? '').padEnd(n);
  console.log(`\nDSH Desktop core (runtime): ${runtime}`);
  console.log(`Profile: ${PROFILE_DIR}\n`);
  console.log(`${pad('PLUGIN', 42)} ${pad('INSTALLED', 12)} ${pad('SAFE-LATEST', 12)} ${pad('NPM-LATEST', 12)} STATUS`);
  console.log('-'.repeat(100));
  for (const r of rows) {
    let status = r.status;
    if (r.safeUpgrade) status = `OK — safe upgrade: ${r.safeUpgrade}`;
    console.log(`${pad(r.name, 42)} ${pad(r.installed ?? '-', 12)} ${pad(r.safeLatest ?? '-', 12)} ${pad(r.npmLatest ?? '-', 12)} ${status}`);
    if (r.badPeers) {
      for (const [name, range] of Object.entries(r.badPeers)) {
        console.log(`    ✗ peer ${name}: "${range}" does not include ${runtime}`);
      }
    }
    if (r.npmError) console.log(`    ! npm lookup: ${r.npmError}`);
  }
  console.log('');
}

// ----------------------------------------------------------------------- main
async function main() {
  const { version: runtime } = readCoreVersion();

  if (cmd === 'spec') {
    const rest = argv.filter((a) => !a.startsWith('--'));
    const name = rest[rest.indexOf('spec') + 1];
    if (!name || !/^(@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/.test(name)) {
      fail('usage: dsh-safe spec <package-name>');
    }
    let doc;
    try {
      doc = await fetchNpm(name);
    } catch (e) {
      fail(e.message);
    }
    const safe = safeLatestVersion(doc, runtime);
    console.log(safe
      ? `${name}@${safe}`
      : `NO_COMPATIBLE_VERSION (runtime ${runtime}); latest=${doc['dist-tags']?.latest} — run "fix" after installing to grant an exemption`);
    return;
  }

  const rows = await auditPlugins(runtime);

  if (JSON_OUT) {
    console.log(JSON.stringify({ runtime, profile: PROFILE_DIR, rows }, null, 2));
  } else {
    printAudit(runtime, rows);
  }

  const incompatible = rows.filter((r) => r.status === 'INCOMPATIBLE');
  const upgrades = rows.filter((r) => r.safeUpgrade);

  if (cmd === 'audit') {
    if (incompatible.length === 0) {
      if (!JSON_OUT) console.log('All installed plugins satisfy the bundled core. Nothing to fix.');
    } else if (!JSON_OUT) {
      console.log(`${incompatible.length} incompatible plugin(s) — run "dsh-safe fix" to grant exemptions / find safe upgrades.`);
    }
    if (!JSON_OUT && upgrades.length) {
      console.log(`Safe upgrades available (compatible with core ${runtime}):`);
      for (const r of upgrades) console.log(`  - ${r.safeUpgrade}`);
    }
    process.exitCode = incompatible.length ? 2 : 0;
    return;
  }

  if (cmd === 'verify') {
    const { exemptions, created } = readExemptions();
    const problems = validateExemptionShape(exemptions);
    if (JSON_OUT) {
      console.log(JSON.stringify({ file: COMPAT_FILE, exists: !created, problems, exemptions }, null, 2));
    } else if (created) {
      console.log(`compatibility.json: absent (no exemptions granted) — OK.`);
    } else {
      const installedNames = new Set(rows.filter((r) => r.state !== 'not-installed').map((r) => r.name));
      console.log(`compatibility.json: present, ${Object.keys(exemptions).length} exemption(s).`);
      for (const [key, list] of Object.entries(exemptions)) {
        const pkgName = key.split('@').slice(0, -1).join('@');
        const marker = installedNames.has(pkgName) ? 'active' : 'stale (plugin not installed)';
        console.log(`  - ${key} -> [${list.join(', ')}]  (${marker})`);
      }
      if (problems.length) console.log(`  PROBLEMS:\n  - ${problems.join('\n  - ')}`);
      else console.log('  format: valid (matches the app-boot contract).');
    }
    process.exitCode = problems.length ? 1 : (incompatible.length ? 2 : 0);
    return;
  }

  // ---- fix / pre-update: the only code paths that write anything
  if (cmd !== 'fix' && cmd !== 'pre-update') fail(`unknown command: ${cmd} (use audit | fix | pre-update | spec | verify)`);

  if (incompatible.length === 0) {
    if (!JSON_OUT) console.log('No incompatible installed plugins — nothing to fix.');
    if (upgrades.length && !JSON_OUT) {
      console.log('Safe upgrades available (compatible with core, install via plugin market):');
      for (const r of upgrades) console.log(`  - ${r.safeUpgrade}`);
    }
    process.exitCode = 0;
    return;
  }

  if (JSON_OUT) {
    // machine-readable: report decisions, do not write
    const decisions = incompatible.map((r) => ({
      name: r.name,
      installed: r.installed,
      decision: r.safeUpgrade && semver.gt(r.safeUpgrade.split('@')[1], r.installed, { includePrerelease: true })
        ? { action: 'upgrade-in-market', spec: r.safeUpgrade }
        : { action: 'grant-exemption', key: `${r.name}@${r.installed}`, runtime },
    }));
    console.log(JSON.stringify({ runtime, dryRun: DRY_RUN, decisions }, null, 2));
    process.exitCode = 2;
    return;
  }

  const { exemptions, created, rawText } = readExemptions();
  acquireLock();
  const granted = [];
  let bak = null;
  try {
    for (const r of incompatible) {
      const newerCompatible = r.safeUpgrade && semver.gt(r.safeUpgrade.split('@')[1], r.installed, { includePrerelease: true });
      if (newerCompatible) {
        console.log(`→ ${r.name}@${r.installed}: install ${r.safeUpgrade} in the plugin market (compatible with core ${runtime}).`);
        continue;
      }
      const key = grantExemption(exemptions, r.name, r.installed, runtime);
      if (key) granted.push(key);
    }
    if (granted.length) {
      if (DRY_RUN) {
        console.log(`[dry-run] would grant exemptions: ${granted.join(', ')}`);
      } else {
        bak = backupCompatFile();
        writeExemptions(exemptions, rawText);
        console.log(`Granted exemptions so these plugins keep loading (peers are advisory):`);
        for (const key of granted) console.log(`  ✓ ${key}  (runtime ${runtime})`);
        console.log(`File: ${COMPAT_FILE}`);
        if (bak) console.log(`Backup: ${bak}`);
        console.log('\nRestart DSH Desktop for the changes to take effect.');
      }
    } else {
      console.log('\nNo exemptions needed (safe upgrades suggested above).');
    }
  } finally {
    releaseLock();
  }
  process.exitCode = 2;
}

main().catch((e) => {
  if (e instanceof Fatal) {
    console.error(`dsh-safe: ${e.message}`);
    process.exitCode = 1;
  } else {
    console.error(`dsh-safe: ${e?.stack ?? e}`);
    process.exitCode = 1;
  }
  process.exit(process.exitCode);
});
