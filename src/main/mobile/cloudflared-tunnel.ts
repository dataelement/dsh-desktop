import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { chmod, mkdir, rm, writeFile } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { get as httpsGet } from 'node:https'
import { dirname, join } from 'node:path'
import { arch, platform } from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { InternetTunnelInstance } from './internet-tunnel'

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
    sha256: '9f24e9cb54b9d031bf3dc2c2c9d2f0eb345d3151eb0c877ef945d8b74684a0d9'
  },
  'darwin-x64': {
    asset: 'cloudflared-darwin-amd64.tgz',
    isTarGz: true,
    sha256: '4fc703cf97e42d76535d9ef264a974b971a8bc59e0a0d6aa0d59265f212fb9a7'
  },
  'win32-x64': {
    asset: 'cloudflared-windows-amd64.exe',
    isTarGz: false,
    sha256: '64d4b1a457497d510e1a1e0dc42e128ef35b2e564bfd4847bf501309d949cf97'
  },
  'linux-x64': {
    asset: 'cloudflared-linux-amd64',
    isTarGz: false,
    sha256: 'df36987f2ff841a4a4dcf9c4c7c88b9fc964177d6118d2bf4cfb0069ecad1ae5'
  },
  'linux-arm64': {
    asset: 'cloudflared-linux-arm64',
    isTarGz: false,
    sha256: '25c898c61ce55a90d9a6c9cf1b72e0a2948eb927a4d5e86976f7f6c6d05f3d45'
  }
}

export function extractTryCloudflareUrl(text: string): string | null {
  const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/i)
  return match && match[0].toLowerCase() !== 'https://api.trycloudflare.com' ? match[0] : null
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

export async function ensureCloudflaredBinary(options: {
  cacheDir: string
  customPath?: string
  osPlatform?: NodeJS.Platform | string
  osArch?: NodeJS.Architecture | string
}): Promise<string> {
  if (options.customPath && existsSync(options.customPath)) {
    return options.customPath
  }

  const onPath = await findCloudflaredOnPath()
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
  const downloadUrl = `https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_VERSION}/${target.spec.asset}`
  const tempDownloadPath = join(options.cacheDir, `.download-${Date.now()}-${target.spec.asset}`)

  try {
    await downloadFileWithRedirects(downloadUrl, tempDownloadPath)

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

export interface CloudflareTunnelInstance extends InternetTunnelInstance {
  provider: 'cloudflare'
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
          provider: 'cloudflare',
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
