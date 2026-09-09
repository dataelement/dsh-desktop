export declare const DEFAULT_NPM_REGISTRY: string

export declare function registryFromArguments(args?: readonly string[]): string | null

export declare function readMarketRegion(profileDir: string): Promise<'global' | 'china' | null>

export declare function resolveMarketRegistry(options: {
  profileDir: string
  args?: readonly string[]
  environment?: NodeJS.ProcessEnv
}): Promise<string | null>
