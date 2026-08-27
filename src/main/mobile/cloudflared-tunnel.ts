import { spawn, type ChildProcess } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream, existsSync } from 'node:fs'
import { chmod, mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { get as httpsGet } from 'node:https'
import { dirname, join } from 'node:path'
import { arch, platform } from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export const CLOUDFLARED_VERSION = '2026.8.2'

export interface CloudflareAssetSpec {
  asset: string
  isTarGz?: boolean
  sha256: string
}

export const CLOUDFLARED_ASSETS: Record<string, CloudflareAssetSpec> = {
  'darwin-arm64': {
    asset: 'cloudflared-darwin-arm64.tgz',
    isTarGz: true,
    sha256: '9042c2c5d8b2de78e60f313d5fb31b6c5c1cebde787a3caf1f2c9588084ac442'
  },
  'darwin-x64': {
    asset: 'cloudflared-darwin-amd64.tgz',
    isTarGz: true,
    sha256: 'f1727723c586500e2092368ae21871b3df7ddfd2cb097f22d81bee4a9c458bb4'
  },
  'win32-x64': {
    asset: 'cloudflared-windows-amd64.exe',
    isTarGz: false,
    sha256: 'c29eee2b121f5436a642eed69fd9767da7e7b8c510fa50aaa130337f931357b5'
  },
  'linux-x64': {
    asset: 'cloudflared-linux-amd64',
    isTarGz: false,
    sha256: 'fcfb02b575a52ca1af2e3267af4e1517bcdeb30ac48c834c69abaed3c0576ad2'
  },
  'linux-arm64': {
    asset: 'cloudflared-linux-arm64',
    isTarGz: false,
    sha256: '7747d94570fb390cf47dcb4f9555c193c6355cda9793f0d878d9049e5d6a7790'
  }
}

export function extractTryCloudflareUrl(text: string): string | null {
  const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/i)
  return match ? match[0] : null
}

export async function findCloudflaredOnPath(): Promise<string | null> {
  const cmd = platform() === 'win32' ? 'where' : 'which'
  try {
    const { stdout } = await execFileAsync(cmd, ['cloudflared'], { timeout: 3000 })
    const resolved = stdout.trim().split(/\r?\n/)[0]
    return resolved && existsSync(resolved) ? resolved : null
  } catch {
    return null
  }
}

export function resolveCurrentAssetSpec(
  osPlatform: NodeJS.Platform | string = platform(),
  osArch: NodeJS.Architecture | string = arch()
): { key: string; spec: CloudflareAssetSpec } | null {
  const normalizedArch = osArch === 'x64' || (osArch as string) === 'amd64' ? 'x64' : osArch
  const key = `${osPlatform}-${normalizedArch}`
  const spec = CLOUDFLARED_ASSETS[key]
  return spec ? { key, spec } : null
}

export async function sha256OfFile(path: string): Promise<string> {
  const hash = createHash('sha256')
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(path)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve())
  })
  return hash.digest('hex')
}

export async function ensureCloudflaredBinary(options: {
  cacheDir: string
  customPath?: string
  osPlatform?: NodeJS.Platform | string
  osArch?: NodeJS.Architecture | string
  download?: (url: string, destination: string) => Promise<void>
  findOnPath?: () => Promise<string | null>
}): Promise<string> {
  if (options.customPath && existsSync(options.customPath)) {
    return options.customPath
  }

  const find = options.findOnPath ?? findCloudflaredOnPath
  const onPath = await find()
  if (onPath) return onPath

  const target = resolveCurrentAssetSpec(options.osPlatform, options.osArch)
  if (!target) {
    throw new Error(`Unsupported platform/architecture for cloudflared: ${options.osPlatform ?? platform()}-${options.osArch ?? arch()}`)
  }

  const binaryName = (options.osPlatform ?? platform()) === 'win32' ? 'cloudflared.exe' : 'cloudflared'
  const targetBinaryPath = join(options.cacheDir, binaryName)
  if (existsSync(targetBinaryPath)) {
    return targetBinaryPath
  }

  await mkdir(options.cacheDir, { recursive: true })
  // Sweep leftovers of downloads interrupted before verification could run;
  // they are never reused and would otherwise accumulate on every crash.
  for (const entry of await readdir(options.cacheDir)) {
    if (entry.startsWith('.download-')) {
      await rm(join(options.cacheDir, entry), { force: true }).catch(() => undefined)
    }
  }
  const downloadUrl = `https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_VERSION}/${target.spec.asset}`
  const tempDownloadPath = join(options.cacheDir, `.download-${Date.now()}-${target.spec.asset}`)

  try {
    const download = options.download ?? downloadFileWithRedirects
    await download(downloadUrl, tempDownloadPath)

    const actualSha256 = await sha256OfFile(tempDownloadPath)
    if (actualSha256 !== target.spec.sha256) {
      await rm(tempDownloadPath, { force: true }).catch(() => undefined)
      throw new Error(
        `cloudflared checksum mismatch: expected ${target.spec.sha256}, got ${actualSha256}`
      )
    }

    if (target.spec.isTarGz) {
      await execFileAsync('tar', ['-xzf', tempDownloadPath, '-C', options.cacheDir])
      await rm(tempDownloadPath, { force: true }).catch(() => undefined)
    } else {
      await rm(targetBinaryPath, { force: true }).catch(() => undefined)
      const { rename } = await import('node:fs/promises')
      await rename(tempDownloadPath, targetBinaryPath)
    }

    if ((options.osPlatform ?? platform()) !== 'win32') {
      await chmod(targetBinaryPath, 0o755)
    }

    return targetBinaryPath
  } catch (error) {
    await rm(tempDownloadPath, { force: true }).catch(() => undefined)
    throw new Error(`Failed to obtain cloudflared binary: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function downloadFileWithRedirects(url: string, destination: string, maxRedirects = 5): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    if (maxRedirects <= 0) {
      return rejectPromise(new Error('Too many redirects while downloading cloudflared'))
    }

    httpsGet(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolvePromise(downloadFileWithRedirects(res.headers.location, destination, maxRedirects - 1))
      }
      if (res.statusCode !== 200) {
        return rejectPromise(new Error(`Download failed with status ${res.statusCode}`))
      }

      const fileStream = createWriteStream(destination)
      res.pipe(fileStream)
      fileStream.on('finish', () => {
        fileStream.close(() => resolvePromise())
      })
      fileStream.on('error', (err) => {
        fileStream.close(() => rejectPromise(err))
      })
    }).on('error', rejectPromise)
  })
}

export interface CloudflareTunnelInstance {
  url: string
  process: ChildProcess
  stop: () => Promise<void>
}

export async function startCloudflareQuickTunnel(options: {
  port: number
  binaryPath: string
  timeoutMs?: number
  log?: (message: string) => void
}): Promise<CloudflareTunnelInstance> {
  const { port, binaryPath, timeoutMs = 30_000, log } = options

  return new Promise((resolvePromise, rejectPromise) => {
    let resolved = false
    const child = spawn(binaryPath, ['tunnel', '--url', `http://127.0.0.1:${port}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    })

    const timeoutTimer = setTimeout(() => {
      if (!resolved) {
        cleanup()
        rejectPromise(new Error(`Cloudflare Quick Tunnel timed out after ${timeoutMs / 1000}s`))
      }
    }, timeoutMs)

    let capturedUrl: string | null = null

    const handleOutput = (chunk: Buffer | string) => {
      const text = chunk.toString()
      const extracted = extractTryCloudflareUrl(text)
      if (extracted && !capturedUrl) {
        capturedUrl = extracted
        log?.(`[cloudflared] Tunnel online: ${capturedUrl}`)
        resolved = true
        clearTimeout(timeoutTimer)
        resolvePromise({
          url: capturedUrl,
          process: child,
          stop: async () => {
            cleanup()
          }
        })
      }
    }

    child.stdout?.on('data', handleOutput)
    child.stderr?.on('data', handleOutput)

    child.once('error', (err) => {
      if (!resolved) {
        clearTimeout(timeoutTimer)
        rejectPromise(err)
      }
    })

    child.once('close', (code, signal) => {
      if (!resolved) {
        clearTimeout(timeoutTimer)
        rejectPromise(new Error(`cloudflared exited unexpectedly with code ${code}, signal ${signal}`))
      }
    })

    const cleanup = () => {
      try {
        if (!child.killed) {
          child.kill('SIGTERM')
          setTimeout(() => {
            if (!child.killed) child.kill('SIGKILL')
          }, 2000).unref?.()
        }
      } catch {}
    }
  })
}
