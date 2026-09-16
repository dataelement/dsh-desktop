const packageJson = require('./package.json')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const electronDist = path.join(path.dirname(require.resolve('electron/package.json')), 'dist')

function adHocSignMacDevelopmentApp(context) {
  if (context.electronPlatformName !== 'darwin') return

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`
  )
  const result = spawnSync(
    '/usr/bin/codesign',
    ['--force', '--deep', '--sign', '-', '--timestamp=none', appPath],
    { stdio: 'inherit' }
  )

  if (result.status !== 0) {
    throw new Error(`Failed to ad-hoc sign the macOS development app: ${appPath}`)
  }
}

module.exports = {
  ...packageJson.build,
  electronDist,
  appId: 'io.dsh.desktop.dev',
  productName: 'DSH Desktop Dev',
  directories: {
    ...packageJson.build.directories,
    output: 'dist-dev'
  },
  extraMetadata: {
    name: 'dsh-desktop-dev',
    productName: 'DSH Desktop Dev',
    dshDesktopChannel: 'development'
  },
  artifactName: 'dsh-desktop-dev-${os}-${arch}.${ext}',
  mac: {
    ...packageJson.build.mac,
    hardenedRuntime: false,
    identity: null
  },
  afterPack: adHocSignMacDevelopmentApp,
  nsis: {
    ...packageJson.build.nsis,
    artifactName: 'dsh-desktop-dev-windows-${arch}-setup.${ext}'
  },
  publish: null
}
