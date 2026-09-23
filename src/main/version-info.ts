import { readFileSync } from 'node:fs'
import { join } from 'node:path'

interface PackageMetadata {
  version?: unknown
  dependencies?: Record<string, unknown>
}

function readPackageMetadata(path: string): PackageMetadata | undefined {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as PackageMetadata
  } catch {
    return undefined
  }
}

function validVersion(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

export function bundledHarnessVersion(appPath: string): string | undefined {
  const installedMetadata = readPackageMetadata(
    join(appPath, 'node_modules', '@deepseek-ai', 'dsh', 'package.json')
  )
  const installedVersion = validVersion(installedMetadata?.version)
  if (installedVersion) return installedVersion

  const appMetadata = readPackageMetadata(join(appPath, 'package.json'))
  return validVersion(appMetadata?.dependencies?.['@deepseek-ai/dsh'])
}

export function aboutDetail(
  desktopVersion: string,
  harnessVersion: string | undefined,
  locale: 'en' | 'zh'
): string {
  const harness = harnessVersion ?? (locale === 'zh' ? '未知' : 'Unknown')
  if (locale === 'zh') {
    return `BISHENG Work 版本：${desktopVersion}\n内置 Harness 版本：${harness}\n\nHarness 随 BISHENG Work 更新。`
  }
  return `BISHENG Work version: ${desktopVersion}\nBundled Harness version: ${harness}\n\nHarness is updated with BISHENG Work.`
}
