/**
 * DSH Desktop listens on 43127–43130 (mobile bridge, then Harness, each with a
 * development port one higher). BISHENG Work keeps its own stable ports so
 * both desktops can run at the same time.
 */
const BISHENG_MOBILE_PORT = 43227
const BISHENG_HARNESS_PORT = 43229

export function mobileBridgePort(developmentBuild: boolean): number {
  return BISHENG_MOBILE_PORT + (developmentBuild ? 1 : 0)
}

export function harnessPreferredPort(developmentBuild: boolean): number {
  return BISHENG_HARNESS_PORT + (developmentBuild ? 1 : 0)
}
