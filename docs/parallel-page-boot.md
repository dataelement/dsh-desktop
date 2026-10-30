# Parallel Desktop page preparation

The change covers HTML bootstrapping and client activation, plus Electron request routing. Backend Profile composition and plugin failure policy remain unchanged.

- Read static shell assets from the current installation’s `node_modules/@deepseek-ai/dsh-web-frontend/dist`, using the existing `bundledRuntimeRoot()` anchor in both packaged and development builds. Do not resolve shell assets from a Profile or caller cwd.
- Load `dsh-desktop://harness/` before starting Harness. The existing shell prepares its static modules and waits on `__DSH_BOOT_READY__`. A narrow main-frame IPC bridge supplies the current backend’s structured index injections only after authenticated boot.
- Obtain injections from an authenticated route registered by the existing bundled desktop-client-ui plugin. Normal Profile and Safe Mode both include that plugin; their backend/plugin discovery anchors remain unchanged. The current webServer injection table remains the authority for graph, revision and script URLs.
- The main process owns the backend cookie, proxies application requests and strips transport response headers. Only the owned loopback backend is accepted. Reject foreign origins, confine static paths and cancel superseded connections. No launch token or cookie is exposed in page URLs or logs.
- Preserve the registration queue → bootstrap script execution → boot graph → module-system creation → application activation order, using the upstream desktop injection interpreter. Reuse the prepared document after backend readiness. Reload it on backend restart; reset deferred boot and authentication state so previous launches cannot resolve the next page.
- Keep splash, import, plugin recovery and rollback documents independent. Backend errors retain the existing recovery path; client boot errors invoke the same recovery diagnostics. Safe Mode uses the same local shell and keeps its isolated Profile.

Verification: behavior tests for local serving, traversal and origin rejection, authentication, request forwarding, streaming/cancellation, delayed readiness, failed connection and reset; plugin endpoint behavior; existing navigation/recovery and packaged closure checks; typecheck, build, full tests, diff check. Real macOS Electron checks must confirm shell preparation overlaps backend startup, bootstrap registration and UI mount, restart and Safe Mode. Windows native validation remains a separate platform requirement.

## Completed validation

- Native Node 24 typecheck, full `npm test`, `npm run build` (within macOS packaging), and `git diff --check` passed.
- Real macOS arm64 Electron: normal Profile, new-document reload, backend restart, Safe Mode and an authenticated native WebSocket were exercised with an isolated development Profile. Bootstrap registration and the mounted sidebar were inspected; script download alone was not treated as successful activation.
- In a normal development run, the local shell was loaded while the boot graph/bootstrap were still unavailable (955 ms), then the full workspace mounted at 4210 ms. These are isolated-Profile measurements, not a comparison with a production Profile.
- The final signed development application was launched directly from its packaged output. Its local page preceded backend readiness; boot payload HTTP 200 returned 12 injection rows, the bootstrap registered, the workspace mounted at 4109 ms, and no renderer exceptions were captured. This is a development test build, not a published release.
- The application uses a separate development data directory. No installed production application or existing production Profile was replaced. Backend stopping time and plugin failure policy were not optimized by this change.

## Startup failure cover

The host cover applies during HTML bootstrapping and client activation, on both
`dsh-desktop://harness/` and legacy loopback HTTP pages. It uses packaged Desktop
loader images and a preload-owned shadow root because plugin slots are not yet
available. It does not change Profile composition, module resolution, bootstrap
ordering, API routing, or the normal/Safe Mode backend anchors.

A mounted sidebar releases the cover only when no startup failure is pending.
The desktop boot-failure bridge holds the cover before sending the original
message to main. DOM-based diagnostics remain readable beneath the cover. Main
collects failure evidence before replacing the failed document with the splash,
then performs market checks and opens the existing recovery page. Slow startup
switches the cover copy to a bilingual “startup is taking longer” state after 20
seconds and keeps covering. The cover offers no action: a stalled page is
usually still loading rather than failed, so revealing it would only show an
empty startup document. The ready path removes the main-process hide and drops
the cover once the client shell mounts; a failed removal keeps the cover and
retries on the next synchronization.

CSS insertion/removal belongs to each window and document generation. Late
insertion is removed after navigation or client readiness, failed removals
remain retryable, and recovery/splash documents are not covered. Renderer
navigation continues using the existing bounded recovery owner, including its
`ERR_ABORTED` handling. Inspector/WebSocket errors do not select another transport;
this change adds no HTTP fallback or compatibility-mode setting.
