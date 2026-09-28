import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

export const TEMPORARY_CHAT_PARENT_DIRECTORY = 'DSH Desktop'
export const TEMPORARY_CHAT_DIRECTORY = 'Temporary Chats'

function compactTimestamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

/**
 * Creates one durable, isolated workspace for a conversation that did not start
 * from an existing project. The caller supplies the OS user home so this helper
 * stays testable without depending on Electron's global app object.
 */
export async function createTemporaryChatWorkspace(
  userHome: string,
  options: { now?: Date; uniqueId?: string } = {}
): Promise<{ path: string }> {
  const root = join(userHome, TEMPORARY_CHAT_PARENT_DIRECTORY, TEMPORARY_CHAT_DIRECTORY)
  const suffix = (options.uniqueId ?? randomUUID()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)
  const name = `chat-${compactTimestamp(options.now ?? new Date())}-${suffix}`
  const path = join(root, name)

  await mkdir(root, { recursive: true })
  await mkdir(path)
  return { path }
}
