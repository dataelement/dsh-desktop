# @octokit/webhooks

> GitHub webhook events toolset for Node.js

[![@latest](https://img.shields.io/npm/v/@octokit/webhooks.svg)](https://www.npmjs.com/package/@octokit/webhooks)
[![Test](https://github.com/octokit/webhooks.js/workflows/Test/badge.svg)](https://github.com/octokit/webhooks.js/actions?query=workflow)

<!-- toc -->

- [Usage](#usage)
- [Local development](#local-development)
- [API](#api)
  - [Constructor](#constructor)
  - [webhooks.sign()](#webhookssign)
  - [webhooks.verify()](#webhooksverify)
  - [webhooks.verifyAndReceive()](#webhooksverifyandreceive)
  - [webhooks.receive()](#webhooksreceive)
  - [webhooks.on()](#webhookson)
  - [webhooks.onAny()](#webhooksonany)
  - [webhooks.onError()](#webhooksonerror)
  - [webhooks.removeListener()](#webhooksremovelistener)
  - [createNodeMiddleware()](#createnodemiddleware)
  - [Webhook events](#webhook-events)
  - [emitterEventNames](#emittereventnames)
  - [validateEventName](#validateeventname)
- [TypeScript](#typescript)
  - [`EmitterWebhookEventName`](#emitterwebhookeventname)
  - [`EmitterWebhookEvent`](#emitterwebhookevent)
- [License](#license)

<!-- tocstop -->

`@octokit/webhooks` helps to handle webhook events received from GitHub.

[GitHub webhooks](https://docs.github.com/webhooks/) can be registered in multiple ways

1. In repository or organization settings on [github.com](https://github.com/).
2. Using the REST API for [repositories](https://docs.github.com/rest/reference/repos#webhooks) or [organizations](https://docs.github.com/rest/reference/orgs#webhooks/)
3. By [creating a GitHub App](https://docs.github.com/developers/apps/creating-a-github-app).

Note that while setting a secret is optional on GitHub, it is required to be set in order to use `@octokit/webhooks`. Content Type must be set to `application/json`, `application/x-www-form-urlencoded` is not supported.

## Usage

```js
// install with: npm install @octokit/webhooks
import { Webhooks, createNodeMiddleware } from "@octokit/webhooks";
import { createServer } from "node:http";
const webhooks = new Webhooks({
  secret: "mysecret",
});

webhooks.onAny(({ id, name, payload }) => {
  console.log(name, "event received");
});

createServer(createNodeMiddleware(webhooks)).listen(3000);
// can now receive webhook events at /api/github/webhooks
```

## Local development

You can receive webhooks on your local machine or even browser using [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) and [smee.io](https://smee.io/).

Go to [smee.io](https://smee.io/) and <kbd>Start a new channel</kbd>. Then copy the "Webhook Proxy URL" and

1. enter it in the GitHub App’s "Webhook URL" input
2. pass it to the [EventSource](https://github.com/EventSource/eventsource) constructor, see below

```js
const webhookProxyUrl = "https://smee.io/IrqK0nopGAOc847"; // replace with your own Webhook Proxy URL
const source = new EventSource(webhookProxyUrl);
source.onmessage = (event) => {
  const webhookEvent = JSON.parse(event.data);
  webhooks
    .verifyAndReceive({
      id: webhookEvent["x-request-id"],
      name: webhookEvent["x-github-event"],
      signature: webhookEvent["x-hub-signature"],
      payload: JSON.stringify(webhookEvent.body),
    })
    .catch(console.error);
};
```

`EventSource` is a native browser API and can be polyfilled for browsers that don’t support it. In node, you can use the [`eventsource`](https://github.com/EventSource/eventsource) package: install with `npm install eventsource`, then `import EventSource from "eventsource";)`

## API

1. [Constructor](#constructor)
1. [webhooks.sign()](#webhookssign)
1. [webhooks.verify()](#webhooksverify)
1. [webhooks.verifyAndReceive()](#webhooksverifyandreceive)
1. [webhooks.receive()](#webhooksreceive)
1. [webhooks.on()](#webhookson)
1. [webhooks.onAny()](#webhooksonany)
1. [webhooks.onError()](#webhooksonerror)
1. [webhooks.removeListener()](#webhooksremovelistener)
1. [createNodeMiddleware()](#createnodemiddleware)
1. [createWebMiddleware()](#createwebmiddleware)
1. [Webhook events](#webhook-events)
1. [emitterEventNames](#emittereventnames)
1. [validateEventName](#validateeventname)

### Constructor

```js
new Webhooks({ secret /*, transform */ });
```

<table width="100%">
  <tbody valign="top">
    <tr>
      <td>
        <code>secret</code>
        <em>(String)</em>
      </td>
      <td>
        <strong>Required.</strong>
        Secret as configured in GitHub Settings.
      </td>
    </tr>
    <tr>
      <td>
        <code>transform</code>
        <em>(Function)</em>
      </td>
      <td>
        Only relevant for <a href="#webhookson"><code>webhooks.on</code></a>.
        Transform emitted event before calling handlers. Can be asynchronous.
      </td>
    </tr>
    <tr>
    <td>
      <code>log</code>
      <em>
        object
      </em>
    </td>
    <td>

Used for internal logging. Defaults to [`console`](https://developer.mozilla.org/en-US/docs/Web/API/console) with `debug` and `info` doing nothing.

</td>
    </tr>
  </tbody>
</table>

Returns the `webhooks` API.

### webhooks.sign()

```js
webhooks.sign(eventPayload);
```

<table width="100%">
  <tbody valign="top">
    <tr>
      <td>
        <code>eventPayload</code>
        <em>
          (String)
        </em>
      </td>
      <td>
        <strong>Required.</strong>
        Webhook request payload as received from GitHub
      </td>
    </tr>
  </tbody>
</table>

Returns a `signature` string. Throws error if `eventPayload` is not passed.

The `sign` method can be imported as static method from [`@octokit/webhooks-methods`](https://github.com/octokit/webhooks-methods.js/#readme).

### webhooks.verify()

```js
webhooks.verify(eventPayload, signature);
```

<table width="100%">
  <tbody valign="top">
    <tr>
      <td>
        <code>eventPayload</code>
        <em>
          (String)
        </em>
      </td>
      <td>
        <strong>Required.</strong>
        Webhook event request payload as received from GitHub.
      </td>
    </tr>
    <tr>
      <td>
        <code>signature</code>
        <em>
          (String)
        </em>
      </td>
      <td>
        <strong>Required.</strong>
        Signature string as calculated by <code><a href="#webhookssign">webhooks.sign()</a></code>.
      </td>
    </tr>
  </tbody>
</table>

Returns `true` or `false`. Throws error if `eventPayload` or `signature` not passed.

The `verify` method can be imported as static method from [`@octokit/webhooks-methods`](https://github.com/octokit/webhooks-methods.js/#readme).

### webhooks.verifyAndReceive()

```js
webhooks.verifyAndReceive({ id, name, payload, signature });
```

<table width="100%">
  <tbody valign="top">
    <tr>
      <td>
        <code>id</code>
        <em>
          String
        </em>
      </td>
      <td>
        Unique webhook event request id
      </td>
    </tr>
    <tr>
      <td>
        <code>name</code>
        <em>
          String
        </em>
      </td>
      <td>
        <strong>Required.</strong>
        Name of the event. (Event names are set as <a href="https://docs.github.com/developers/webhooks-and-events/webhook-events-and-payloads#delivery-headers"><code>X-GitHub-Event</code> header</a>
        in the webhook event request.)
      </td>
    </tr>
    <tr>
      <td>
        <code>payload</code>
        <em>
          String
        </em>
      </td>
      <td>
        <strong>Required.</strong>
        Webhook event request payload as received from GitHub.
      </td>
    </tr>
    <tr>
      <td>
        <code>signature</code>
        <em>
          (String)
        </em>
      </td>
      <td>
        <strong>Required.</strong>
        Signature string as calculated by <code><a href="#webhookssign">webhooks.sign()</a></code>.
      </td>
    </tr>
  </tbody>
</table>

Returns a promise.

Verifies event using [webhooks.verify()](#webhooksverify), then handles the event using [webhooks.receive()](#webhooksreceive).

Additionally, if verification fails, rejects the returned promise and emits an `error` event.

Example

```js
import { Webhooks } from "@octokit/webhooks";
const webhooks = new Webhooks({
  secret: "mysecret",
});
eventHandler.on("error", handleSignatureVerificationError);

// put this inside your webhooks route handler
eventHandler
  .verifyAndReceive({
    id: request.headers["x-github-delivery"],
    name: request.headers["x-github-event"],
    payload: request.body,
    signature: request.headers["x-hub-signature-256"],
  })
  .catch(handleErrorsFromHooks);
```

### webhooks.receive()

```js
webhooks.receive({ id, name, payload });
```

<table width="100%">
  <tbody valign="top">
    <tr>
      <td>
        <code>id</code>
        <em>
          String
        </em>
      </td>
      <td>
        Unique webhook event request id
      </td>
    </tr>
    <tr>
      <td>
        <code>name</code>
        <em>
          String
        </em>
      </td>
      <td>
        <strong>Required.</strong>
        Name of the event. (Event names are set as <a href="https://docs.github.com/developers/webhooks-and-events/webhook-events-and-payloads#delivery-headers"><code>X-GitHub-Event</code> header</a>
        in the webhook event request.)
      </td>
    </tr>
    <tr>
      <td>
        <code>payload</code>
        <em>
          Object
        </em>
      </td>
      <td>
        <strong>Required.</strong>
        Webhook event request payload as received from GitHub.
      </td>
    </tr>
  </tbody>
</table>

Returns a promise. Runs all handlers set with [`webhooks.on()`](#webhookson) in parallel and waits for them to finish. If one of the handlers rejects or throws an error, then `webhooks.receive()` rejects. The returned error has an `.errors` property which holds an array of all errors caught from the handlers. If no errors occur, `webhooks.receive()` resolves without passing any value.

The `.receive()` method belongs to the `event-handler` module which can be used [standalone](src/event-handler/).

### webhooks.on()

```js
webhooks.on(eventName, handler);
webhooks.on(eventNames, handler);
```

<table width="100%">
  <tbody valign="top">
    <tr>
      <td>
        <code>eventName</code>
        <em>
          String
        </em>
      </td>
      <td>
        <strong>Required.</strong>
        Name of the event. One of <a href="#webhook-events">GitHub's supported event names</a>, or (if the event has an action property) the name of an event followed by its action in the form of <code>&lt;event>.&lt;action></code>.
      </td>
    </tr>
    <tr>
      <td>
        <code>eventNames</code>
        <em>
          Array
        </em>
      </td>
      <td>
        <strong>Required.</strong>
        Array of event names.
      </td>
    </tr>
    <tr>
      <td>
        <code>handler</code>
        <em>
          Function
        </em>
      </td>
      <td>
        <strong>Required.</strong>
        Method to be run each time the event with the passed name is received.
        the <code>handler</code> function can be an async function, throw an error or
        return a Promise. The handler is called with an event object: <code>{id, name, payload}</code>.
      </td>
    </tr>
  </tbody>
</table>

The `.on()` method belongs to the `event-handler` module which can be used [standalone](src/event-handler/).

### webhooks.onAny()

```js
webhooks.onAny(handler);
```

<table width="100%">
  <tbody valign="top">
    <tr>
      <td>
        <code>handler</code>
        <em>
          Function
        </em>
      </td>
      <td>
        <strong>Required.</strong>
        Method to be run each time any event is received.
        the <code>handler</code> function can be an async function, throw an error or
        return a Promise. The handler is called with an event object: <code>{id, name, payload}</code>.
      </td>
    </tr>
  </tbody>
</table>

The `.onAny()` method belongs to the `event-handler` module which can be used [standalone](src/event-handler/).

### webhooks.onError()

```js
webhooks.onError(handler);
```

If a webhook event handler throws an error or returns a promise that rejects, an error event is triggered. You can use this handler for logging or reporting events. The passed error object has a .event property which has all information on the event.

Asynchronous `error` event handler are not blocking the `.receive()` method from completing.

<table width="100%">
  <tbody valign="top">
    <tr>
      <td>
        <code>handler</code>
        <em>
          Function
        </em>
      </td>
      <td>
        <strong>Required.</strong>
        Method to be run each time a webhook event handler throws an error or returns a promise that rejects.
        The <code>handler</code> function can be an async function,
        return a Promise. The handler is called with an error object that has a .event property which has all the information on the event: <code>{id, name, payload}</code>.
      </td>
    </tr>
  </tbody>
</table>

The `.onError()` method belongs to the `event-handler` module which can be used [standalone](src/event-handler/).

### webhooks.removeListener()

```js
webhooks.removeListener(eventName, handler);
webhooks.removeListener(eventNames, handler);
```

<table width="100%">
  <tbody valign="top">
    <tr>
      <td>
        <code>eventName</code>
        <em>
          String
        </em>
      </td>
      <td>
        <strong>Required.</strong>
        Name of the event. One of <a href="#webhook-events">GitHub's supported event names</a>, or (if the event has an action property) the name of an event followed by its action in the form of <code>&lt;event>.&lt;action></code>, or '*' for the <code>onAny()</code> method or 'error' for the <code>onError()</code> method.
      </td>
    </tr>
    <tr>
      <td>
        <code>eventNames</code>
        <em>
          Array
        </em>
      </td>
      <td>
        <strong>Required.</strong>
        Array of event names.
      </td>
    </tr>
    <tr>
      <td>
        <code>handler</code>
        <em>
          Function
        </em>
      </td>
      <td>
        <strong>Required.</strong>
        Method which was previously passed to <code><a href="webhookson">webhooks.on()</a></code>. If the same handler was registered multiple times for the same event, only the most recent handler gets removed.
      </td>
    </tr>
  </tbody>
</table>

The `.removeListener()` method belongs to the `event-handler` module which can be used [standalone](src/event-handler/).

### createNodeMiddleware()

```js
import { createServer } from "node:http";
import { Webhooks, createNodeMiddleware } from "@octokit/webhooks";

const webhooks = new Webhooks({
  secret: "mysecret",
});

const middleware = createNodeMiddleware(webhooks, { path: "/webhooks" });
createServer(async (req, res) => {
  // `middleware` returns `false` when `req` is unhandled (beyond `/webhooks`)
  if (await middleware(req, res)) return;
  res.writeHead(404);
  res.end();
}).listen(3000);
// can now receive user authorization callbacks at POST /webhooks
```

The middleware returned from `createNodeMiddleware` can also serve as an
`Express.js` middleware directly.

<table width="100%">
  <tbody valign="top">
    <tr>
      <td>
        <code>webhooks</code>
        <em>
          Webhooks instance
        </em>
      </td>
      <td>
        <strong>Required.</strong>
      </td>
    </tr>
    <tr>
      <td>
        <code>path</code>
        <em>
          string
        </em>
      </td>
      <td>
        Custom path to match requests against. Defaults to <code>/api/github/webhooks</code>.
      </td>
    </tr>
    <tr>
      <td>
        <code>log</code>
        <em>
          object
        </em>
      </td>
      <td>

Used for internal logging. Defaults to [`console`](https://developer.mozilla.org/en-US/docs/Web/API/console) with `debug` and `info` doing nothing.

</td>
    </tr>
  <tbody>
</table>

### createWebMiddleware()

```js
import { Webhooks, createWebMiddleware } from "@octokit/webhooks";

const webhooks = new Webhooks({
  secret: "mysecret",
});

const middleware = createWebMiddleware(webhooks, { path: "/webhooks" });

// Example usage in Deno
Deno.serve({ port: 3000 }, middleware);
```

The middleware returned from `createWebMiddleware` can also be used in serverless environments like AWS Lambda, Cloudflare Workers, and Vercel.

<table width="100%">
  <tbody valign="top">
    <tr>
      <td>
        <code>webhooks</code>
        <em>
          Webhooks instance
        </em>
      </td>
      <td>
        <strong>Required.</strong>
      </td>
    </tr>
    <tr>
      <td>
        <code>path</code>
        <em>
          string
        </em>
      </td>
      <td>
        Custom path to match requests against. Defaults to <code>/api/github/webhooks</code>.
      </td>
    </tr>
    <tr>
      <td>
        <code>log</code>
        <em>
          object
        </em>
      </td>
      <td>

Used for internal logging. Defaults to [`console`](https://developer.mozilla.org/en-US/docs/Web/API/console) with `debug` and `info` doing nothing.

</td>
    </tr>
  <tbody>
</table>

### Webhook events

See the full list of [event types with example payloads](https://docs.github.com/developers/webhooks-and-events/webhook-events-and-payloads/).

If there are actions for a webhook, events are emitted for both, the webhook name as well as a combination of the webhook name and the action, e.g. `installation` and `installation.created`.

<!-- autogenerated via scripts/generate-types.ts -->

| Event                                                                                                                                | Actions                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`branch_protection_configuration`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#branch_protection_configuration) | `disabled`<br>`enabled`                                                                                                                                                                                                                                                                                                                                            |
| [`branch_protection_rule`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#branch_protection_rule)                   | `created`<br>`deleted`<br>`edited`                                                                                                                                                                                                                                                                                                                                 |
| [`check_run`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#check_run)                                             | `completed`<br>`created`<br>`requested_action`<br>`rerequested`                                                                                                                                                                                                                                                                                                    |
| [`check_suite`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#check_suite)                                         | `completed`<br>`requested`<br>`rerequested`                                                                                                                                                                                                                                                                                                                        |
| [`code_scanning_alert`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#code_scanning_alert)                         | `appeared_in_branch`<br>`closed_by_user`<br>`created`<br>`fixed`<br>`reopened`<br>`reopened_by_user`                                                                                                                                                                                                                                                               |
| [`commit_comment`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#commit_comment)                                   | `created`                                                                                                                                                                                                                                                                                                                                                          |
| [`create`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#create)                                                   |                                                                                                                                                                                                                                                                                                                                                                    |
| [`custom_property`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#custom_property)                                 | `created`<br>`deleted`<br>`promote_to_enterprise`<br>`updated`                                                                                                                                                                                                                                                                                                     |
| [`custom_property_values`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#custom_property_values)                   | `updated`                                                                                                                                                                                                                                                                                                                                                          |
| [`delete`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#delete)                                                   |                                                                                                                                                                                                                                                                                                                                                                    |
| [`dependabot_alert`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#dependabot_alert)                               | `auto_dismissed`<br>`auto_reopened`<br>`created`<br>`dismissed`<br>`fixed`<br>`reintroduced`<br>`reopened`                                                                                                                                                                                                                                                         |
| [`deploy_key`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#deploy_key)                                           | `created`<br>`deleted`                                                                                                                                                                                                                                                                                                                                             |
| [`deployment`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#deployment)                                           | `created`                                                                                                                                                                                                                                                                                                                                                          |
| [`deployment_protection_rule`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#deployment_protection_rule)           | `requested`                                                                                                                                                                                                                                                                                                                                                        |
| [`deployment_review`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#deployment_review)                             | `approved`<br>`rejected`<br>`requested`                                                                                                                                                                                                                                                                                                                            |
| [`deployment_status`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#deployment_status)                             | `created`                                                                                                                                                                                                                                                                                                                                                          |
| [`discussion`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#discussion)                                           | `answered`<br>`category_changed`<br>`closed`<br>`created`<br>`deleted`<br>`edited`<br>`labeled`<br>`locked`<br>`pinned`<br>`reopened`<br>`transferred`<br>`unanswered`<br>`unlabeled`<br>`unlocked`<br>`unpinned`                                                                                                                                                  |
| [`discussion_comment`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#discussion_comment)                           | `created`<br>`deleted`<br>`edited`                                                                                                                                                                                                                                                                                                                                 |
| [`fork`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#fork)                                                       |                                                                                                                                                                                                                                                                                                                                                                    |
| [`github_app_authorization`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#github_app_authorization)               | `revoked`                                                                                                                                                                                                                                                                                                                                                          |
| [`gollum`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#gollum)                                                   |                                                                                                                                                                                                                                                                                                                                                                    |
| [`installation`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#installation)                                       | `created`<br>`deleted`<br>`new_permissions_accepted`<br>`suspend`<br>`unsuspend`                                                                                                                                                                                                                                                                                   |
| [`installation_repositories`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#installation_repositories)             | `added`<br>`removed`                                                                                                                                                                                                                                                                                                                                               |
| [`installation_target`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#installation_target)                         | `renamed`                                                                                                                                                                                                                                                                                                                                                          |
| [`issue_comment`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#issue_comment)                                     | `created`<br>`deleted`<br>`edited`                                                                                                                                                                                                                                                                                                                                 |
| [`issue_dependencies`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#issue_dependencies)                           | `blocked_by_added`<br>`blocked_by_removed`<br>`blocking_added`<br>`blocking_removed`                                                                                                                                                                                                                                                                               |
| [`issues`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#issues)                                                   | `assigned`<br>`closed`<br>`deleted`<br>`demilestoned`<br>`edited`<br>`labeled`<br>`locked`<br>`milestoned`<br>`opened`<br>`pinned`<br>`reopened`<br>`transferred`<br>`typed`<br>`unassigned`<br>`unlabeled`<br>`unlocked`<br>`unpinned`<br>`untyped`                                                                                                               |
| [`label`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#label)                                                     | `created`<br>`deleted`<br>`edited`                                                                                                                                                                                                                                                                                                                                 |
| [`marketplace_purchase`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#marketplace_purchase)                       | `cancelled`<br>`changed`<br>`pending_change`<br>`pending_change_cancelled`<br>`purchased`                                                                                                                                                                                                                                                                          |
| [`member`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#member)                                                   | `added`<br>`edited`<br>`removed`                                                                                                                                                                                                                                                                                                                                   |
| [`membership`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#membership)                                           | `added`<br>`removed`                                                                                                                                                                                                                                                                                                                                               |
| [`merge_group`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#merge_group)                                         | `checks_requested`<br>`destroyed`                                                                                                                                                                                                                                                                                                                                  |
| [`meta`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#meta)                                                       | `deleted`                                                                                                                                                                                                                                                                                                                                                          |
| [`milestone`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#milestone)                                             | `closed`<br>`created`<br>`deleted`<br>`edited`<br>`opened`                                                                                                                                                                                                                                                                                                         |
| [`org_block`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#org_block)                                             | `blocked`<br>`unblocked`                                                                                                                                                                                                                                                                                                                                           |
| [`organization`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#organization)                                       | `deleted`<br>`member_added`<br>`member_invited`<br>`member_removed`<br>`renamed`                                                                                                                                                                                                                                                                                   |
| [`package`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#package)                                                 | `published`<br>`updated`                                                                                                                                                                                                                                                                                                                                           |
| [`page_build`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#page_build)                                           |                                                                                                                                                                                                                                                                                                                                                                    |
| [`personal_access_token_request`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#personal_access_token_request)     | `approved`<br>`cancelled`<br>`created`<br>`denied`                                                                                                                                                                                                                                                                                                                 |
| [`ping`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#ping)                                                       |                                                                                                                                                                                                                                                                                                                                                                    |
| [`project`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#project)                                                 | `closed`<br>`created`<br>`deleted`<br>`edited`<br>`reopened`                                                                                                                                                                                                                                                                                                       |
| [`project_card`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#project_card)                                       | `converted`<br>`created`<br>`deleted`<br>`edited`<br>`moved`                                                                                                                                                                                                                                                                                                       |
| [`project_column`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#project_column)                                   | `created`<br>`deleted`<br>`edited`<br>`moved`                                                                                                                                                                                                                                                                                                                      |
| [`projects_v2`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#projects_v2)                                         | `closed`<br>`created`<br>`deleted`<br>`edited`<br>`reopened`                                                                                                                                                                                                                                                                                                       |
| [`projects_v2_item`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#projects_v2_item)                               | `archived`<br>`converted`<br>`created`<br>`deleted`<br>`edited`<br>`reordered`<br>`restored`                                                                                                                                                                                                                                                                       |
| [`projects_v2_status_update`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#projects_v2_status_update)             | `created`<br>`deleted`<br>`edited`                                                                                                                                                                                                                                                                                                                                 |
| [`public`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#public)                                                   |                                                                                                                                                                                                                                                                                                                                                                    |
| [`pull_request`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#pull_request)                                       | `assigned`<br>`auto_merge_disabled`<br>`auto_merge_enabled`<br>`closed`<br>`converted_to_draft`<br>`demilestoned`<br>`dequeued`<br>`edited`<br>`enqueued`<br>`labeled`<br>`locked`<br>`milestoned`<br>`opened`<br>`ready_for_review`<br>`reopened`<br>`review_request_removed`<br>`review_requested`<br>`synchronize`<br>`unassigned`<br>`unlabeled`<br>`unlocked` |
| [`pull_request_review`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#pull_request_review)                         | `dismissed`<br>`edited`<br>`submitted`                                                                                                                                                                                                                                                                                                                             |
| [`pull_request_review_comment`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#pull_request_review_comment)         | `created`<br>`deleted`<br>`edited`                                                                                                                                                                                                                                                                                                                                 |
| [`pull_request_review_thread`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#pull_request_review_thread)           | `resolved`<br>`unresolved`                                                                                                                                                                                                                                                                                                                                         |
| [`push`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#push)                                                       |                                                                                                                                                                                                                                                                                                                                                                    |
| [`registry_package`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#registry_package)                               | `published`<br>`updated`                                                                                                                                                                                                                                                                                                                                           |
| [`release`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#release)                                                 | `created`<br>`deleted`<br>`edited`<br>`prereleased`<br>`published`<br>`released`<br>`unpublished`                                                                                                                                                                                                                                                                  |
| [`repository`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#repository)                                           | `archived`<br>`created`<br>`deleted`<br>`edited`<br>`privatized`<br>`publicized`<br>`renamed`<br>`transferred`<br>`unarchived`                                                                                                                                                                                                                                     |
| [`repository_advisory`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#repository_advisory)                         | `published`<br>`reported`                                                                                                                                                                                                                                                                                                                                          |
| [`repository_dispatch`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#repository_dispatch)                         | `sample`                                                                                                                                                                                                                                                                                                                                                           |
| [`repository_import`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#repository_import)                             |                                                                                                                                                                                                                                                                                                                                                                    |
| [`repository_ruleset`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#repository_ruleset)                           | `created`<br>`deleted`<br>`edited`                                                                                                                                                                                                                                                                                                                                 |
| [`repository_vulnerability_alert`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#repository_vulnerability_alert)   | `create`<br>`dismiss`<br>`reopen`<br>`resolve`                                                                                                                                                                                                                                                                                                                     |
| [`secret_scanning_alert`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#secret_scanning_alert)                     | `assigned`<br>`created`<br>`publicly_leaked`<br>`reopened`<br>`resolved`<br>`unassigned`<br>`validated`                                                                                                                                                                                                                                                            |
| [`secret_scanning_alert_location`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#secret_scanning_alert_location)   | `created`                                                                                                                                                                                                                                                                                                                                                          |
| [`secret_scanning_scan`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#secret_scanning_scan)                       | `completed`                                                                                                                                                                                                                                                                                                                                                        |
| [`security_advisory`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#security_advisory)                             | `published`<br>`updated`<br>`withdrawn`                                                                                                                                                                                                                                                                                                                            |
| [`security_and_analysis`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#security_and_analysis)                     |                                                                                                                                                                                                                                                                                                                                                                    |
| [`sponsorship`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#sponsorship)                                         | `cancelled`<br>`created`<br>`edited`<br>`pending_cancellation`<br>`pending_tier_change`<br>`tier_changed`                                                                                                                                                                                                                                                          |
| [`star`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#star)                                                       | `created`<br>`deleted`                                                                                                                                                                                                                                                                                                                                             |
| [`status`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#status)                                                   |                                                                                                                                                                                                                                                                                                                                                                    |
| [`sub_issues`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#sub_issues)                                           | `parent_issue_added`<br>`parent_issue_removed`<br>`sub_issue_added`<br>`sub_issue_removed`                                                                                                                                                                                                                                                                         |
| [`team`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#team)                                                       | `added_to_repository`<br>`created`<br>`deleted`<br>`edited`<br>`removed_from_repository`                                                                                                                                                                                                                                                                           |
| [`team_add`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#team_add)                                               |                                                                                                                                                                                                                                                                                                                                                                    |
| [`watch`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#watch)                                                     | `started`                                                                                                                                                                                                                                                                                                                                                          |
| [`workflow_dispatch`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#workflow_dispatch)                             |                                                                                                                                                                                                                                                                                                                                                                    |
| [`workflow_job`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#workflow_job)                                       | `completed`<br>`in_progress`<br>`queued`<br>`waiting`                                                                                                                                                                                                                                                                                                              |
| [`workflow_run`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#workflow_run)                                       | `completed`<br>`in_progress`<br>`requested`                                                                                                                                                                                                                                                                                                                        |

<!-- /autogenerated via scripts/generate-types.ts -->

### emitterEventNames

A read only tuple containing all the possible combinations of the webhook events + actions listed above. This might be useful in GUI and input validation.

```js
import { emitterEventNames } from "@octokit/webhooks";
emitterEventNames; // ["check_run", "check_run.completed", ...]
```

### validateEventName

The function `validateEventName` asserts that the provided event name is a valid event name or event/action combination.
It throws an error if the event name is not valid, or '\*' or 'error' is passed.

The second parameter is an optional options object that can be used to customize the behavior of the validation. You can set
a `onUnknownEventName` property to `"warn"` to log a warning instead of throwing an error, and a `log` property to provide a custom logger object, which should have a `"warn"` method. You can also set `onUnknownEventName` to `"ignore"` to disable logging or throwing an error for unknown event names.

```ts
import { validateEventName } from "@octokit/webhooks";

validateEventName("push"); // no error
validateEventName("invalid_event"); // throws an error
validateEventName("*"); // throws an error
validateEventName("error"); // throws an error

validateEventName("invalid_event", { onUnknownEventName: "warn" }); // logs a warning
validateEventName("invalid_event", {
  onUnknownEventName: false,
  log: {
    warn: console.info, // instead of warning we just log it via console.info
  },
});

validateEventName("*", { onUnkownEventName: "ignore" }); // throws an error
validateEventName("invalid_event", { onUnkownEventName: "ignore" }); // no error, no warning
```

## TypeScript

The types for the webhook payloads are sourced from [`@octokit/openapi-webhooks-types`](https://github.com/octokit/openapi-webhooks/tree/main/packages/openapi-webhooks-types),
which can be used by themselves.

In addition to these types, `@octokit/webhooks` exports 2 types specific to itself:

Note that changes to the exported types are not considered breaking changes, as the changes will not impact production code, but only fail locally or during CI at build time.

> [!IMPORTANT]
> As we use [conditional exports](https://nodejs.org/api/packages.html#conditional-exports), you will need to adapt your `tsconfig.json` by setting `"moduleResolution": "node16", "module": "node16"`.
>
> See the TypeScript docs on [package.json "exports"](https://www.typescriptlang.org/docs/handbook/modules/reference.html#packagejson-exports).<br>
> See this [helpful guide on transitioning to ESM](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c) from [@sindresorhus](https://github.com/sindresorhus)

**⚠️ Caution ⚠️**: Webhooks Types are expected to be used with the [`strictNullChecks` option](https://www.typescriptlang.org/tsconfig#strictNullChecks) enabled in your `tsconfig`. If you don't have this option enabled, there's the possibility that you get `never` as the inferred type in some use cases. See [octokit/webhooks#395](https://github.com/octokit/webhooks/issues/395) for details.

### `EmitterWebhookEventName`

A union of all possible events and event/action combinations supported by the event emitter, e.g. `"check_run" | "check_run.completed" | ... many more ... | "workflow_run.requested"`.

### `EmitterWebhookEvent`

The object that is emitted by `@octokit/webhooks` as an event; made up of an `id`, `name`, and `payload` properties.
An optional generic parameter can be passed to narrow the type of the `name` and `payload` properties based on event names or event/action combinations, e.g. `EmitterWebhookEvent<"check_run" | "code_scanning_alert.fixed">`.

## License

[MIT](LICENSE.md)
