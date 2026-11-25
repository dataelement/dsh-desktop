const fs = require('node:fs')
const path = require('node:path')
const { createHash } = require('node:crypto')
const SOURCE_SHA256 = 'b0374cc56dbc186d442ae73d5de743bb092470b640c4c50ce7b029044c0c4fa8'

function verifySherpaOverlay(projectDir) {
  const directory = path.join(projectDir, '.build/sherpa-linux')
  const metadata = JSON.parse(fs.readFileSync(path.join(directory, 'rebuild.json'), 'utf8'))
  if (metadata.version !== '1.13.8' || metadata.sourceSha256 !== SOURCE_SHA256) throw new Error('Unreviewed sherpa overlay source/version')
  const addon = fs.readFileSync(path.join(directory, 'sherpa-onnx.node'))
  if (createHash('sha256').update(addon).digest('hex') !== metadata.addonSha256) throw new Error('Sherpa overlay SHA256 mismatch')
  if (addon.length < 20 || addon.readUInt32BE(0) !== 0x7f454c46 || addon[4] !== 2 || addon.readUInt16LE(18) !== 62) throw new Error('Sherpa overlay must be ELF Linux x64')
  const installed = JSON.parse(fs.readFileSync(path.join(projectDir, 'node_modules/sherpa-onnx-linux-x64/package.json'), 'utf8'))
  if (installed.version !== metadata.version) throw new Error('Sherpa overlay does not match installed platform package')
}

function withSherpaOverlay(base) {
  return { ...base,
    files: [...base.files, '!node_modules/sherpa-onnx-linux-x64/sherpa-onnx.node',
      { from: '.build/sherpa-linux', to: 'node_modules/sherpa-onnx-linux-x64', filter: ['sherpa-onnx.node'] }],
    beforePack: async context => {
      if (context.electronPlatformName !== 'linux' || context.arch !== 1) throw new Error('Sherpa overlay config requires Linux x64')
      if (base.beforePack) {
        const original = typeof base.beforePack === 'function' ? base.beforePack : require(path.resolve(context.packager.projectDir, base.beforePack))
        await original(context)
      }
      verifySherpaOverlay(context.packager.projectDir)
    }
  }
}
module.exports = { verifySherpaOverlay, withSherpaOverlay }
