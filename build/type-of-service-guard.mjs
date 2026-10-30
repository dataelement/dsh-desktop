// Node 24's bundled undici (7.29.x) calls socket.setTypeOfService on every
// HTTP/1.1 request write without a try/catch. When a connection is reset in
// the window between connect and the first write, macOS setsockopt(IP_TOS)
// answers EINVAL, the synchronous throw escapes as an uncaught exception,
// and the Harness host dies — entering the plugin market fires enough
// requests to hit it (issue #821; upstream undici#5544, fixed by the 7.x
// backport undici#6076 which no Node 24 release ships yet). The upstream fix
// ignores type-of-service errors entirely, so this guard does the same for
// EINVAL only and installs itself only while the bundled undici predates the
// fix; it self-disables once the runtime reports >= 7.30.1.

const FIXED_UNDICI = [7, 30, 1]

function undiciPredatesFix(undiciVersion) {
  const parts = String(undiciVersion ?? '').split('.').map((n) => Number.parseInt(n, 10))
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) {
    return false
  }
  for (let index = 0; index < FIXED_UNDICI.length; index += 1) {
    if (parts[index] < FIXED_UNDICI[index]) return true
    if (parts[index] > FIXED_UNDICI[index]) return false
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
            `[harness-node] ignoring setTypeOfService EINVAL (bundled undici ${undiciVersion} < 7.30.1, undici#5544, issue #821)\n`
          )
        }
        return undefined
      }
      throw error
    }
  }
  return true
}
