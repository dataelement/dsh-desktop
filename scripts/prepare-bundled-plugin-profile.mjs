import { cp, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const policyPath = path.join(projectRoot, 'build', 'sherlock-bundled-plugins.json')
const outputPath = path.join(projectRoot, 'build', 'sherlock-plugin-profile')
const defaultSourceProfile = path.join(
  homedir(),
  'Library',
  'Application Support',
  'sherlock-desktop',
  'harness',
  'profiles',
  'web'
)

const excludedSourceNames = new Set([
  '.git',
  '.DS_Store',
  'node_modules',
  'coverage',
  '.credentials.yaml',
  'settings.yaml'
])

function sameList(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function sameSet(left, right) {
  return left.length === right.length && left.every((value) => right.includes(value))
}

function vendorRelativePath(packageName) {
  return path.posix.join('vendor', ...packageName.split('/'))
}

async function copyInstalledPlugin(source, target) {
  await cp(source, target, {
    recursive: true,
    dereference: true,
    force: true,
    filter(candidate) {
      const relative = path.relative(source, candidate)
      if (!relative) return true
      const parts = relative.split(path.sep)
      return !parts.some(
        (part) => excludedSourceNames.has(part) || part === '.env' || part.startsWith('.env.')
      )
    }
  })

  const manifestPath = path.join(target, 'package.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  delete manifest.devDependencies
  delete manifest.scripts
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

async function validatePortableTree(root) {
  const prohibitedNames = new Set(['.credentials.yaml', 'settings.yaml', 'sessions', 'workspaces'])
  const pending = [root]
  while (pending.length > 0) {
    const directory = pending.pop()
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (prohibitedNames.has(entry.name)) {
        throw new Error(`Refusing to bundle user-owned Harness data: ${path.join(directory, entry.name)}`)
      }
      const entryPath = path.join(directory, entry.name)
      const stat = await lstat(entryPath)
      if (stat.isSymbolicLink()) {
        const resolved = await realpath(entryPath)
        if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
          throw new Error(`Bundled plugin symlink escapes the portable profile: ${entryPath}`)
        }
      } else if (stat.isDirectory()) {
        pending.push(entryPath)
      }
    }
  }
}

async function main() {
  const sourceProfile = path.resolve(
    process.env.SHERLOCK_PLUGIN_PROFILE_SOURCE || defaultSourceProfile
  )
  const sourceManifestPath = path.join(sourceProfile, 'package.json')
  const [policy, sourceManifest] = await Promise.all([
    readFile(policyPath, 'utf8').then(JSON.parse),
    readFile(sourceManifestPath, 'utf8').then(JSON.parse)
  ])
  const sourcePlugins =
    sourceManifest.dsh?.sherlock?.plugins ?? Object.keys(sourceManifest.dependencies ?? {})
  const sourceBundles = sourceManifest.dsh?.profile?.bundles ?? []

  if (!sameSet(sourcePlugins, policy.plugins)) {
    throw new Error(
      `Sherlock formal plugin set differs from the release policy.\nFormal: ${sourcePlugins.join(', ')}\nPolicy: ${policy.plugins.join(', ')}`
    )
  }
  if (!sameList(sourceBundles, policy.bundles)) {
    throw new Error('Sherlock formal bundle order differs from the release policy.')
  }
  if (!sourcePlugins.includes('dsh-file-drop')) {
    throw new Error('Sherlock formal is missing dsh-file-drop, which provides the attachment button.')
  }

  const buildRoot = path.dirname(outputPath)
  await mkdir(buildRoot, { recursive: true })
  const stageRoot = await mkdtemp(path.join(buildRoot, '.sherlock-plugin-profile-stage-'))
  const stagedProfile = path.join(stageRoot, 'web')
  const vendorRoot = path.join(stagedProfile, 'vendor')

  try {
    await mkdir(vendorRoot, { recursive: true })
    const dependencies = {}
    for (const packageName of policy.plugins) {
      const installedPath = path.join(sourceProfile, 'node_modules', ...packageName.split('/'))
      const packageSource = await realpath(installedPath)
      const relativeVendorPath = vendorRelativePath(packageName)
      const vendorPath = path.join(stagedProfile, ...relativeVendorPath.split('/'))
      await mkdir(path.dirname(vendorPath), { recursive: true })
      await copyInstalledPlugin(packageSource, vendorPath)
      const copiedManifest = JSON.parse(await readFile(path.join(vendorPath, 'package.json'), 'utf8'))
      if (copiedManifest.name !== packageName) {
        throw new Error(`Installed plugin name mismatch for ${packageName}: ${copiedManifest.name}`)
      }
      dependencies[packageName] = `file:${relativeVendorPath}`
    }

    for (const packageName of policy.runtimePackages) {
      const packageSource = path.join(projectRoot, 'packages', packageName)
      const relativeVendorPath = vendorRelativePath(packageName)
      const vendorPath = path.join(stagedProfile, ...relativeVendorPath.split('/'))
      await mkdir(path.dirname(vendorPath), { recursive: true })
      await copyInstalledPlugin(packageSource, vendorPath)
      const copiedManifest = JSON.parse(await readFile(path.join(vendorPath, 'package.json'), 'utf8'))
      if (copiedManifest.name !== packageName) {
        throw new Error(`Sherlock runtime package name mismatch for ${packageName}: ${copiedManifest.name}`)
      }
      dependencies[packageName] = `file:${relativeVendorPath}`
    }

    const stagedManifest = {
      name: 'dsh-profile-web',
      private: true,
      dependencies,
      dsh: {
        profile: { bundles: [...policy.bundles] },
        sherlock: { plugins: [...policy.plugins] }
      }
    }
    await Promise.all([
      writeFile(
        path.join(stagedProfile, 'package.json'),
        `${JSON.stringify(stagedManifest, null, 2)}\n`,
        'utf8'
      ),
      writeFile(
        path.join(stagedProfile, 'pnpm-workspace.yaml'),
        'packages:\n  - .\n\nnodeLinker: hoisted\nautoInstallPeers: false\n',
        'utf8'
      ),
      cp(path.join(sourceProfile, 'cordis.patch.yml'), path.join(stagedProfile, 'cordis.patch.yml'))
    ])

    const pnpmPath = path.join(projectRoot, 'node_modules', 'pnpm', 'bin', 'pnpm.cjs')
    const install = spawnSync(
      process.execPath,
      [pnpmPath, 'install', '--prod', '--ignore-scripts', '--no-frozen-lockfile'],
      { cwd: stagedProfile, stdio: 'inherit', env: { ...process.env, CI: '1' } }
    )
    if (install.status !== 0) {
      throw new Error(`Failed to install the portable Sherlock plugin profile (exit ${install.status}).`)
    }

    for (const packageName of policy.plugins) {
      const packagePath = path.join(stagedProfile, 'node_modules', ...packageName.split('/'))
      const manifest = JSON.parse(await readFile(path.join(packagePath, 'package.json'), 'utf8'))
      const patch = manifest.dsh?.bundle?.patch
      if (typeof patch !== 'string') throw new Error(`${packageName} is not a DSH bundle.`)
      await lstat(path.join(packagePath, patch))
    }
    for (const packageName of policy.runtimePackages) {
      await lstat(path.join(stagedProfile, 'node_modules', packageName, 'package.json'))
    }
    await validatePortableTree(stagedProfile)

    // electron-builder excludes directory segments named node_modules from extraResources.
    // Ship the installed offline tree under a neutral name and restore it on first launch.
    await rename(path.join(stagedProfile, 'node_modules'), path.join(stagedProfile, 'modules'))

    for (const name of ['package.json', 'pnpm-lock.yaml']) {
      const content = await readFile(path.join(stagedProfile, name), 'utf8')
      if (content.includes(sourceProfile) || content.includes(homedir())) {
        throw new Error(`${name} contains a publisher-specific absolute path.`)
      }
    }

    await rm(outputPath, { recursive: true, force: true })
    await rename(stagedProfile, outputPath)
    console.log(`Prepared bundled Sherlock plugin profile with ${policy.plugins.length} plugins.`)
    for (const packageName of policy.plugins) console.log(`- ${packageName}`)
    console.log(`Included ${policy.runtimePackages.length} Sherlock runtime packages.`)
    for (const packageName of policy.runtimePackages) console.log(`- ${packageName}`)
  } finally {
    await rm(stageRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
