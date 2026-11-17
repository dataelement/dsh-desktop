/**
 * Wrap `Socket.prototype.setTypeOfService` so an EINVAL from the platform
 * no longer escapes the undici write path. Returns true when the guard was
 * installed (the runtime exposes the API and the bundled undici predates
 * undici#6076). `netModule` is the node:net module; typed as unknown because
 * the repository's own @types/node may predate `setTypeOfService`.
 */
export function installTypeOfServiceGuard(
  netModule: unknown,
  undiciVersion: string | undefined,
  warn: (message: string) => void
): boolean
