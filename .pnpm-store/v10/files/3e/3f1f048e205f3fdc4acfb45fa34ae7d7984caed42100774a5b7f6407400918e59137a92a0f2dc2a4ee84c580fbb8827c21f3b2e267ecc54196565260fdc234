'use strict'

const _ = require('lodash')
const childProcess = require('child_process')
const fs = require('fs-extra')
const path = require('path')
const { promisify } = require('util')
const tmp = require('tmp-promise')

const pkg = require('./package.json')
const logger = require('debug')(pkg.name)

const exec = promisify(childProcess.exec)

function kebabify (object) {
  return _.cloneDeepWith(object, (value) => {
    if (!value || typeof value !== 'object') return value

    return Object.keys(value).reduce((newValue, key) => {
      newValue[_.kebabCase(key)] = value[key]
      return newValue
    }, {})
  })
}

function translateArch (arch) {
  if (arch === 'ia32') return 'i386'
  if (arch === 'x64') return 'x86_64'
  if (arch === 'amd64') return 'x86_64'
  if (arch === 'armv7l') return 'arm'
  return arch
}

function getOptionsWithDefaults (options, manifest) {
  const defaults = {
    'build-dir': path.join(options['working-dir'], 'build'),
    'repo-dir': path.join(options['working-dir'], 'repo'),
    'manifest-path': path.join(options['working-dir'], 'manifest.json'),
    'extra-flatpak-builder-args': [],
    'extra-flatpak-build-bundle-args': [],
    'extra-flatpak-build-export-args': [],
    'clean-tmpdirs': true,
    'auto-install-runtime': typeof options['runtime-flatpakref'] !== 'undefined',
    'auto-install-sdk': typeof options['sdk-flatpakref'] !== 'undefined',
    'auto-install-base': typeof options['base-flatpakref'] !== 'undefined'
  }
  options = _.defaults({}, options, defaults)
  options['working-dir'] = path.resolve(options['working-dir'])
  options['build-dir'] = path.resolve(options['build-dir'])
  options['repo-dir'] = path.resolve(options['repo-dir'])
  options['manifest-path'] = path.resolve(options['manifest-path'])
  if (options['bundle-path']) options['bundle-path'] = path.resolve(options['bundle-path'])
  return options
}

async function spawnWithLogging (options, command, args, allowFail) {
  return new Promise((resolve, reject) => {
    logger(`$ ${command} ${args.join(' ')}`)
    const child = childProcess.spawn(command, args, { cwd: options['working-dir'] })
    child.stdout.on('data', (data) => {
      logger(`1> ${data}`)
    })
    child.stderr.on('data', (data) => {
      logger(`2> ${data}`)
    })
    child.on('error', (error) => {
      reject(error)
    })
    child.on('close', (code) => {
      if (!allowFail && code !== 0) {
        reject(new Error(`${command} failed with status code ${code}`))
      }
      resolve(code === 0)
    })
  })
}

function addCommandLineOption (args, name, value) {
  if (!value) return

  args.push(`--${name}`)
  if (value !== true) args.push(value)
}

async function checkInstalled (id, options, version, checkUser) {
  const args = ['info']
  addCommandLineOption(args, 'show-commit', true)
  addCommandLineOption(args, checkUser ? 'user' : 'system', true)
  args.push([id, options.arch, version].join('/'))
  return spawnWithLogging(options, 'flatpak', args, true)
}

let _flatpakBuilderVersion

/**
 * Get the flatpak-builder version in a comparable form (Array of Numbers).
 */
async function flatpakBuilderVersion () {
  if (!_flatpakBuilderVersion) {
    const versionString = _.last((await exec('flatpak-builder --version')).toString().split(' '))
    _flatpakBuilderVersion = versionString.split('.').map(part => parseInt(part, 10))
  }

  return _flatpakBuilderVersion
}

async function addAssumeYesArg (args) {
  if ((await flatpakBuilderVersion()) >= [0, 9, 9]) {
    logger('flatpak-builder is new enough, adding --assumeyes')
    addCommandLineOption(args, 'assumeyes', true)
  }
}

async function ensureRef (options, manifest, type, version) {
  const flatpakref = options[`${type}-flatpakref`]
  const id = manifest[type]
  if (!options[`auto-install-${type}`]) {
    return
  }
  logger(`Ensuring ${type} is up to date`)

  logger(`Checking for install of ${id}`)
  const [userInstall, systemInstall] = await Promise.all([
    checkInstalled(id, options, version, true),
    checkInstalled(id, options, version, false)
  ])
  if (!userInstall && !systemInstall) {
    logger(`No install of ${id} found, trying to install from ${flatpakref}`)
    if (!flatpakref) {
      throw new Error(`Cannot install ${id} without flatpakref`)
    }
    const args = ['install']
    addCommandLineOption(args, 'user', true)
    addCommandLineOption(args, 'no-deps', true)
    addCommandLineOption(args, 'arch', options.arch)
    await addAssumeYesArg(args)
    if (flatpakref.startsWith('app/') || flatpakref.startsWith('runtime/')) {
      args.push(flatpakref)
    } else {
      addCommandLineOption(args, 'from', flatpakref)
    }
    return spawnWithLogging(options, 'flatpak', args)
  }

  logger(`Found install of ${id}, trying to update`)
  const args = ['update']
  addCommandLineOption(args, 'user', userInstall)
  addCommandLineOption(args, 'no-deps', true)
  addCommandLineOption(args, 'arch', options.arch)
  await addAssumeYesArg(args)
  args.push(id)
  if (version) {
    args.push(version)
  }
  return spawnWithLogging(options, 'flatpak', args)
}

async function ensureRuntime (options, manifest) {
  return ensureRef(options, manifest, 'runtime', manifest['runtime-version'])
}

async function ensureSdk (options, manifest) {
  return ensureRef(options, manifest, 'sdk', manifest['runtime-version'])
}

async function ensureBase (options, manifest) {
  return ensureRef(options, manifest, 'base', manifest['base-version'])
}

async function ensureWorkingDir (options) {
  if (!options['working-dir']) {
    const dir = await tmp.dir({ prefix: 'flatpak-bundler', unsafeCleanup: options['clean-tmpdirs'] })
    options['working-dir'] = dir.path
  } else {
    return fs.ensureDir(options['working-dir'])
  }
}

async function writeJsonFile (options, manifest) {
  return fs.writeJson(options['manifest-path'], manifest, { space: '  ' })
}

async function copyFiles (options, manifest) {
  if (!options.files) {
    return
  }

  return Promise.all(options.files.map(async sourceDest => {
    const source = path.resolve(sourceDest[0])
    const dest = path.join(options['build-dir'], 'files', sourceDest[1])
    let dir = dest
    if (!dir.endsWith(path.sep)) {
      dir = path.dirname(dir)
    }

    logger(`Copying ${source} to ${dest}`)
    await fs.ensureDir(dir)
    await fs.copy(source, dest)
  }))
}

async function createSymlinks (options, manifest) {
  if (!options.symlinks) {
    return
  }

  return Promise.all(options.symlinks.map(async ([targetPath, location]) => {
    const target = path.join('/app', targetPath)
    const dest = path.join(options['build-dir'], 'files', location)

    logger(`Symlinking ${target} at ${dest}`)
    await fs.ensureDir(path.dirname(dest))
    await fs.symlink(target, dest)
  }))
}

async function copyExports (options, manifest) {
  if (!options['extra-exports']) {
    return
  }

  return Promise.all(options['extra-exports'].map(async source => {
    const dest = path.join(options['build-dir'], 'export', source)
    const dir = path.dirname(dest)
    source = path.join(options['build-dir'], 'files', source)

    logger(`Exporting ${source} to ${dest}`)
    await fs.ensureDir(dir)
    await fs.copy(source, dest)
  }))
}

async function flatpakBuilder (options, manifest, finish) {
  const args = []
  addCommandLineOption(args, 'arch', options.arch)
  addCommandLineOption(args, 'force-clean', true)
  // If we are not compiling anything, allow building without the platform and sdk
  // installed. Allows automated builds on a minimal environment, for example.
  if (!manifest.modules || manifest.modules.length === 0) {
    addCommandLineOption(args, 'allow-missing-runtimes', true)
  }
  if (!finish) {
    addCommandLineOption(args, 'build-only', true)
  } else {
    addCommandLineOption(args, 'finish-only', true)
  }
  await addAssumeYesArg(args)
  args.push.apply(args, options['extra-flatpak-builder-args'])

  args.push(options['build-dir'])
  args.push(options['manifest-path'])
  return spawnWithLogging(options, 'flatpak-builder', args)
}

async function flatpakBuildExport (options, manifest) {
  const args = ['build-export']
  addCommandLineOption(args, 'arch', options.arch)
  addCommandLineOption(args, 'gpg-sign', options['gpg-sign'])
  addCommandLineOption(args, 'gpg-homedir', options['gpg-homedir'])
  addCommandLineOption(args, 'subject', options.subject)
  addCommandLineOption(args, 'body', options.body)
  if (options['build-runtime']) addCommandLineOption(args, 'runtime', true)
  args.push.apply(args, options['extra-flatpak-build-export-args'])

  args.push(options['repo-dir'])
  args.push(options['build-dir'])
  if (manifest.branch) args.push(manifest.branch)
  return spawnWithLogging(options, 'flatpak', args)
}

async function flatpakBuildBundle (options, manifest) {
  if (!options['bundle-path']) {
    return
  }

  const args = ['build-bundle']
  addCommandLineOption(args, 'arch', options.arch)
  addCommandLineOption(args, 'gpg-keys', options['gpg-keys'])
  addCommandLineOption(args, 'gpg-homedir', options['gpg-homedir'])
  addCommandLineOption(args, 'repo-url', options['bundle-repo-url'])
  if (options['build-runtime']) addCommandLineOption(args, 'runtime', true)
  args.push.apply(args, options['extra-flatpak-build-bundle-args'])

  args.push(options['repo-dir'])
  args.push(options['bundle-path'])
  args.push(manifest.id)
  if (manifest.branch) args.push(manifest.branch)

  await fs.ensureDir(path.dirname(options['bundle-path']))
  return spawnWithLogging(options, 'flatpak', args)
}

exports.bundle = async function (manifest, options) {
  manifest = kebabify(manifest)
  options = kebabify(options)
  if (manifest['app-id']) manifest.id = manifest['app-id']

  await ensureWorkingDir(options)
  options = getOptionsWithDefaults(options, manifest)
  options.arch = translateArch(options.arch)

  logger(`Using manifest...\n${JSON.stringify(manifest, null, '  ')}`)
  logger(`Using options...\n${JSON.stringify(options, null, '  ')}`)
  await ensureRuntime(options, manifest)
  await ensureSdk(options, manifest)
  await ensureBase(options, manifest)
  await writeJsonFile(options, manifest)
  await flatpakBuilder(options, manifest, false)
  await copyFiles(options, manifest)
  await createSymlinks(options, manifest)
  await flatpakBuilder(options, manifest, true)
  await copyExports(options, manifest)
  await flatpakBuildExport(options, manifest)
  await flatpakBuildBundle(options, manifest)
  return options
}

exports.translateArch = translateArch
