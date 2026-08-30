const DEFAULT_PRODUCTION_MOBILE_BRIDGE_PORT = 43127
const DEFAULT_DEVELOPMENT_MOBILE_BRIDGE_PORT = 43128

export const MOBILE_BRIDGE_PORT_ENVIRONMENT_VARIABLE = 'DSH_DESKTOP_MOBILE_BRIDGE_PORT'

export function resolveMobileBridgePort(
  developmentBuild: boolean,
  environment: Readonly<Record<string, string | undefined>> = process.env
): number {
  const configured = environment[MOBILE_BRIDGE_PORT_ENVIRONMENT_VARIABLE]
  if (configured === undefined) {
    return developmentBuild
      ? DEFAULT_DEVELOPMENT_MOBILE_BRIDGE_PORT
      : DEFAULT_PRODUCTION_MOBILE_BRIDGE_PORT
  }
  if (!/^[1-9]\d*$/u.test(configured)) {
    throw new Error(`${MOBILE_BRIDGE_PORT_ENVIRONMENT_VARIABLE} must be an integer from 1 to 65535`)
  }
  const port = Number(configured)
  if (!Number.isSafeInteger(port) || port > 65535) {
    throw new Error(`${MOBILE_BRIDGE_PORT_ENVIRONMENT_VARIABLE} must be an integer from 1 to 65535`)
  }
  return port
}
