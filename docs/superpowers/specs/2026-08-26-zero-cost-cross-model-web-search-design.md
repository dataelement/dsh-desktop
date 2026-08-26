# Zero-Cost Cross-Model Web Search Design

## Goal

Give every Sherlock desktop user usable web search regardless of which model
provider they configure, without requiring a Sherlock-operated search API or a
paid Cloudflare/search service. The current session model remains the preferred
search route when its provider exposes a known native search protocol; all
other routes automatically fall back to an isolated local Electron browser.

The first visible regression this design must remove is Kimi Coding being sent
to an OpenAI `/responses` endpoint and failing with:

`The selected model provider "kimi-coding" has no valid Responses API base URL.`

## Product Behavior

- Search mode defaults to `auto`; ordinary users do not configure a search
  vendor, endpoint, or key.
- In `auto`, Sherlock first tries a provider-native adapter only when the
  selected route is explicitly known to support that protocol.
- An unsupported route, missing native route, provider rejection, unreadable
  native result, or native result without citeable sources falls back to the
  local browser search.
- Kimi Coding and other Anthropic/OpenAI-compatible chat routes are not assumed
  to expose OpenAI Responses. They use local search unless a dedicated,
  verified adapter is registered.
- A cancelled search stops immediately and never starts the next fallback.
- Users can choose `native-only` to forbid browser fallback or `off` to disable
  search. These are advanced preferences; `auto` is the shipped default.
- Search results keep Sherlock's existing normalized contract: optional concise
  content plus a list of `url`, `title`, and `snippet` sources.

## Cost Boundary

The local fallback uses the user's own Mac, network, and public search result
pages. It does not call Cloudflare Workers, R2, Brave Search, Tavily, Exa, or
another Sherlock-funded search service. Therefore Sherlock introduces no
search-service or Cloudflare request bill.

A provider-native search can still be part of the user's own model-provider
usage. `auto` prefers it because it is usually higher quality and structured;
`native-only` makes that policy explicit. Sherlock must never label a provider
charge as free.

## Architecture

```text
Harness web-search tool
        |
        v
SessionModelSearchProvider
        |
        +-- known native adapter ------> user's configured model API
        |          | unsupported/error/no sources
        |          v
        +-- LocalSearchClient ---------> 127.0.0.1 random port + bearer token
                                                |
                                                v
                                    LocalBrowserSearchService
                                                |
                                                v
                                  isolated hidden BrowserWindow
                                     Bing / DuckDuckGo HTML
```

The provider package owns routing and result normalization. The Electron main
process owns browser automation. The child Harness receives only the loopback
URL and an ephemeral bearer token through its process environment; model API
credentials never cross the local bridge.

## Native Adapter Policy

Native requests are allowlisted by provider/protocol capability, not inferred
from a model's conversational API compatibility.

- Keep the existing OpenAI Responses `web_search` adapter for routes explicitly
  identified as `openai-responses`, plus the official OpenAI route.
- Do not append `/responses` for `anthropic-messages`, `openai-completions`,
  Kimi Coding, or an unknown custom provider.
- The router is an adapter registry so verified Anthropic, Gemini, or Kimi
  managed-search implementations can be added without changing the fallback.
- A native adapter error is classified as either abort, recoverable fallback,
  or terminal policy error. Abort and `off` are terminal; unsupported routes,
  missing credentials/routes, 403/404/405/429/5xx, timeouts, invalid bodies,
  and empty source sets are recoverable in `auto`.

This increment deliberately avoids inventing provider protocols. Kimi Coding's
chat tool interface requires the host to implement web search, so its reliable
path in Sherlock is the local browser fallback.

## Local Loopback Service

`LocalBrowserSearchService` starts before the Harness and binds only to
`127.0.0.1` on an operating-system-selected port. It generates a cryptographically
random token for that app run and exposes one operation:

`POST /search` with `Authorization: Bearer <token>`

The JSON body contains only `query` and `maxResults`. The service enforces a
small request body, a bounded query, a result cap, JSON content type, POST-only
routing, loopback clients, constant-time token comparison, and one active
browser search at a time. Responses contain only normalized public result
metadata. Tokens, cookies, model credentials, and full page HTML are not
logged or returned.

Closing or updating Sherlock stops the HTTP server before destroying its
browser session. Restarting only the Harness keeps the same main-process bridge
alive and reuses the current ephemeral endpoint.

## Isolated Browser

Search runs in a dedicated non-persistent Electron session and a BrowserWindow
configured with:

- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- `webSecurity: true`
- no preload script
- all permission requests denied
- downloads and popups blocked
- audio muted

The window is hidden during normal searches. It navigates only to allowlisted
search hosts and extracts the visible result page with engine-specific,
side-effect-free JavaScript. It does not open result links.

Bing is the primary engine for Chinese queries and DuckDuckGo is the secondary
engine; the order can be reversed for other locales. If extraction produces no
usable sources, the controller tries the other engine once. Redirects outside
the engine allowlist fail that attempt.

## Verification Challenge

Public search pages may change markup or present a CAPTCHA. The controller
detects common challenge URLs, titles, and page markers. Only then does it show
the isolated window with the title `完成搜索验证`. After the user completes the
challenge, the same request resumes extraction and the window hides again.

This is the only non-transparent edge case. Sherlock cannot bypass CAPTCHA or
guarantee the stability of a third-party public page, so the two-engine fallback
and clear verification window are contractual resilience measures.

## Settings

The Host registers a `web-search-session-model` settings namespace with:

```ts
type SearchMode = 'auto' | 'native-only' | 'off'
```

The existing Plugins settings page exposes a compact selector:

- `自动（推荐）`: native first, then the free local browser.
- `仅模型原生`: never use the local browser.
- `关闭`: web search reports that it is disabled.

The selector stores no credential and takes effect on the next search without
restarting Sherlock.

## Failure Semantics

- `WEB_ABORTED`: terminal; preserve the caller's cancellation reason.
- `WEB_SEARCH_DISABLED`: terminal; explain that the user disabled search.
- `WEB_NATIVE_SEARCH_REQUIRED`: terminal in `native-only` when no native
  adapter succeeds.
- Local bridge unavailable/unauthorized: report a stable local-search error
  without exposing endpoint or token.
- Both public engines fail: report that local search could not obtain results
  and suggest retrying or completing verification; do not fall back to a paid
  remote service.

## Testing and Delivery

Use test-driven development and run focused checks only:

- Router tests for native selection, Kimi/unknown fallback, error
  classification, empty-source fallback, modes, and abort behavior.
- Loopback tests for authentication, method/content-type/body/query/result
  limits, serialization, queueing, and shutdown.
- Pure engine tests for URL construction, host allowlists, result
  normalization, duplicate/unsafe URL rejection, and challenge detection.
- Browser-controller tests with injected fake windows/web contents for secure
  preferences, permissions, engine retry, and challenge visibility.
- Runtime tests for endpoint/token injection without logging the token.
- Focused settings UI/patch and model-provider policy tests.
- TypeScript, patch-package integrity, and `git diff --check`.
- Build and launch the packaged `Sherlock Dev.app`, then verify a real Kimi
  Coding search reaches local results without `/responses`, abort works, and
  logs/network show no Cloudflare or paid search-service request.

Do not run the full project test suite and do not publish a formal release.

