const packageJson = require('./package.json')

module.exports = {
  ...packageJson.build,
  appId: 'io.dsh.desktop.shell',
  productName: 'DSH Desktop Shell',
  directories: {
    ...packageJson.build.directories,
    output: 'dist-shell'
  },
  files: packageJson.build.files.map(entry => entry === 'out/**/*' ? 'out-shell/**/*' : entry),
  extraMetadata: {
    name: 'dsh-desktop-shell',
    productName: 'DSH Desktop Shell',
    main: './out-shell/main/index.js'
  },
  artifactName: 'dsh-desktop-shell-${os}-${arch}.${ext}',
  nsis: {
    ...packageJson.build.nsis,
    artifactName: 'dsh-desktop-shell-windows-${arch}-setup.${ext}'
  },
  publish: null
}
