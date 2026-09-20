import { app } from 'electron'
import { resolve } from 'node:path'
import { sameHarnessOrigin } from './harness-origin'

export { sameHarnessOrigin }

export const ENTERPRISE_LOGIN_PROTOCOL = 'dsh-desktop'
export const ENTERPRISE_LOGIN_DEV_PROTOCOL = 'dsh-desktop-dev'

export function enterpriseLoginProtocol(): string {
  return app.isPackaged ? ENTERPRISE_LOGIN_PROTOCOL : ENTERPRISE_LOGIN_DEV_PROTOCOL
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
