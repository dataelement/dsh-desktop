import { verifyWithFallback } from "@octokit/webhooks-methods";
async function verifyAndReceive(state, event) {
  const matchesSignature = await verifyWithFallback(
    state.secret,
    event.payload,
    event.signature,
    state.additionalSecrets
  ).catch(() => false);
  if (!matchesSignature) {
    const error = new Error(
      "[@octokit/webhooks] signature does not match event payload and secret"
    );
    error.event = event;
    error.status = 400;
    return state.eventHandler.receive(error);
  }
  let payload;
  try {
    payload = JSON.parse(event.payload);
  } catch (error) {
    error.message = "Invalid JSON";
    error.status = 400;
    throw new AggregateError([error], error.message);
  }
  return state.eventHandler.receive({
    id: event.id,
    name: event.name,
    payload
  });
}
export {
  verifyAndReceive
};
