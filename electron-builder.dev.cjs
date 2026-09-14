const packageJson = require('./package.json')
const path = require('node:path')
const fs = require('node:fs')
const officeRuntime = process.env.DSH_OFFICE_BUNDLE_ROOT
if (officeRuntime) {
  if (!path.isAbsolute(officeRuntime)) throw new Error('DSH_OFFICE_BUNDLE_ROOT must be absolute')
  const manifest = JSON.parse(fs.readFileSync(path.join(officeRuntime, 'manifest.json'), 'utf8'))
  if (manifest.platform !== process.platform || manifest.arch !== process.arch) {
    throw new Error('Office runtime must match this build host and target')
  }
}

module.exports = {
  ...packageJson.build,
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
  extraResources: [
    ...packageJson.build.extraResources,
    ...(officeRuntime ? [{ from: officeRuntime, to: 'office-runtime' }] : [])
  ],
  nsis: {
    ...packageJson.build.nsis,
    artifactName: 'dsh-desktop-dev-windows-${arch}-setup.${ext}'
  },
  publish: null
}
