// Node's bundled undici calls socket.setTypeOfService on every HTTP/1.1
// request write without a try/catch in the versions listed below. When a
// connection is reset in the window between connect and the first write,
// macOS setsockopt(IP_TOS) answers EINVAL, the synchronous throw escapes as
// an uncaught exception, and the process dies (issue #821; upstream
// undici#5544). The upstream fix ignores type-of-service errors entirely, so
// this guard does the same for EINVAL only, while the bundled undici still
// predates the fix.
//
// Guarded versions, verified by diffing lib/dispatcher/client-h1.js of each
// released package on npm: 7.x < 7.30.2 (the 7.x backport undici#6076 first
// shipped in 7.30.2; 7.30.1 still throws, see the undici#6075 matrix), and
// 8.0.0 through 8.7.x (bare setTypeOfService call again; 8.8.0 restored the
// try/catch). Future majors are assumed fixed — bump the thresholds when a
// regression is ever proven there.

const FIXED_UNDICI_BY_MAJOR = new Map([
  [7, [7, 30, 2]],
  [8, [8, 8, 0]]
])

function undiciPredatesFix(undiciVersion) {
  const parts = String(undiciVersion ?? '').split('.').map((n) => Number.parseInt(n, 10))
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) {
    return false
  }
  const fixed = FIXED_UNDICI_BY_MAJOR.get(parts[0])
  if (fixed === undefined) {
    return false
  }
  for (let index = 0; index < fixed.length; index += 1) {
    if (parts[index] < fixed[index]) return true
    if (parts[index] > fixed[index]) return false
  }
  return false
}

/**
 * Wrap `Socket.prototype.setTypeOfService` so an EINVAL from the platform
 * no longer escapes the undici write path. Returns true when the guard was
 * installed (bundled undici predates the fix and the API exists).
 */
export function installTypeOfServiceGuard(netModule, undiciVersion, warn) {
  const proto = netModule?.Socket?.prototype
  if (!proto || typeof proto.setTypeOfService !== 'function' || !undiciPredatesFix(undiciVersion)) {
    return false
  }
  const original = proto.setTypeOfService
  let warned = false
  proto.setTypeOfService = function setTypeOfServiceGuarded(value) {
    try {
      return original.call(this, value)
    } catch (error) {
      if (error && error.code === 'EINVAL') {
        if (!warned) {
          warned = true
          warn(
            `[harness-node] ignoring setTypeOfService EINVAL (bundled undici ${undiciVersion} lacks the type-of-service fix, undici#5544, issue #821)\n`
          )
        }
        return undefined
      }
      throw error
    }
  }
  return true
}
