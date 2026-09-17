import { normalizeTrailingSlashes } from "../normalize-trailing-slashes.js";
const isApplicationJsonRE = /^\s*(application\/json)\s*(?:;|$)/u;
const WEBHOOK_HEADERS = [
  "x-github-event",
  "x-hub-signature-256",
  "x-github-delivery"
];
function createMiddleware(options) {
  const { handleResponse, getRequestHeader, getPayload } = options;
  return function middleware(webhooks, options2) {
    const middlewarePath = normalizeTrailingSlashes(options2.path);
    return async function octokitWebhooksMiddleware(request, response, next) {
      let pathname;
      try {
        pathname = new URL(
          normalizeTrailingSlashes(request.url),
          "http://localhost"
        ).pathname;
      } catch (error) {
        return handleResponse(
          JSON.stringify({
            error: `Request URL could not be parsed: ${request.url}`
          }),
          422,
          {
            "content-type": "application/json"
          },
          response
        );
      }
      if (pathname !== middlewarePath) {
        next?.();
        return handleResponse(null);
      } else if (request.method !== "POST") {
        return handleResponse(
          JSON.stringify({
            error: `Unknown route: ${request.method} ${pathname}`
          }),
          404,
          {
            "content-type": "application/json"
          },
          response
        );
      }
      const contentType = getRequestHeader(request, "content-type");
      if (typeof contentType !== "string" || !isApplicationJsonRE.test(contentType)) {
        return handleResponse(
          JSON.stringify({
            error: `Unsupported "Content-Type" header value. Must be "application/json"`
          }),
          415,
          {
            "content-type": "application/json",
            accept: "application/json"
          },
          response
        );
      }
      const missingHeaders = WEBHOOK_HEADERS.filter((header) => {
        return getRequestHeader(request, header) == void 0;
      }).join(", ");
      if (missingHeaders) {
        return handleResponse(
          JSON.stringify({
            error: `Required headers missing: ${missingHeaders}`
          }),
          400,
          {
            "content-type": "application/json",
            accept: "application/json"
          },
          response
        );
      }
      const eventName = getRequestHeader(
        request,
        "x-github-event"
      );
      const signature = getRequestHeader(request, "x-hub-signature-256");
      const id = getRequestHeader(request, "x-github-delivery");
      options2.log.debug(`${eventName} event received (id: ${id})`);
      let didTimeout = false;
      let timeout;
      const timeoutPromise = new Promise((resolve) => {
        timeout = setTimeout(() => {
          didTimeout = true;
          resolve(
            handleResponse(
              "still processing\n",
              202,
              {
                "Content-Type": "text/plain",
                accept: "application/json"
              },
              response
            )
          );
        }, options2.timeout);
      });
      const processWebhook = async () => {
        try {
          const payload = await getPayload(request);
          await webhooks.verifyAndReceive({
            id,
            name: eventName,
            payload,
            signature
          });
          clearTimeout(timeout);
          if (didTimeout) return handleResponse(null);
          return handleResponse(
            "ok\n",
            200,
            {
              "content-type": "text/plain",
              accept: "application/json"
            },
            response
          );
        } catch (error) {
          clearTimeout(timeout);
          if (didTimeout) return handleResponse(null);
          const err = Array.from(error.errors)[0];
          const errorMessage = err.message ? `${err.name}: ${err.message}` : "Error: An Unspecified error occurred";
          const statusCode = typeof err.status !== "undefined" ? err.status : 500;
          options2.log.error(error);
          return handleResponse(
            JSON.stringify({
              error: errorMessage
            }),
            statusCode,
            {
              "content-type": "application/json",
              accept: "application/json"
            },
            response
          );
        }
      };
      return await Promise.race([timeoutPromise, processWebhook()]);
    };
  };
}
export {
  createMiddleware
};
