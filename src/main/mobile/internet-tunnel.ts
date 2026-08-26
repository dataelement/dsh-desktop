import type { ChildProcess } from 'node:child_process'

export type InternetTunnelProvider = 'cloudflare' | 'pinggy'

export interface InternetTunnelInstance {
  provider: InternetTunnelProvider
  url: string
  process: ChildProcess
  stop: () => Promise<void>
}

export async function startTunnelWithFallback(options: {
  startCloudflare: () => Promise<InternetTunnelInstance>
  startPinggy: () => Promise<InternetTunnelInstance>
  forceCloudflareFailure?: boolean
  log?: (message: string) => void
}): Promise<InternetTunnelInstance> {
  try {
    if (options.forceCloudflareFailure) {
      throw new Error('Cloudflare failure forced by DSH_TUNNEL_FORCE_PINGGY')
    }
    return await options.startCloudflare()
  } catch (cloudflareError) {
    const cloudflareMessage = errorMessage(cloudflareError)
    options.log?.(`[tunnel] Cloudflare unavailable, falling back to Pinggy: ${cloudflareMessage}`)
    try {
      return await options.startPinggy()
    } catch (pinggyError) {
      throw new Error(
        `Unable to create an internet tunnel. Cloudflare: ${cloudflareMessage}; Pinggy: ${errorMessage(pinggyError)}`
      )
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
