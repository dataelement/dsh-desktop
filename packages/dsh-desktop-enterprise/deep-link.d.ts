export declare const ENTERPRISE_LOGIN_PROTOCOL = "dsh-desktop"
export interface EnterpriseLoginDeepLink {
  url: string
  serverUrl: string
}
export declare function normalizeEnterpriseServerUrl(
  value: string,
  options?: { allowInsecureLoopback?: boolean }
): string
export declare function parseEnterpriseLoginDeepLink(value: string): EnterpriseLoginDeepLink
export declare function enterpriseLoginDeepLinkFromArgv(
  argv: readonly string[]
): EnterpriseLoginDeepLink | undefined
