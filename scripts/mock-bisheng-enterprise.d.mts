export interface MockEnterpriseServer {
  state: Record<string, unknown>
  listen(): Promise<string>
  close(): Promise<void>
}
export declare function createMockEnterpriseServer(options?: {
  host?: string
  port?: number
}): MockEnterpriseServer
