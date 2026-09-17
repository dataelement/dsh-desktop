// pkg/dist-src/create-logger.js
var createLogger = (logger = {}) => {
  if (typeof logger.debug !== "function") {
    logger.debug = () => {
    };
  }
  if (typeof logger.info !== "function") {
    logger.info = () => {
    };
  }
  if (typeof logger.warn !== "function") {
    logger.warn = console.warn.bind(console);
  }
  if (typeof logger.error !== "function") {
    logger.error = console.error.bind(console);
  }
  return logger;
};

// pkg/dist-src/generated/webhook-names.js
var emitterEventNames = [
  "branch_protection_configuration",
  "branch_protection_configuration.disabled",
  "branch_protection_configuration.enabled",
  "branch_protection_rule",
  "branch_protection_rule.created",
  "branch_protection_rule.deleted",
  "branch_protection_rule.edited",
  "check_run",
  "check_run.completed",
  "check_run.created",
  "check_run.requested_action",
  "check_run.rerequested",
  "check_suite",
  "check_suite.completed",
  "check_suite.requested",
  "check_suite.rerequested",
  "code_scanning_alert",
  "code_scanning_alert.appeared_in_branch",
  "code_scanning_alert.closed_by_user",
  "code_scanning_alert.created",
  "code_scanning_alert.fixed",
  "code_scanning_alert.reopened",
  "code_scanning_alert.reopened_by_user",
  "commit_comment",
  "commit_comment.created",
  "create",
  "custom_property",
  "custom_property.created",
  "custom_property.deleted",
  "custom_property.promote_to_enterprise",
  "custom_property.updated",
  "custom_property_values",
  "custom_property_values.updated",
  "delete",
  "dependabot_alert",
  "dependabot_alert.auto_dismissed",
  "dependabot_alert.auto_reopened",
  "dependabot_alert.created",
  "dependabot_alert.dismissed",
  "dependabot_alert.fixed",
  "dependabot_alert.reintroduced",
  "dependabot_alert.reopened",
  "deploy_key",
  "deploy_key.created",
  "deploy_key.deleted",
  "deployment",
  "deployment.created",
  "deployment_protection_rule",
  "deployment_protection_rule.requested",
  "deployment_review",
  "deployment_review.approved",
  "deployment_review.rejected",
  "deployment_review.requested",
  "deployment_status",
  "deployment_status.created",
  "discussion",
  "discussion.answered",
  "discussion.category_changed",
  "discussion.closed",
  "discussion.created",
  "discussion.deleted",
  "discussion.edited",
  "discussion.labeled",
  "discussion.locked",
  "discussion.pinned",
  "discussion.reopened",
  "discussion.transferred",
  "discussion.unanswered",
  "discussion.unlabeled",
  "discussion.unlocked",
  "discussion.unpinned",
  "discussion_comment",
  "discussion_comment.created",
  "discussion_comment.deleted",
  "discussion_comment.edited",
  "fork",
  "github_app_authorization",
  "github_app_authorization.revoked",
  "gollum",
  "installation",
  "installation.created",
  "installation.deleted",
  "installation.new_permissions_accepted",
  "installation.suspend",
  "installation.unsuspend",
  "installation_repositories",
  "installation_repositories.added",
  "installation_repositories.removed",
  "installation_target",
  "installation_target.renamed",
  "issue_comment",
  "issue_comment.created",
  "issue_comment.deleted",
  "issue_comment.edited",
  "issue_dependencies",
  "issue_dependencies.blocked_by_added",
  "issue_dependencies.blocked_by_removed",
  "issue_dependencies.blocking_added",
  "issue_dependencies.blocking_removed",
  "issues",
  "issues.assigned",
  "issues.closed",
  "issues.deleted",
  "issues.demilestoned",
  "issues.edited",
  "issues.labeled",
  "issues.locked",
  "issues.milestoned",
  "issues.opened",
  "issues.pinned",
  "issues.reopened",
  "issues.transferred",
  "issues.typed",
  "issues.unassigned",
  "issues.unlabeled",
  "issues.unlocked",
  "issues.unpinned",
  "issues.untyped",
  "label",
  "label.created",
  "label.deleted",
  "label.edited",
  "marketplace_purchase",
  "marketplace_purchase.cancelled",
  "marketplace_purchase.changed",
  "marketplace_purchase.pending_change",
  "marketplace_purchase.pending_change_cancelled",
  "marketplace_purchase.purchased",
  "member",
  "member.added",
  "member.edited",
  "member.removed",
  "membership",
  "membership.added",
  "membership.removed",
  "merge_group",
  "merge_group.checks_requested",
  "merge_group.destroyed",
  "meta",
  "meta.deleted",
  "milestone",
  "milestone.closed",
  "milestone.created",
  "milestone.deleted",
  "milestone.edited",
  "milestone.opened",
  "org_block",
  "org_block.blocked",
  "org_block.unblocked",
  "organization",
  "organization.deleted",
  "organization.member_added",
  "organization.member_invited",
  "organization.member_removed",
  "organization.renamed",
  "package",
  "package.published",
  "package.updated",
  "page_build",
  "personal_access_token_request",
  "personal_access_token_request.approved",
  "personal_access_token_request.cancelled",
  "personal_access_token_request.created",
  "personal_access_token_request.denied",
  "ping",
  "project",
  "project.closed",
  "project.created",
  "project.deleted",
  "project.edited",
  "project.reopened",
  "project_card",
  "project_card.converted",
  "project_card.created",
  "project_card.deleted",
  "project_card.edited",
  "project_card.moved",
  "project_column",
  "project_column.created",
  "project_column.deleted",
  "project_column.edited",
  "project_column.moved",
  "projects_v2",
  "projects_v2.closed",
  "projects_v2.created",
  "projects_v2.deleted",
  "projects_v2.edited",
  "projects_v2.reopened",
  "projects_v2_item",
  "projects_v2_item.archived",
  "projects_v2_item.converted",
  "projects_v2_item.created",
  "projects_v2_item.deleted",
  "projects_v2_item.edited",
  "projects_v2_item.reordered",
  "projects_v2_item.restored",
  "projects_v2_status_update",
  "projects_v2_status_update.created",
  "projects_v2_status_update.deleted",
  "projects_v2_status_update.edited",
  "public",
  "pull_request",
  "pull_request.assigned",
  "pull_request.auto_merge_disabled",
  "pull_request.auto_merge_enabled",
  "pull_request.closed",
  "pull_request.converted_to_draft",
  "pull_request.demilestoned",
  "pull_request.dequeued",
  "pull_request.edited",
  "pull_request.enqueued",
  "pull_request.labeled",
  "pull_request.locked",
  "pull_request.milestoned",
  "pull_request.opened",
  "pull_request.ready_for_review",
  "pull_request.reopened",
  "pull_request.review_request_removed",
  "pull_request.review_requested",
  "pull_request.synchronize",
  "pull_request.unassigned",
  "pull_request.unlabeled",
  "pull_request.unlocked",
  "pull_request_review",
  "pull_request_review.dismissed",
  "pull_request_review.edited",
  "pull_request_review.submitted",
  "pull_request_review_comment",
  "pull_request_review_comment.created",
  "pull_request_review_comment.deleted",
  "pull_request_review_comment.edited",
  "pull_request_review_thread",
  "pull_request_review_thread.resolved",
  "pull_request_review_thread.unresolved",
  "push",
  "registry_package",
  "registry_package.published",
  "registry_package.updated",
  "release",
  "release.created",
  "release.deleted",
  "release.edited",
  "release.prereleased",
  "release.published",
  "release.released",
  "release.unpublished",
  "repository",
  "repository.archived",
  "repository.created",
  "repository.deleted",
  "repository.edited",
  "repository.privatized",
  "repository.publicized",
  "repository.renamed",
  "repository.transferred",
  "repository.unarchived",
  "repository_advisory",
  "repository_advisory.published",
  "repository_advisory.reported",
  "repository_dispatch",
  "repository_dispatch.sample.collected",
  "repository_import",
  "repository_ruleset",
  "repository_ruleset.created",
  "repository_ruleset.deleted",
  "repository_ruleset.edited",
  "repository_vulnerability_alert",
  "repository_vulnerability_alert.create",
  "repository_vulnerability_alert.dismiss",
  "repository_vulnerability_alert.reopen",
  "repository_vulnerability_alert.resolve",
  "secret_scanning_alert",
  "secret_scanning_alert.assigned",
  "secret_scanning_alert.created",
  "secret_scanning_alert.publicly_leaked",
  "secret_scanning_alert.reopened",
  "secret_scanning_alert.resolved",
  "secret_scanning_alert.unassigned",
  "secret_scanning_alert.validated",
  "secret_scanning_alert_location",
  "secret_scanning_alert_location.created",
  "secret_scanning_scan",
  "secret_scanning_scan.completed",
  "security_advisory",
  "security_advisory.published",
  "security_advisory.updated",
  "security_advisory.withdrawn",
  "security_and_analysis",
  "sponsorship",
  "sponsorship.cancelled",
  "sponsorship.created",
  "sponsorship.edited",
  "sponsorship.pending_cancellation",
  "sponsorship.pending_tier_change",
  "sponsorship.tier_changed",
  "star",
  "star.created",
  "star.deleted",
  "status",
  "sub_issues",
  "sub_issues.parent_issue_added",
  "sub_issues.parent_issue_removed",
  "sub_issues.sub_issue_added",
  "sub_issues.sub_issue_removed",
  "team",
  "team.added_to_repository",
  "team.created",
  "team.deleted",
  "team.edited",
  "team.removed_from_repository",
  "team_add",
  "watch",
  "watch.started",
  "workflow_dispatch",
  "workflow_job",
  "workflow_job.completed",
  "workflow_job.in_progress",
  "workflow_job.queued",
  "workflow_job.waiting",
  "workflow_run",
  "workflow_run.completed",
  "workflow_run.in_progress",
  "workflow_run.requested"
];

// pkg/dist-src/event-handler/validate-event-name.js
function validateEventName(eventName, options = {}) {
  if (typeof eventName !== "string") {
    throw new TypeError("eventName must be of type string");
  }
  if (eventName === "*") {
    throw new TypeError(
      `Using the "*" event with the regular Webhooks.on() function is not supported. Please use the Webhooks.onAny() method instead`
    );
  }
  if (eventName === "error") {
    throw new TypeError(
      `Using the "error" event with the regular Webhooks.on() function is not supported. Please use the Webhooks.onError() method instead`
    );
  }
  if (options.onUnknownEventName === "ignore") {
    return;
  }
  if (!emitterEventNames.includes(eventName)) {
    if (options.onUnknownEventName !== "warn") {
      throw new TypeError(
        `"${eventName}" is not a known webhook name (https://developer.github.com/v3/activity/events/types/)`
      );
    } else {
      (options.log || console).warn(
        `"${eventName}" is not a known webhook name (https://developer.github.com/v3/activity/events/types/)`
      );
    }
  }
}

// pkg/dist-src/event-handler/on.js
function handleEventHandlers(state, webhookName, handler) {
  if (!state.hooks[webhookName]) {
    state.hooks[webhookName] = [];
  }
  state.hooks[webhookName].push(handler);
}
function receiverOn(state, webhookNameOrNames, handler) {
  if (Array.isArray(webhookNameOrNames)) {
    webhookNameOrNames.forEach(
      (webhookName) => receiverOn(state, webhookName, handler)
    );
    return;
  }
  validateEventName(webhookNameOrNames, {
    onUnknownEventName: "warn",
    log: state.log
  });
  handleEventHandlers(state, webhookNameOrNames, handler);
}
function receiverOnAny(state, handler) {
  handleEventHandlers(state, "*", handler);
}
function receiverOnError(state, handler) {
  handleEventHandlers(state, "error", handler);
}

// pkg/dist-src/event-handler/wrap-error-handler.js
function wrapErrorHandler(handler, error) {
  let returnValue;
  try {
    returnValue = handler(error);
  } catch (error2) {
    console.log('FATAL: Error occurred in "error" event handler');
    console.log(error2);
  }
  if (returnValue && returnValue.catch) {
    returnValue.catch((error2) => {
      console.log('FATAL: Error occurred in "error" event handler');
      console.log(error2);
    });
  }
}

// pkg/dist-src/event-handler/receive.js
function getHooks(state, eventPayloadAction, eventName) {
  const hooks = [state.hooks[eventName], state.hooks["*"]];
  if (eventPayloadAction) {
    hooks.unshift(state.hooks[`${eventName}.${eventPayloadAction}`]);
  }
  return [].concat(...hooks.filter(Boolean));
}
function receiverHandle(state, event) {
  const errorHandlers = state.hooks.error || [];
  if (event instanceof Error) {
    const error = Object.assign(new AggregateError([event], event.message), {
      event
    });
    errorHandlers.forEach((handler) => wrapErrorHandler(handler, error));
    return Promise.reject(error);
  }
  if (!event || !event.name) {
    const error = new Error("Event name not passed");
    throw new AggregateError([error], error.message);
  }
  if (!event.payload) {
    const error = new Error("Event name not passed");
    throw new AggregateError([error], error.message);
  }
  const hooks = getHooks(
    state,
    "action" in event.payload ? event.payload.action : null,
    event.name
  );
  if (hooks.length === 0) {
    return Promise.resolve();
  }
  const errors = [];
  const promises = hooks.map((handler) => {
    let promise = Promise.resolve(event);
    if (state.transform) {
      promise = promise.then(state.transform);
    }
    return promise.then((event2) => {
      return handler(event2);
    }).catch((error) => errors.push(Object.assign(error, { event })));
  });
  return Promise.all(promises).then(() => {
    if (errors.length === 0) {
      return;
    }
    const error = new AggregateError(
      errors,
      errors.map((error2) => error2.message).join("\n")
    );
    Object.assign(error, {
      event
    });
    errorHandlers.forEach((handler) => wrapErrorHandler(handler, error));
    throw error;
  });
}

// pkg/dist-src/event-handler/remove-listener.js
function removeListener(state, webhookNameOrNames, handler) {
  if (Array.isArray(webhookNameOrNames)) {
    webhookNameOrNames.forEach(
      (webhookName) => removeListener(state, webhookName, handler)
    );
    return;
  }
  if (!state.hooks[webhookNameOrNames]) {
    return;
  }
  for (let i = state.hooks[webhookNameOrNames].length - 1; i >= 0; i--) {
    if (state.hooks[webhookNameOrNames][i] === handler) {
      state.hooks[webhookNameOrNames].splice(i, 1);
      return;
    }
  }
}

// pkg/dist-src/event-handler/index.js
function createEventHandler(options) {
  const state = {
    hooks: {},
    log: createLogger(options && options.log)
  };
  if (options && options.transform) {
    state.transform = options.transform;
  }
  return {
    on: receiverOn.bind(null, state),
    onAny: receiverOnAny.bind(null, state),
    onError: receiverOnError.bind(null, state),
    removeListener: removeListener.bind(null, state),
    receive: receiverHandle.bind(null, state)
  };
}

// pkg/dist-src/index.js
import { sign, verify } from "@octokit/webhooks-methods";

// pkg/dist-src/verify-and-receive.js
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

// pkg/dist-src/normalize-trailing-slashes.js
function normalizeTrailingSlashes(path) {
  let i = path.length;
  if (i === 0) {
    return "/";
  }
  while (i > 0) {
    if (path.charCodeAt(--i) !== 47) {
      break;
    }
  }
  if (i === -1) {
    return "/";
  }
  return path.slice(0, i + 1);
}

// pkg/dist-src/middleware/create-middleware.js
var isApplicationJsonRE = /^\s*(application\/json)\s*(?:;|$)/u;
var WEBHOOK_HEADERS = [
  "x-github-event",
  "x-hub-signature-256",
  "x-github-delivery"
];
function createMiddleware(options) {
  const { handleResponse: handleResponse3, getRequestHeader: getRequestHeader3, getPayload: getPayload3 } = options;
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
        return handleResponse3(
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
        return handleResponse3(null);
      } else if (request.method !== "POST") {
        return handleResponse3(
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
      const contentType = getRequestHeader3(request, "content-type");
      if (typeof contentType !== "string" || !isApplicationJsonRE.test(contentType)) {
        return handleResponse3(
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
        return getRequestHeader3(request, header) == void 0;
      }).join(", ");
      if (missingHeaders) {
        return handleResponse3(
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
      const eventName = getRequestHeader3(
        request,
        "x-github-event"
      );
      const signature = getRequestHeader3(request, "x-hub-signature-256");
      const id = getRequestHeader3(request, "x-github-delivery");
      options2.log.debug(`${eventName} event received (id: ${id})`);
      let didTimeout = false;
      let timeout;
      const timeoutPromise = new Promise((resolve) => {
        timeout = setTimeout(() => {
          didTimeout = true;
          resolve(
            handleResponse3(
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
          const payload = await getPayload3(request);
          await webhooks.verifyAndReceive({
            id,
            name: eventName,
            payload,
            signature
          });
          clearTimeout(timeout);
          if (didTimeout) return handleResponse3(null);
          return handleResponse3(
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
          if (didTimeout) return handleResponse3(null);
          const err = Array.from(error.errors)[0];
          const errorMessage = err.message ? `${err.name}: ${err.message}` : "Error: An Unspecified error occurred";
          const statusCode = typeof err.status !== "undefined" ? err.status : 500;
          options2.log.error(error);
          return handleResponse3(
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

// pkg/dist-src/middleware/node/handle-response.js
function handleResponse(body, status = 200, headers = {}, response) {
  if (body === null) {
    return false;
  }
  headers["content-length"] = body.length.toString();
  response.writeHead(status, headers).end(body);
  return true;
}

// pkg/dist-src/middleware/node/get-request-header.js
function getRequestHeader(request, key) {
  return request.headers[key];
}

// pkg/dist-src/concat-uint8array.js
function concatUint8Array(data) {
  if (data.length === 0) {
    return new Uint8Array(0);
  }
  let totalLength = 0;
  for (let i = 0; i < data.length; i++) {
    totalLength += data[i].length;
  }
  if (totalLength === 0) {
    return new Uint8Array(0);
  }
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (let i = 0; i < data.length; i++) {
    result.set(data[i], offset);
    offset += data[i].length;
  }
  return result;
}

// pkg/dist-src/middleware/node/get-payload.js
var textDecoder = new TextDecoder("utf-8", { fatal: false });
var decode = textDecoder.decode.bind(textDecoder);
async function getPayload(request) {
  if (typeof request.body === "object" && "rawBody" in request && request.rawBody instanceof Uint8Array) {
    return decode(request.rawBody);
  } else if (typeof request.body === "string") {
    return request.body;
  }
  const payload = await getPayloadFromRequestStream(request);
  return decode(payload);
}
function getPayloadFromRequestStream(request) {
  return new Promise((resolve, reject) => {
    let data = [];
    request.on(
      "error",
      (error) => reject(new AggregateError([error], error.message))
    );
    request.on("data", data.push.bind(data));
    request.on("end", () => {
      const result = concatUint8Array(data);
      queueMicrotask(() => resolve(result));
    });
  });
}

// pkg/dist-src/middleware/node/index.js
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

// pkg/dist-src/middleware/web/get-payload.js
function getPayload2(request) {
  return request.text();
}

// pkg/dist-src/middleware/web/get-request-header.js
function getRequestHeader2(request, key) {
  return request.headers.get(key);
}

// pkg/dist-src/middleware/web/handle-response.js
function handleResponse2(body, status = 200, headers = {}) {
  if (body !== null) {
    headers["content-length"] = body.length.toString();
  }
  return new Response(body, {
    status,
    headers
  });
}

// pkg/dist-src/middleware/web/index.js
function createWebMiddleware(webhooks, {
  path = "/api/github/webhooks",
  log = createLogger(),
  timeout = 9e3
} = {}) {
  return createMiddleware({
    handleResponse: handleResponse2,
    getRequestHeader: getRequestHeader2,
    getPayload: getPayload2
  })(webhooks, {
    path,
    log,
    timeout
  });
}

// pkg/dist-src/index.js
var Webhooks = class {
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
};
export {
  Webhooks,
  createEventHandler,
  createNodeMiddleware,
  createWebMiddleware,
  emitterEventNames,
  validateEventName
};
