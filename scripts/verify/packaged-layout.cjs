const path = require('node:path')

/** Resolve the target layout, not the build host's platform or display name. */
function packagedLayout(context) {
  const { appOutDir, electronPlatformName, packager } = context
  const product = packager.appInfo.productFilename
  if (electronPlatformName === 'darwin') {
    const contents = path.join(appOutDir, `${product}.app`, 'Contents')
    return {
      resources: path.join(contents, 'Resources'),
      executable: path.join(contents, 'Frameworks', `${product} Helper.app`, 'Contents', 'MacOS', `${product} Helper`)
    }
  }
  const resources = path.join(appOutDir, 'resources')
  if (electronPlatformName === 'win32') {
    return { resources, executable: path.join(appOutDir, `${product}.exe`) }
  }
  if (electronPlatformName === 'linux') {
    // LinuxPackager has already applied executableName overrides and sanitization.
    const executableName = packager.executableName
    if (typeof executableName !== 'string' || !executableName || path.basename(executableName) !== executableName) {
      throw new Error('Cannot locate the packaged Linux executable: missing or invalid packager.executableName')
    }
    return { resources, executable: path.join(appOutDir, executableName) }
  }
  throw new Error(`Unsupported packaged application platform: ${electronPlatformName}`)
}

module.exports = { packagedLayout }
