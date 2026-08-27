export type ElectronFilePathResolver = (file: File) => unknown

export type ResearchPreviewIdentity = {
  sessionId: string
  nodeId: string
}

export type ResearchPreviewDescriptor = {
  authorizationId: string
  capabilityToken: string
  url: string
  contentType: string
  name: string
}

type ResearchPreviewInvoke = (channel: string, value: unknown) => Promise<unknown>

export function safePathForFile(file: File, resolve: ElectronFilePathResolver): string {
  try {
    const value = resolve(file)
    return typeof value === 'string' ? value : ''
  } catch {
    return ''
  }
}

function validIdentity(value: ResearchPreviewIdentity): boolean {
  return typeof value?.sessionId === 'string' && value.sessionId.length > 0 &&
    typeof value.nodeId === 'string' && value.nodeId.length > 0
}

export function researchFinderAdmissionRequest(
  file: File,
  identity: ResearchPreviewIdentity,
  resolve: ElectronFilePathResolver
): { path: string; sessionId: string; nodeId: string } | null {
  if (!validIdentity(identity)) return null
  const path = safePathForFile(file, resolve)
  if (path.length === 0) return null
  return { path, sessionId: identity.sessionId, nodeId: identity.nodeId }
}

export function createResearchPreviewBridge(
  resolve: ElectronFilePathResolver,
  invoke: ResearchPreviewInvoke
) {
  return Object.freeze({
    async admitFinderFile(
      file: File,
      identity: ResearchPreviewIdentity
    ): Promise<ResearchPreviewDescriptor | null> {
      const request = researchFinderAdmissionRequest(file, identity, resolve)
      if (request === null) return null
      return invoke('research:preview:admit-finder', request) as Promise<ResearchPreviewDescriptor | null>
    },
    admitSidebarFile(value: ResearchPreviewIdentity & { relativePath: string }) {
      return invoke('research:preview:admit-sidebar', value) as Promise<ResearchPreviewDescriptor | null>
    },
    restore(value: ResearchPreviewIdentity & { authorizationId: string }) {
      return invoke('research:preview:restore', value) as Promise<ResearchPreviewDescriptor | null>
    },
    release(value: ResearchPreviewIdentity & {
      authorizationId: string
      capabilityToken: string
    }) {
      return invoke('research:preview:release', value) as Promise<{ ok: boolean }>
    },
    revokeNode(identity: ResearchPreviewIdentity) {
      return invoke('research:preview:revoke-node', identity) as Promise<{ ok: boolean }>
    },
    revokeSession(sessionId: string) {
      return invoke('research:preview:revoke-session', { sessionId }) as Promise<{ ok: boolean }>
    }
  })
}
