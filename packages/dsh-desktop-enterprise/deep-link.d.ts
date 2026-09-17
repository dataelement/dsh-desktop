export declare const ENTERPRISE_LOGIN_PROTOCOL = "dsh-desktop"
export declare const ENTERPRISE_LOGIN_DEV_PROTOCOL = "dsh-desktop-dev"
export interface EnterpriseLoginDeepLink {
  url: string
  serverUrl: string
}
export interface EnterpriseUrlOptions {
  allowInsecureLoopback?: boolean
  allowInsecurePrivateHttp?: boolean
}
export declare function isInsecurePrivateHttpOrigin(value: string): boolean
export declare function normalizeEnterpriseServerUrl(
  value: string,
  options?: EnterpriseUrlOptions
): string
export declare function parseEnterpriseLoginDeepLink(
  value: string,
  options?: EnterpriseUrlOptions
): EnterpriseLoginDeepLink
export declare function enterpriseLoginDeepLinkFromArgv(
  argv: readonly string[],
  options?: EnterpriseUrlOptions
): EnterpriseLoginDeepLink | undefined
