import { createLogger } from "./create-logger.js";
import {
  createEventHandler
} from "./event-handler/index.js";
import { validateEventName } from "./event-handler/validate-event-name.js";
import { sign, verify } from "@octokit/webhooks-methods";
import { verifyAndReceive } from "./verify-and-receive.js";
import { createNodeMiddleware } from "./middleware/node/index.js";
import { createWebMiddleware } from "./middleware/web/index.js";
import { emitterEventNames } from "./generated/webhook-names.js";
class Webhooks {
  sign;
  verify;
  on;
  onAny;
  onError;
  removeListener;
  receive;
  verifyAndReceive;
  constructor(options) {
    if (!options || !options.secret) {
      throw new Error("[@octokit/webhooks] options.secret required");
    }
    const state = {
      eventHandler: createEventHandler(options),
      secret: options.secret,
      additionalSecrets: options.additionalSecrets,
      hooks: {},
      log: createLogger(options.log)
    };
    this.sign = sign.bind(null, options.secret);
    this.verify = verify.bind(null, options.secret);
    this.on = state.eventHandler.on;
    this.onAny = state.eventHandler.onAny;
    this.onError = state.eventHandler.onError;
    this.removeListener = state.eventHandler.removeListener;
    this.receive = state.eventHandler.receive;
    this.verifyAndReceive = verifyAndReceive.bind(null, state);
  }
}
export {
  Webhooks,
  createEventHandler,
  createNodeMiddleware,
  createWebMiddleware,
  emitterEventNames,
  validateEventName
};
