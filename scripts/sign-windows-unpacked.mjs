import { execFile } from 'node:child_process'
import { open, readdir, rm, stat } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Verify whether a file starts with the Windows PE 'MZ' magic bytes (0x4D, 0x5A).
 * This prevents Jsign from failing on non-Windows prebuild binaries (e.g. darwin Mach-O or linux ELF).
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function isWindowsPE(filePath) {
  try {
    const handle = await open(filePath, 'r')
    const buffer = Buffer.alloc(2)
    const { bytesRead } = await handle.read(buffer, 0, 2, 0)
    await handle.close()
    return bytesRead === 2 && buffer[0] === 0x4d && buffer[1] === 0x5a
  } catch {
    return false
  }
}

/**
 * Discover core Windows binaries inside an unpacked application directory that
 * must carry an Authenticode digital signature.
 *
 * @param {string} unpackedDir
 * @returns {Promise<string[]>} list of absolute file paths to sign
 */
export async function findSignableBinaries(unpackedDir) {
  const root = resolve(unpackedDir)
  const results = new Set()

  // 1. Root executables and DLLs (e.g. DSH Desktop.exe, ffmpeg.dll)
  try {
    const rootEntries = await readdir(root, { withFileTypes: true })
    for (const entry of rootEntries) {
      if (!entry.isFile()) continue
      const lower = entry.name.toLowerCase()
      if (lower.endsWith('.exe') || lower.endsWith('.dll')) {
        results.add(join(root, entry.name))
      }
    }
  } catch (error) {
    throw new Error(`Failed to read root unpacked directory ${root}: ${error.message}`)
  }

  // 2. Bundled Node runtime (resources/app/node_modules/node/bin/node.exe)
  const bundledNode = join(root, 'resources', 'app', 'node_modules', 'node', 'bin', 'node.exe')
  try {
    const s = await stat(bundledNode)
    if (s.isFile()) results.add(bundledNode)
  } catch {
    // Packaged node.exe might be absent in non-standard or dev layouts
  }

  // 3. Native C++ addon bindings (*.node) under resources/app/node_modules
  const nodeModulesRoot = join(root, 'resources', 'app', 'node_modules')
  async function scanNativeAddons(dir, depth = 0) {
    if (depth > 8) return
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        await scanNativeAddons(fullPath, depth + 1)
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.node')) {
        if (await isWindowsPE(fullPath)) {
          results.add(fullPath)
        }
      }
    }
  }

  await scanNativeAddons(nodeModulesRoot)

  return Array.from(results).sort()
}

/**
 * Build Jsign execution arguments for a target file.
 */
export function buildJsignArgs({
  jsignJar,
  pinFile,
  targetFile,
  tsaUrl = 'http://timestamp.digicert.com',
  name = 'DSH Desktop',
  url = 'https://www.dshdesktop.com'
}) {
  return [
    '-jar',
    jsignJar,
    '--storetype',
    'ETOKEN',
    '--storepass',
    `file:${pinFile}`,
    '--alg',
    'SHA-256',
    '--tsaurl',
    tsaUrl,
    '--tsmode',
    'RFC3161',
    '--tsretries',
    '3',
    '--tsretrywait',
    '10',
    '--name',
    name,
    '--url',
    url,
    targetFile
  ]
}

/**
 * Sign a single binary with Jsign.
 */
async function signBinary(targetFile, config) {
  const args = buildJsignArgs({ ...config, targetFile })
  console.log(`[sign-windows] Signing ${basename(targetFile)} (${targetFile}) ...`)

  if (config.dryRun) {
    console.log(`[sign-windows] [dry-run] java ${args.join(' ')}`)
    return
  }

  await execFileAsync('java', args)

  // Verify signature extraction
  const verifyArgs = ['-jar', config.jsignJar, 'extract', '--format', 'DER', targetFile]
  await execFileAsync('java', verifyArgs)
  const sigFile = `${targetFile}.sig`
  const sigStat = await stat(sigFile)
  if (sigStat.size === 0) {
    throw new Error(`Signature verification failed for ${targetFile}: .sig is empty`)
  }
  await rm(sigFile, { force: true })

  // Hardware SafeNet token anti-lock cooldown
  await sleep(300)
}

async function main() {
  const [unpackedDirArg] = process.argv.slice(2)
  if (!unpackedDirArg) {
    console.error('Usage: node scripts/sign-windows-unpacked.mjs <unpacked-directory>')
    process.exit(1)
  }

  const unpackedDir = resolve(unpackedDirArg)
  const jsignJar = process.env.JSIGN_JAR
  const pinFile = process.env.JSIGN_PIN_FILE
  const dryRun = process.env.DRY_RUN === 'true' || process.env.DRY_RUN === '1'

  if (!dryRun) {
    if (!jsignJar) throw new Error('Missing required environment variable: JSIGN_JAR')
    if (!pinFile) throw new Error('Missing required environment variable: JSIGN_PIN_FILE')
  }

  console.log(`[sign-windows] Scanning ${unpackedDir} for signable binaries...`)
  const targets = await findSignableBinaries(unpackedDir)
  console.log(`[sign-windows] Found ${targets.length} binary target(s) to sign.`)

  for (const target of targets) {
    await signBinary(target, {
      jsignJar: jsignJar ?? 'jsign.jar',
      pinFile: pinFile ?? 'pin.txt',
      tsaUrl: process.env.TSA_URL,
      dryRun
    })
  }

  console.log(`[sign-windows] Successfully signed all ${targets.length} binaries in ${unpackedDir}.`)
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  main().catch((error) => {
    console.error(`[sign-windows] Fatal: ${error.message}`)
    process.exit(1)
  })
}
