# dsh-desktop-multi-account

Desktop host plugin that adds per-provider API-key account pools to
Settings → Models. Every provider that authenticates with an API key can
hold several named accounts; the plugin switches between them manually, on
credential failures (failover), or per call (round-robin).

## How it works

- **One credential reference per provider.** Adapters resolve the API key
  from the credential service on every stream, so switching accounts is a
  single `credentials.set(ref, key)` — no restart, no settings rewrite.
  The reference is the one the provider's profile already names
  (`apiKeyEnv`), or the derived `<PROVIDER>_API_KEY` reference the Models
  page itself wires when a key is first typed. OAuth-only routes and the
  sign-in-based `deepseek-account` route are never made manageable,
  mirroring the Models page.
- **State** lives in one owner-only grant record
  (`dsh-desktop-multi-account/state`) next to the credentials it manages:
  per provider an ordered account list, the active account, the switching
  strategy, and per-account health (`lastUsedAt`, `lastError`). API keys
  never leave the host — HTTP views expose SHA-256 fingerprints only, and
  importing the currently stored key happens entirely server-side.
- **Switching** wraps `llm/stream` outermost. Before the first content
  chunk, credential-class failures (auth, quota, rate limit; HTTP
  401/402/403/429) retry invisibly on the next enabled account under the
  failover strategy; after content has streamed, the pool advances for
  the next call instead. Round-robin rotates on every call. Manual never
  switches on its own, but still records account errors. Aborted calls
  never switch. Every failure inside the plugin degrades to a plain
  passthrough, so model calls never break because of it.
- **Stock-editor coherence.** Typing a key in the built-in provider
  editor is adopted into the pool (a known key activates its account, a
  new key replaces the active account's key), and the active account is
  re-applied on boot, so the single-key UI and the pool never disagree
  about which key is live.

## Surface

- `GET /api/desktop-multi-account/state` — redacted provider views.
- `POST /api/desktop-multi-account/mutate` — `add-account`,
  `import-current`, `update-account`, `remove-account`, `move-account`,
  `set-active`, `set-strategy`, `clear-provider`.
- Client: a keyed card in the Models settings slot per provider
  namespace, opening the account dialog (strategy, import, add, edit,
  enable/disable, reorder, remove). Copy ships in zh/en/de.

Removing the last account of a provider (or clearing it) deletes its pool
entry and leaves the stored credential untouched — the provider keeps
working with whatever key was last applied. The plugin is part of the
desktop profile only, not of safe mode.
