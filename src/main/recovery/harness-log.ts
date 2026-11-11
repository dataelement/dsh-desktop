/**
 * Runtime logger output bridged by `dsh-desktop-log-bridge`. It is kept in
 * harness.log for people and the Repair Agent, but it is not launch evidence:
 * a warning logged while running must not become recovery's failure cause or
 * the plugin it blames.
 */
const BRIDGED_LOG_PREFIX = '[stderr] [harness-log] '

/** The latest launch attempt's log lines, without bridged runtime logger output. */
export function latestHarnessAttemptLogs(logLines: readonly string[]): readonly string[] {
  let start = 0
  for (let index = logLines.length - 1; index >= 0; index -= 1) {
    if (logLines[index]?.trimStart().startsWith('[desktop] starting ')) {
      start = index + 1
      break
    }
  }
  return logLines.slice(start).filter((line) => !line.startsWith(BRIDGED_LOG_PREFIX))
}

export function extractFailureCause(logLines: readonly string[]): string | undefined {
  const stderrLines: string[] = []
  let dshEntryError: string | undefined
  let uncaughtError: string | undefined

  for (const line of latestHarnessAttemptLogs(logLines)) {
    if (!line.startsWith('[stderr] ')) continue
    const text = line.slice(8)
    stderrLines.push(text)

    if (dshEntryError === undefined) {
      const m = text.match(/DSH entry failed:\s*(.+)/)
      if (m && m[1]) dshEntryError = m[1].trim()
    }

    if (uncaughtError === undefined) {
      const m1 = text.match(/uncaught exception:\s*(.+)/)
      if (m1 && m1[1]) {
        uncaughtError = m1[1].trim()
      } else {
        const m2 = text.match(/unhandled rejection:\s*(.+)/)
        if (m2 && m2[1]) uncaughtError = m2[1].trim()
      }
    }
  }

  if (dshEntryError) return dshEntryError
  if (uncaughtError) return uncaughtError

  for (let i = stderrLines.length - 1; i >= 0; i--) {
    const line = stderrLines[i]?.trim()
    if (!line) continue
    if (line.length < 200 && /\b(error|Error|ERROR|failed|Failed|FAILED)\b/.test(line)) {
      return line
    }
  }

  if (stderrLines.length > 0) {
    const last = stderrLines[stderrLines.length - 1]?.trim()
    if (last && last.length < 200) return last
  }

  return undefined
}

export function extractDshEntryFailureCause(
  logLines: readonly string[]
): string | undefined {
  for (const line of latestHarnessAttemptLogs(logLines)) {
    if (!line.startsWith('[stderr] ')) continue
    const match = line.slice(8).match(/DSH entry failed:\s*(.+)/)
    if (match?.[1]) return match[1].trim()
  }
  return undefined
}

const CORE_BUNDLES = new Set(['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'])
const PACKAGE_REFERENCE_PATTERN = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i

function isPackageReference(value: string): boolean {
  const candidate = value.trim()
  if (!candidate || candidate.includes(':')) return false
  return PACKAGE_REFERENCE_PATTERN.test(candidate)
}

function isActionablePluginReference(value: string): boolean {
  const candidate = value.trim()
  return (
    isPackageReference(candidate) &&
    !CORE_BUNDLES.has(candidate) &&
    !candidate.startsWith('@deepseek-ai/')
  )
}

function extractPluginReferences(
  logLines: readonly string[],
  accepts: (value: string) => boolean
): string[] {
  const plugins = new Set<string>()
  const attemptLogs = latestHarnessAttemptLogs(logLines)
  const hasDuplicatePrefixRoute = attemptLogs.some((line) =>
    line.startsWith('[stderr] ') && /duplicate prefix route ["'][^"']+["']/i.test(line)
  )

  for (const line of attemptLogs) {
    if (!line.startsWith('[stderr] ')) continue
    const text = line.slice(8)
    const bootFailureLines = text.split(/\r?\n/).map((value) => value.trim())

    // Loader failures are nested (for example the internal `cordis:include`
    // entry wrapping a third-party bundle). Collect every entry in the chain;
    // taking only the first one loses the actual uninstallable owner.
    for (const match of text.matchAll(
      /failed to (?:apply|import|activate) loader entry [^\s]+ \((@[^)]+|[^)]+)\)/gi
    )) {
      if (match[1] && accepts(match[1])) plugins.add(match[1].trim())
    }

    const m2 = text.match(/cannot resolve profile bundle ["']([^"']+)["']/i)
    if (m2 && m2[1] && accepts(m2[1])) {
      plugins.add(m2[1].trim())
    }

    const m3 = text.match(/profile bundle ["']([^"']+)["'] declares no dsh\.bundle/i)
    if (m3 && m3[1] && accepts(m3[1])) {
      plugins.add(m3[1].trim())
    }

    const m5 = text.match(/plugin\(s\) failed to load:\s*([a-zA-Z0-9@/_-]+)/i)
    if (m5 && m5[1] && accepts(m5[1])) {
      plugins.add(m5[1].trim())
    }

    for (const candidate of bootFailureLines) {
      const pendingEntry = candidate.match(
        /^((?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*):\s*pending\s*\(waiting for service:\s*[^)]+\)\s*$/i
      )
      if (pendingEntry?.[1] && accepts(pendingEntry[1])) {
        plugins.add(pendingEntry[1].trim())
      }
    }

    // Some Harness errors do not include the loader wrapper that normally
    // names the bundle. For duplicate routes, the first profile stack frame is
    // still direct ownership evidence. Restrict stack extraction to that
    // failure class so unrelated warnings cannot turn into removal suspects.
    if (hasDuplicatePrefixRoute) {
      for (const match of text.matchAll(
        /[\\/]profiles[\\/][^\\/\s]+[\\/]node_modules[\\/]((?:@[^\\/\s]+[\\/])?[^\\/\s)]+)/gi
      )) {
        const candidate = match[1]?.replace(/\\/g, '/')
        if (candidate && accepts(candidate)) plugins.add(candidate.trim())
      }
    }

    const bootFailureTitle = bootFailureLines.findIndex((value) => value === 'Failed to load plugins')
    if (bootFailureTitle >= 0) {
      for (const candidate of bootFailureLines.slice(bootFailureTitle + 1)) {
        if (accepts(candidate)) plugins.add(candidate)
      }
    }
  }

  return [...plugins]
}

export function extractPluginFailureReferences(logLines: readonly string[]): string[] {
  return extractPluginReferences(logLines, isPackageReference)
}

export function extractOffendingPlugins(logLines: readonly string[]): string[] {
  return extractPluginReferences(logLines, isActionablePluginReference)
}

export function extractDuplicateAgentPresetId(
  logLines: readonly string[]
): string | undefined {
  for (const line of latestHarnessAttemptLogs(logLines)) {
    if (!line.startsWith('[stderr] ')) continue
    const match = line.slice(8).match(/Duplicate agent preset:\s*([^\s"']+)/i)
    if (match?.[1]) return match[1].trim()
  }
  return undefined
}

export function extractDuplicateLoaderEntryId(
  logLines: readonly string[]
): string | undefined {
  for (const line of latestHarnessAttemptLogs(logLines)) {
    if (!line.startsWith('[stderr] ')) continue
    const match = line.slice(8).match(/duplicate loader entry id:\s*["']?([^\s"']+)["']?/i)
    if (match?.[1]) return match[1].trim()
  }
  return undefined
}

export function extractSlotConflictName(
  logLines: readonly string[]
): string | undefined {
  for (const line of latestHarnessAttemptLogs(logLines)) {
    if (!line.startsWith('[stderr] ')) continue
    const text = line.slice(8)
    const loaderMatch = text.match(
      /single slot\s+["']([^"']+)["']\s+already has a registration/i
    )
    if (loaderMatch?.[1]) return loaderMatch[1].trim()
    const rendererMatch = text.match(
      /UI slot\s+["']([^"']+)["']\s+has duplicate registrations/i
    )
    if (rendererMatch?.[1]) return rendererMatch[1].trim()
  }
  return undefined
}

export function extractOffendingPlugin(logLines: readonly string[]): string | undefined {
  return extractOffendingPlugins(logLines)[0]
}
