export type RollbackStage = 'confirm' | 'progress' | 'success'
export type RollbackAction = 'confirm' | 'cancel' | 'continue'
export interface RollbackPageState {
  locale: string
  stage: RollbackStage
  currentVersion: string
  targetVersion: string
  simulation: boolean
  message?: string
  detail?: string
}
/** Owns only the rollback interaction. Installer eligibility remains in update manager. */
export class ApplicationRollbackFlow {
  private aborted = false
  private running = false
  private stage?: RollbackStage
  private resolver?: (action: RollbackAction) => void
  constructor(private readonly show: (state: RollbackPageState) => Promise<void>) {}
  /** Window closure stops UI ownership; an already running installer is not undone. */
  abort(): void {
    if (!this.running) return
    this.aborted = true
    const resolve = this.resolver
    this.resolver = undefined
    resolve?.('cancel')
  }
  assertActive(): void {
    if (this.aborted) throw new Error('Rollback view was closed')
  }
  action(value: unknown): boolean {
    if (!this.resolver || !((this.stage === 'confirm' && (value === 'confirm' || value === 'cancel')) ||
      (this.stage === 'success' && value === 'continue'))) return false
    const resolve = this.resolver
    this.resolver = undefined
    resolve(value as RollbackAction)
    return true
  }
  private async wait(state: RollbackPageState): Promise<RollbackAction> {
    this.assertActive()
    this.stage = state.stage
    const pending = new Promise<RollbackAction>(resolve => { this.resolver = resolve })
    try { await this.show(state); return await pending }
    finally { this.resolver = undefined }
  }
  async run(state: Omit<RollbackPageState, 'stage'>, execute: (progress: (message: string) => Promise<void>) => Promise<void>): Promise<'cancelled' | 'completed' | 'closed'> {
    if (this.running) throw new Error('Rollback is already running')
    this.running = true
    this.aborted = false
    try {
      const action = await this.wait({ ...state, stage: 'confirm' })
      this.assertActive()
      if (action === 'cancel') return 'cancelled'
      this.stage = 'progress'
      await this.show({ ...state, stage: 'progress', message: state.locale === 'zh' ? '正在准备回退' : 'Preparing rollback' })
      this.assertActive()
      await execute(async message => {
        this.assertActive()
        await this.show({ ...state, stage: 'progress', message })
        this.assertActive()
      })
      this.assertActive()
      // A real installer relaunches the application; only the isolated simulation
      // can report success here, after its real runtime readiness check.
      if (state.simulation) await this.wait({ ...state, stage: 'success' })
      this.assertActive()
      return 'completed'
    } catch (error) {
      if (this.aborted) return 'closed'
      throw error
    } finally { this.running = false; this.stage = undefined; this.resolver = undefined }
  }
}
