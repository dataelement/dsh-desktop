import { execFile } from 'node:child_process'
import { open, readdir, rm, stat } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Inspect content, including extensionless PE files. A broken MZ header must
 * fail the release rather than silently leave a binary unsigned. */
async function isWindowsPE(filePath) {
  const handle = await open(filePath, 'r')
  try {
    const header = Buffer.alloc(64)
    const { bytesRead } = await handle.read(header, 0, header.length, 0)
    if (bytesRead < 2 || header[0] !== 0x4d || header[1] !== 0x5a) return false
    if (bytesRead < header.length) throw new Error(`Invalid PE header: ${filePath}`)
    const peOffset = header.readUInt32LE(0x3c)
    const size = (await handle.stat()).size
    if (peOffset < 64 || peOffset + 4 > size) throw new Error(`Invalid PE offset: ${filePath}`)
    const signature = Buffer.alloc(4)
    const read = await handle.read(signature, 0, 4, peOffset)
    if (read.bytesRead !== 4 || !signature.equals(Buffer.from([0x50, 0x45, 0, 0]))) {
      throw new Error(`Invalid PE signature: ${filePath}`)
    }
    return true
  } finally {
    await handle.close()
  }
}

/**
 * Discover every PE in the unpacked application, regardless of extension or
 * depth. Directory links are refused so a release cannot sign outside the
 * packaged tree or silently skip an unknown linked subtree.
 *
 * @param {string} unpackedDir
 * @returns {Promise<string[]>} list of absolute file paths to sign
 */
export async function findSignableBinaries(unpackedDir) {
  const root = resolve(unpackedDir)
  if (!(await stat(root)).isDirectory()) throw new Error(`Not an unpacked directory: ${root}`)
  const results = []
  async function scan(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const filePath = join(dir, entry.name)
      if (entry.isSymbolicLink()) throw new Error(`Linked path in unpacked application: ${filePath}`)
      if (entry.isDirectory()) await scan(filePath)
      else if (entry.isFile() && await isWindowsPE(filePath)) results.push(filePath)
    }
  }
  await scan(root)
  if (results.length === 0) throw new Error(`No Windows PE binaries found in ${root}`)
  return results.sort()
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
