// Review is optional UI. Sending owns its packet independently of a browser pane.
// Keep the exact attempt after a transport failure; a lost ack must never create
// another model message, and edits made during the attempt must survive retirement.
export function createDirectSender({
  prepare,
  deliver,
  retire,
  ack,
  onStart = () => {},
  onSuccess = () => {},
  onError = () => {},
  onEnd = () => {},
}) {
  let pending = null,
    inFlight = null
  return {
    send() {
      if (inFlight) return inFlight
      inFlight = Promise.resolve().then(async () => {
        onStart()
        try {
          if (!pending)
            pending = {
              packet: await prepare(),
              attempt: {},
              accepted: false,
              retired: false,
            }
          const p = pending
          if (!p.accepted) {
            await deliver(p.packet, p.attempt)
            p.accepted = true
          }
          if (!p.retired) {
            retire(p.packet)
            p.retired = true
          }
          const state = await ack(p.packet)
          pending = null
          onSuccess(state)
          return state
        } catch (error) {
          if (error.admissionRejected && !pending?.accepted) pending = null
          onError(error)
          throw error
        } finally {
          inFlight = null
          onEnd()
        }
      })
      return inFlight
    },
  }
}
