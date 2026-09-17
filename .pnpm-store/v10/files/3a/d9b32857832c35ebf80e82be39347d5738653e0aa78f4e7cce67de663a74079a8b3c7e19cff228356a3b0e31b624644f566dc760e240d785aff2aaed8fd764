import { createLogger } from "../create-logger.js";
import {
  receiverOn as on,
  receiverOnAny as onAny,
  receiverOnError as onError
} from "./on.js";
import { receiverHandle as receive } from "./receive.js";
import { removeListener } from "./remove-listener.js";
function createEventHandler(options) {
  const state = {
    hooks: {},
    log: createLogger(options && options.log)
  };
  if (options && options.transform) {
    state.transform = options.transform;
  }
  return {
    on: on.bind(null, state),
    onAny: onAny.bind(null, state),
    onError: onError.bind(null, state),
    removeListener: removeListener.bind(null, state),
    receive: receive.bind(null, state)
  };
}
export {
  createEventHandler
};
