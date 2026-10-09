import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const patchesDir = join(root, 'patches')
const packageJson = join(root, 'package.json')
const packageLock = join(root, 'package-lock.json')
const lockfile = JSON.parse(readFileSync(packageLock, 'utf8'))

function run(command, args, options) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options })
  if (result.status !== 0) {
    process.stdout.write(result.stdout ?? '')
    process.stderr.write(result.stderr ?? '')
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`)
  }
  return result
}

function patchTarget(patchFile) {
  const stem = patchFile.slice(0, -'.patch'.length)
  const parts = stem.split('+')
  const isScoped = parts[0]?.startsWith('@')
  const packageName = isScoped
    ? `${parts[0]}/${parts[1]}`
    : parts[0]
  const version = isScoped ? parts.slice(2).join('+') : parts.slice(1).join('+')

  if (!packageName || !version) {
    throw new Error(`Unrecognized patch file name: ${patchFile}`)
  }
  return { packageName, version }
}

const patchFiles = readdirSync(patchesDir)
  .filter((file) => file.endsWith('.patch'))
  .sort()

const targets = patchFiles.map((file) => ({ file, ...patchTarget(file) }))
for (const { file, packageName, version } of targets) {
  const locked = lockfile.packages?.[`node_modules/${packageName}`]
  if (!locked || locked.version !== version) {
    throw new Error(
      `${file} targets ${packageName}@${version}, which is not the version pinned in package-lock.json`
    )
  }
}

const work = mkdtempSync(join(tmpdir(), 'dsh-patch-verify-'))
try {
  // npm ci reproduces the exact package tarballs recorded in package-lock.json.
  // Ignoring lifecycle scripts prevents the repository's postinstall from
  // downloading Electron or applying the patches before this check runs.
  cpSync(packageJson, join(work, 'package.json'))
  cpSync(packageLock, join(work, 'package-lock.json'))
  run('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: work })

  const patchPackageCli = join(work, 'node_modules', 'patch-package', 'index.js')
  if (!existsSync(patchPackageCli)) {
    throw new Error('patch-package was not installed by npm ci')
  }

  let applied = 0
  for (const { file, packageName, version } of targets) {
    const patchDir = join(work, '.verify-patches')
    rmSync(patchDir, { recursive: true, force: true })
    mkdirSync(patchDir)
    writeFileSync(join(patchDir, file), readFileSync(join(patchesDir, file)))

    run(process.execPath, [patchPackageCli, '--error-on-fail', '--patch-dir', '.verify-patches'], {
      cwd: work
    })
    applied += 1
    console.log(`PASS ${packageName}@${version}`)
  }

  console.log(`\n${applied} patches apply cleanly to the package-lock.json distribution set.`)
} finally {
  rmSync(work, { recursive: true, force: true })
}
