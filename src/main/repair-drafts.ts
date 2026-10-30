import { randomUUID } from 'node:crypto'

/** Pending UI text only: entering repair must never submit a model request. */
export class RepairDrafts {
  private drafts = new Map<string, { text: string; token: string }>()

  set(sessionId: string, text: string): void {
    if (!/^[A-Za-z0-9_-]{1,160}$/.test(sessionId) || !text.trim() || text.length > 16_000) {
      throw new Error('Invalid repair draft')
    }
    this.drafts.set(sessionId, { text, token: randomUUID() })
    if (this.drafts.size > 32) {
      const oldest = this.drafts.keys().next().value
      if (oldest !== undefined) this.drafts.delete(oldest)
    }
  }

  get(sessionId: string): { text?: string; token?: string } {
    return { ...this.drafts.get(sessionId) }
  }

  acknowledge(sessionId: string, token: string): boolean {
    if (!token || this.drafts.get(sessionId)?.token !== token) return false
    return this.drafts.delete(sessionId)
  }
}
