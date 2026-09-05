import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Replay every tracked patch against its pristine vendored tarball to prove
 * the patch layer still applies cleanly to a fresh install.
 *
 * patch-package normally applies patches only during `npm ci`'s postinstall,
 * and only on machines that run a fresh install. In a developer worktree a
 * hunk that no longer matches fails loudly only when someone happens to run a
 * clean install; on a TTY patch-package also exits 0 on a failed hunk unless
 * `--error-on-fail` is passed. This script makes drift detection explicit and
 * CI-runnable: for each `patches/*.patch` it unpacks the matching tarball from
 * the vendored `packages/harness-0.1.2-rc.1/` snapshot into an isolated
 * `node_modules` and applies exactly that patch with `--error-on-fail`.
 */

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const patchesDir = join(root, 'patches')
const vendorDirs = [
  join(root, 'packages', 'harness-0.1.2-rc.1', 'npm-dsh'),
  join(root, 'packages', 'harness-0.1.2-rc.1', 'npm-vendor')
].filter((dir) => existsSync(dir))
const patchPackageCli = join(root, 'node_modules', 'patch-package', 'index.js')

if (!existsSync(patchPackageCli)) {
  console.error('patch-package is not installed; run `npm ci --ignore-scripts` first.')
  process.exit(2)
}

function patchPackageName(patchFile) {
  // '@deepseek-ai+dsh-client-ui-settings-models+0.1.2-rc.1.patch' -> { scope, name, version }
  const match = /^(@[^+]+)\+([^+]+)\+([^+]+)\.patch$/.exec(patchFile)
  if (!match) throw new Error(`Unrecognized patch file name: ${patchFile}`)
  return { scope: match[1], name: match[2], version: match[3] }
}

function findTarball(scope, name, version) {
  // Tarballs are vendored as <scope-without-@>-<name>-<version>.tgz (npm keeps
  // the scope in the file name when packing a scoped package).
  const base = `${scope.slice(1)}-${name}-${version}.tgz`
  for (const dir of vendorDirs) {
    const candidate = join(dir, base)
    if (existsSync(candidate)) return candidate
  }
  throw new Error(`Vendored tarball not found for ${scope}/${name}@${version} (looked for ${base})`)
}

const patchFiles = readdirSync(patchesDir)
  .filter((file) => file.endsWith('.patch'))
  .sort()

let failed = 0
let applied = 0
for (const patchFile of patchFiles) {
  const { scope, name, version } = patchPackageName(patchFile)
  const tarball = findTarball(scope, name, version)
  const packageName = `${scope}/${name}`
  const targetDir = join('node_modules', scope, name)

  const work = mkdtempSync(join(tmpdir(), 'dsh-patch-verify-'))
  try {
    mkdirSync(join(work, targetDir), { recursive: true })
    writeFileSync(join(work, 'package.json'), '{}\n', 'utf8')
    const extract = spawnSync('tar', ['-xzf', tarball, '-C', join(work, targetDir), '--strip-components=1'], {
      stdio: 'inherit'
    })
    if (extract.status !== 0) {
      failed += 1
      console.error(`FAIL ${packageName}: tarball extraction failed (${extract.status})`)
      continue
    }

    const onlyThisPatch = join(work, 'patches')
    mkdirSync(onlyThisPatch, { recursive: true })
    writeFileSync(join(onlyThisPatch, patchFile), readFileSync(join(patchesDir, patchFile), 'utf8'))
    // patch-package resolves --patch-dir against the worktree root, so pass the
    // relative path with cwd=work and reject the vacuous "no patches" run.
    const result = spawnSync(
      process.execPath,
      [patchPackageCli, '--error-on-fail', '--patch-dir', 'patches'],
      { cwd: work, encoding: 'utf8' }
    )
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
    if (result.status === 0 && !output.includes('No patch files found')) {
      applied += 1
      console.log(`PASS ${packageName}@${version}`)
    } else {
      failed += 1
      console.error(`FAIL ${packageName}@${version}: patch no longer applies to its vendored tarball`)
      process.stdout.write(output)
    }
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}

console.log(`\n${applied} patches apply cleanly, ${failed} failed.`)
if (failed > 0) process.exit(1)
