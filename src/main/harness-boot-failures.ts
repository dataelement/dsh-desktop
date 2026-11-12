/** Bind frontend failure reports to the document registered by preload.
 * Old documents may finish rejected boot promises while repair navigates away.
 */
export class HarnessBootFailures {
  private currentDocument?: string
  private readonly documents = new Map<string, number>()

  bind(documentId: unknown, navigationVersion: number): void {
    if (typeof documentId !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/.test(documentId)) {
      throw new Error('Invalid Harness boot document identity.')
    }
    // A repeated request from an old document must not adopt the new launch.
    if (!this.documents.has(documentId)) {
      this.documents.set(documentId, navigationVersion)
      this.currentDocument = documentId
    }
    if (this.documents.size > 64) this.documents.delete(this.documents.keys().next().value ?? '')
  }

  isCurrent(documentId: unknown, navigationVersion: number): boolean {
    return typeof documentId === 'string' && documentId === this.currentDocument && this.documents.get(documentId) === navigationVersion
  }
}
