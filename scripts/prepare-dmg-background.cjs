const { execFileSync } = require('node:child_process')
const { mkdirSync } = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')

function prepareDmgBackground() {
  if (process.platform !== 'darwin') {
    throw new Error('DMG artwork generation requires macOS')
  }
  const output = path.join(root, '.build', 'dmg')
  mkdirSync(output, { recursive: true })
  const run = (command, args) => execFileSync(command, args, { stdio: 'inherit' })
  const renderer = path.join(output, 'render-background')
  const normal = path.join(output, 'background.png')
  const retina = path.join(output, 'background@2x.png')
  run('swiftc', [
    '-module-cache-path', path.join(output, 'module-cache'),
    path.join(__dirname, 'render-dmg-background.swift'), '-o', renderer
  ])
  run(renderer, [path.join(root, 'build', 'dmg'), retina])
  run('sips', ['-z', '380', '540', '-s', 'dpiWidth', '72', '-s', 'dpiHeight', '72', retina, '--out', normal])
  run('tiffutil', ['-cathidpicheck', normal, retina, '-out', path.join(output, 'background.tiff')])
}

// beforePack runs for both release and development macOS packaging.
module.exports = async context => {
  if (context.electronPlatformName === 'darwin') prepareDmgBackground()
}

if (require.main === module) prepareDmgBackground()
