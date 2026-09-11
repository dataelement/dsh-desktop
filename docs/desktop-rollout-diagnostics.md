# Desktop rollout and diagnostic integration

Packaged Desktop initializes this service after acquiring the single-instance lock, before creating webContents or starting Harness. Development builds do not send production diagnostics. Electron `net.fetch` uses the app's network/proxy configuration; requests begin after app readiness.

## Update contract

`GET https://dshdesktop.com/crash/v1/updates/check` sends installationId, currentVersion and platform (`mac`, `mac-intel`, or `windows`). There is no channel/architecture field. The backend derives release type from SemVer.

Automatic checks and the normal manual check obey the same decision. No matching rule means **no update**, not full rollout. An unavailable/malformed policy fails the check without falling back to the public latest feed. A selected version pins the generic provider to `/updates/archive/<version>/`; mismatched metadata cannot enter the available/download UI. Downloads still require user acceptance. Explicit version-history installs retain their existing bypass and downgrade behavior.

## Diagnostic contract

`POST https://dshdesktop.com/crash` sends an event UUID, installation UUID, version, combined platform, failure kind/time/message and at most the last 100 log lines. No administrator credential or Harness session token is included intentionally. Common credential patterns and user home paths are redacted before local persistence; arbitrary secrets/business text cannot be exhaustively identified by pattern matching.

The installation ID is a random UUID at `<userData>/desktop-service/installation.json`. Queue and session marker live alongside it. Maximum pending reports: 50 (oldest evicted); each report requires explicit approval in a native confirmation dialog (default/cancel: do not send). The dialog explains the destination, fields and one-time upload choice. Refusal or dialog failure discards the pending copy without a request. Consent applies to that report only, including reports recovered on startup. Each report is removed from the queue before confirmation and its single upload attempt, with a 5-second timeout. Failed or interrupted uploads are discarded, without retries or periodic polling. Reports captured before networking is available (including fatal crashes) get their first attempt at the next startup. Long lines are capped at 2000 characters, file reads at 1 MiB; truncation or missing files are marked.

Harness launch attempts report startup-failure before readiness or harness-crash after readiness. Reporting awaits the actual log-stream write callback. Renderer/GPU loss is persisted synchronously before recovery can exit the app. Main JavaScript fatal exceptions use uncaughtExceptionMonitor and preserve the default crash behavior. A queued fatal event and the next unclean-start marker reuse the same event ID for deduplication.

Normal will-quit and intentional GPU relaunch clear the session marker. Native crashes, power loss or forced termination are reported as **unclean-exit on next launch**, not as a proven crash; they cannot reliably send HTTP from a dead process. If the app never reaches initialization again, there is no guarantee of delivery. Initialization/reporting failure does not prevent application startup.

This does not yet track installer/download errors or correlate upgrade attempts with installation success. It also does not change signing or update-package verification settings. Real packaged macOS/Windows crash and upgrade acceptance remains separate from unit/build/CI validation.
