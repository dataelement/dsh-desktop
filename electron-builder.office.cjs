const path = require('node:path')
const fs = require('node:fs')
const packageJson = require('./package.json')
const officeRuntime = process.env.DSH_OFFICE_BUNDLE_ROOT
if (process.platform === 'win32' && !officeRuntime) {
  throw new Error('Build the Windows Office runtime with npm run office:stage:win and set DSH_OFFICE_BUNDLE_ROOT before packaging')
}
if (officeRuntime) {
  if (!path.isAbsolute(officeRuntime)) throw new Error('DSH_OFFICE_BUNDLE_ROOT must be absolute')
  const manifest = JSON.parse(fs.readFileSync(path.join(officeRuntime, 'manifest.json'), 'utf8'))
  if (manifest.platform !== process.platform || manifest.arch !== process.arch) throw new Error('Office runtime must match this build host and target')
  for (const [relative, expected] of Object.entries(manifest.hashes)) {
    const file = path.resolve(officeRuntime, relative)
    if (!file.startsWith(officeRuntime + path.sep)) throw new Error('Office manifest path must stay in the bundle')
    const actual = require('node:crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex')
    if (actual !== expected) throw new Error(`Office engine checksum mismatch: ${relative}`)
  }
}
module.exports = {
  ...packageJson.build,
  extraResources: [...packageJson.build.extraResources, ...(officeRuntime ? [{ from: officeRuntime, to: 'office-runtime' }] : [])]
}
