import { createLogger } from "../../create-logger.js";
import { createMiddleware } from "../create-middleware.js";
import { getPayload } from "./get-payload.js";
import { getRequestHeader } from "./get-request-header.js";
import { handleResponse } from "./handle-response.js";
function createWebMiddleware(webhooks, {
  path = "/api/github/webhooks",
  log = createLogger(),
  timeout = 9e3
} = {}) {
  return createMiddleware({
    handleResponse,
    getRequestHeader,
    getPayload
  })(webhooks, {
    path,
    log,
    timeout
  });
}
export {
  createWebMiddleware
};
