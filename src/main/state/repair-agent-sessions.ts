import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export type RepairSessionEnvironment = 'normal' | 'safe'
export interface SavedRepairSession { sessionId: string; briefed: boolean }
type RepairSessions = Partial<Record<RepairSessionEnvironment, SavedRepairSession>>

/** Only repair addresses are persisted; Harness remains the owner of session history. */
export class RepairSessionStore {
  private queue: Promise<unknown> = Promise.resolve()
  constructor(private readonly directory: string) {}

  private async read(): Promise<RepairSessions> {
    let text: string
    try { text = await readFile(join(this.directory, 'repair-agent-sessions.json'), 'utf8') } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
      throw error
    }
    const value: unknown = JSON.parse(text)
    if (!value || typeof value !== 'object') throw new Error('Invalid repair session state')
    const saved: RepairSessions = {}
    for (const key of ['normal', 'safe'] as const) {
      if (!(key in value)) continue
      const entry: unknown = Reflect.get(value, key)
      if (!entry || typeof entry !== 'object' || !('sessionId' in entry) || typeof entry.sessionId !== 'string' ||
          !/^[a-zA-Z0-9_-]{1,160}$/.test(entry.sessionId) || !('briefed' in entry) || typeof entry.briefed !== 'boolean') {
        throw new Error('Invalid repair session state')
      }
      saved[key] = { sessionId: entry.sessionId, briefed: entry.briefed }
    }
    return saved
  }

  async load(environment: RepairSessionEnvironment): Promise<SavedRepairSession | undefined> {
    // A failed earlier write must not poison reads after its filesystem issue is corrected.
    await this.queue.catch(() => undefined)
    return (await this.read())[environment]
  }

  clear(environment: RepairSessionEnvironment): Promise<void> {
    return this.save(environment, undefined)
  }

  save(environment: RepairSessionEnvironment, session: SavedRepairSession | undefined): Promise<void> {
    const operation = this.queue.catch(() => undefined).then(async () => {
      const saved = await this.read()
      if (session) saved[environment] = session
      else delete saved[environment]
      await mkdir(this.directory, { recursive: true })
      const destination = join(this.directory, 'repair-agent-sessions.json')
      const temporary = `${destination}.tmp`
      await writeFile(temporary, JSON.stringify(saved), { encoding: 'utf8', mode: 0o600 })
      await rename(temporary, destination)
    })
    this.queue = operation
    return operation
  }
}
