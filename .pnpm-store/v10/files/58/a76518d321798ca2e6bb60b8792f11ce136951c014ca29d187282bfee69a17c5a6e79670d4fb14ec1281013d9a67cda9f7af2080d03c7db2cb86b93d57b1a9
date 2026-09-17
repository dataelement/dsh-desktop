import { createLogger } from "../../create-logger.js";
import { createMiddleware } from "../create-middleware.js";
import { handleResponse } from "./handle-response.js";
import { getRequestHeader } from "./get-request-header.js";
import { getPayload } from "./get-payload.js";
function createNodeMiddleware(webhooks, {
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
  createNodeMiddleware
};
