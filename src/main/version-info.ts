import type { DesktopLocale } from '../shared/desktop-locale'
import { updateText } from '../shared/desktop-update-messages'
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
  locale: DesktopLocale
): string {
  const harness = harnessVersion ?? updateText(locale, 'unknown')
  return `${updateText(locale, 'desktopVersion', { version: desktopVersion })}\n${updateText(locale, 'harnessVersion', { version: harness })}\n\n${updateText(locale, 'harnessUpdated')}`
}
