// A local mode change must never wait for a screenshot. Keep one capture in
// flight and let input wake the next capture immediately instead of waiting
// through the normal polling delay.
export function createFramePump({
  read,
  present,
  onError = () => {},
  interval = () => 180,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}) {
  let stopped = false,
    timer = null,
    inFlight = null,
    urgent = false
  const request = () => {
    if (stopped) return Promise.resolve()
    if (timer !== null) {
      clearTimer(timer)
      timer = null
    }
    if (inFlight) {
      urgent = true
      return inFlight
    }
    inFlight = Promise.resolve()
      .then(read)
      .then((frame) => {
        if (!stopped && frame) return present(frame)
      })
      .catch((error) => {
        if (!stopped) onError(error)
      })
      .finally(() => {
        inFlight = null
        if (stopped) return
        if (urgent) {
          urgent = false
          void request()
        } else
          timer = setTimer(() => {
            timer = null
            void request()
          }, interval())
      })
    return inFlight
  }
  return {
    request,
    stop() {
      stopped = true
      urgent = false
      if (timer !== null) clearTimer(timer)
      timer = null
    },
  }
}
