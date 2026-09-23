import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { app } from 'electron'
import { sameHarnessOrigin } from './harness-origin'

export { sameHarnessOrigin }

export const ENTERPRISE_LOGIN_PROTOCOL = 'bisheng-work'
export const ENTERPRISE_LOGIN_DEV_PROTOCOL = 'bisheng-work-dev'

function packagedDevelopmentChannel(): boolean {
  if (!app.isPackaged) return false
  try {
    const metadata = JSON.parse(
      readFileSync(join(app.getAppPath(), 'package.json'), 'utf8')
    ) as { dshDesktopChannel?: unknown }
    return metadata.dshDesktopChannel === 'development'
  } catch {
    return false
  }
}

export function enterpriseLoginProtocol(): string {
  // A packaged development build must not claim the production scheme, or it
  // would take enterprise login links away from the installed BISHENG Work app.
  return app.isPackaged && !packagedDevelopmentChannel()
    ? ENTERPRISE_LOGIN_PROTOCOL
    : ENTERPRISE_LOGIN_DEV_PROTOCOL
}

export function allowInsecureEnterpriseLoopback(): boolean {
  return !app.isPackaged
}

export function registerEnterpriseLoginProtocol(): void {
  const scheme = enterpriseLoginProtocol()
  if (app.isPackaged) {
    app.setAsDefaultProtocolClient(scheme)
    return
  }
  const scriptPath = process.argv[1] ? resolve(process.argv[1]) : process.cwd()
  app.setAsDefaultProtocolClient(scheme, process.execPath, [scriptPath])
}

export async function parseEnterpriseLoginLink(value: string) {
  const { parseEnterpriseLoginDeepLink } = await import('dsh-desktop-enterprise/deep-link')
  return parseEnterpriseLoginDeepLink(value, {
    allowInsecureLoopback: allowInsecureEnterpriseLoopback(),
    allowInsecurePrivateHttp: true
  })
}

export async function enterpriseLoginFromArgv(argv: readonly string[]) {
  const { enterpriseLoginDeepLinkFromArgv } = await import('dsh-desktop-enterprise/deep-link')
  return enterpriseLoginDeepLinkFromArgv(argv, {
    allowInsecureLoopback: allowInsecureEnterpriseLoopback(),
    allowInsecurePrivateHttp: true
  })
}
