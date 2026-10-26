export type ProcessFailureKind = 'memory' | 'graphics'
export type ProcessRecoveryAction = 'quit' | 'restart' | 'software'

/** Once recovery starts, no automatic reload or runtime restart may re-enter
 * the failing workload. Only an explicit user choice starts another process. */
export class ProcessFailureRecovery {
  blocked = false
  private memoryStop: Promise<void> | undefined
  constructor(private readonly options: {
    stop: () => Promise<void>
    releasePage: () => Promise<void>
    prompt: (kind: ProcessFailureKind) => Promise<ProcessRecoveryAction>
    restart: (software: boolean) => void
    quit: () => void
    onError: (error: unknown) => void
  }) {}

  start(kind: ProcessFailureKind): void {
    if (this.blocked) {
      // A graphics prompt must never mask a later memory emergency.
      if (kind === 'memory') void this.stopForMemory().catch(this.options.onError)
      return
    }
    this.blocked = true
    void this.recover(kind).catch(this.options.onError)
  }

  private stopForMemory(): Promise<void> {
    this.memoryStop ??= this.options.stop().then(() => this.options.releasePage())
    return this.memoryStop
  }

  private async recover(kind: ProcessFailureKind): Promise<void> {
    if (kind === 'memory') await this.stopForMemory()
    const action = await this.options.prompt(kind)
    if (this.memoryStop) await this.memoryStop
    if (action !== 'quit') this.options.restart(action === 'software')
    this.options.quit()
  }
}
