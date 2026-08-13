import { copyFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(projectRoot, 'build', 'icon.png')
const destinationDirectory = path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh-web-frontend',
  'dist'
)
const destination = path.join(destinationDirectory, 'dsh-desktop-logo.png')

await mkdir(destinationDirectory, { recursive: true })
await copyFile(source, destination)

console.log(`Installed DSH Desktop brand asset: ${path.relative(projectRoot, destination)}`)
