# Research Web Link Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Research web-link components show trustworthy page titles, resize embedded pages with their component, and render public WeChat articles in a safe in-component reader instead of a blank CSP-blocked frame.

**Architecture:** Extend the existing authorized link registry with an opaque frame name and a fixed read-only inspection operation. Add a main-process WeChat reader that performs cookie-free, allowlisted fetching and returns sanitized article HTML, then render that HTML in a scriptless sandbox iframe. Keep title persistence and responsive layout decisions in the existing Research workspace/UI patch.

**Tech Stack:** Electron 43 `WebFrameMain`, TypeScript 5.9, React bundle patch, Cheerio, sanitize-html, Vitest, Happy DOM, patch-package.

**Spec:** `docs/superpowers/specs/2026-09-01-research-canvas-title-resize-download-design.md`

## Global Constraints

- Only `http:` and `https:` links remain valid Research web links.
- The WeChat reader accepts only public `https://mp.weixin.qq.com/s` and `https://mp.weixin.qq.com/s/...` URLs, uses no cookies or user authentication, follows at most three allowlisted redirects, reads at most 6 MiB, and times out after 12 seconds.
- Never disable Chromium CSP, remove remote response headers, add Node integration to child frames, or expose a general script-execution bridge.
- Automatically discovered titles never overwrite a user-renamed link component.
- Responsive iframe scaling stays between 65% and 100%, with a maximum logical viewport width of 1440 px.
- Do not build or replace the shared Sherlock client from the feature worktree. Run only focused tests, type checking, build verification, and patch replay checks.

---

### Task 1: Add a bounded WeChat article reader

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/main/state/research-web-reader.ts`
- Create: `test/research-web-reader.test.ts`

**Interfaces:**
- Consumes: `normalizeResearchLinkUrl(value: unknown): string | null` from `src/main/state/research-link-frame.ts`.
- Produces: `isResearchWechatArticleUrl(url: string): boolean`, `readResearchWechatArticle(input, dependencies): Promise<ResearchWebReaderResult>`, and `registerResearchWebReaderHandlers(options): void`.

- [ ] **Step 1: Add the parser and sanitizer dependencies**

Run:

```bash
npm install cheerio sanitize-html
npm install --save-dev @types/sanitize-html
```

Expected: `package.json` contains runtime dependencies for `cheerio` and `sanitize-html`, the type package is development-only, and `package-lock.json` records exact versions without changing Sherlock's version.

- [ ] **Step 2: Write failing URL, response-boundary, extraction, and sanitization tests**

Create fixtures directly in `test/research-web-reader.test.ts` and inject a fake fetch function:

```ts
function fixtureFetch(html: string): ResearchWebReaderDependencies {
  return {
    fetch: vi.fn(async () => new Response(html, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' }
    })),
    createTimeoutSignal: () => new AbortController().signal
  }
}

it('accepts only public mp.weixin.qq.com article paths', () => {
  expect(isResearchWechatArticleUrl('https://mp.weixin.qq.com/s/abc')).toBe(true)
  expect(isResearchWechatArticleUrl('https://mp.weixin.qq.com/s?__biz=abc')).toBe(true)
  expect(isResearchWechatArticleUrl('http://mp.weixin.qq.com/s/abc')).toBe(false)
  expect(isResearchWechatArticleUrl('https://mp.weixin.qq.com/cgi-bin/home')).toBe(false)
  expect(isResearchWechatArticleUrl('https://mp.weixin.qq.com.evil.example/s/abc')).toBe(false)
})

it('extracts a title and sanitized responsive article body', async () => {
  const result = await readResearchWechatArticle({
    url: 'https://mp.weixin.qq.com/s/abc'
  }, fixtureFetch(`<!doctype html><html><head>
    <meta property="og:title" content="英伟达豪掷70亿，下场做开放大模型了">
  </head><body><div id="js_content">
    <p onclick="steal()">正文<strong>重点</strong></p>
    <img data-src="https://mmbiz.qpic.cn/a.png" onerror="steal()">
    <script>steal()</script><iframe src="https://evil.example"></iframe>
  </div></body></html>`))

  expect(result).toMatchObject({ status: 'ready', title: '英伟达豪掷70亿，下场做开放大模型了' })
  expect(result.status === 'ready' && result.bodyHtml).toContain('https://mmbiz.qpic.cn/a.png')
  expect(result.status === 'ready' && result.bodyHtml).not.toMatch(/script|iframe|onclick|onerror/i)
})
```

Add separate cases for redirects leaving `mp.weixin.qq.com`, non-HTML content, missing `#js_content`, response size above 6 MiB, abort timeout, and HTTP failure.

- [ ] **Step 3: Run the tests and verify RED**

Run:

```bash
npx vitest run test/research-web-reader.test.ts
```

Expected: FAIL because `src/main/state/research-web-reader.ts` does not exist.

- [ ] **Step 4: Implement allowlisted fetch and sanitized extraction**

Define exact result types and dependency injection:

```ts
export type ResearchWebReaderResult =
  | { status: 'ready'; url: string; title: string; description?: string; author?: string; publishTime?: string; bodyHtml: string }
  | { status: 'unavailable'; reason: 'unsupported' | 'network' | 'response' | 'content' | 'too-large' | 'timeout' }

export type ResearchWebReaderDependencies = {
  fetch(input: string, init: RequestInit): Promise<Response>
  createTimeoutSignal(milliseconds: number): AbortSignal
}
```

Implement manual redirects and byte-limited streaming. Parse with Cheerio, convert `img[data-src]` to `src`, select only `#js_content`, and pass the fragment through `sanitizeHtml` with this explicit policy:

```ts
const allowedTags = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote', 'pre', 'code',
  'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'table', 'thead', 'tbody', 'tr',
  'th', 'td', 'a', 'img', 'hr', 'div', 'span'
]
const bodyHtml = sanitizeHtml(fragment, {
  allowedTags,
  allowedAttributes: { a: ['href', 'title'], img: ['src', 'alt', 'width', 'height'] },
  allowedSchemes: ['http', 'https'],
  allowedSchemesByTag: { img: ['https'] },
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard'
})
```

Reject an empty sanitized body. Normalize whitespace and cap title at 160 characters, description at 500, author at 120, publish time at 80, and sanitized body at 4 MiB.

- [ ] **Step 5: Run the reader tests and commit**

Run:

```bash
npx vitest run test/research-web-reader.test.ts
git add package.json package-lock.json src/main/state/research-web-reader.ts test/research-web-reader.test.ts
git commit -m '功能：新增微信文章安全阅读服务'
```

Expected: focused tests PASS and the commit contains only the reader service, dependencies, and tests.

---

### Task 2: Extend the authorized frame bridge with inspection and reader IPC

**Files:**
- Modify: `src/main/state/research-link-frame.ts`
- Modify: `src/preload/research-link-frame.ts`
- Create: `src/preload/research-web-reader.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/main/index.ts`
- Modify: `test/research-link-frame.test.ts`
- Modify: `test/research-web-reader.test.ts`

**Interfaces:**
- Consumes: `ResearchWebReaderResult` and `registerResearchWebReaderHandlers` from Task 1.
- Produces: `researchLinkFrame.authorize(...) -> { url, frameName }`, `researchLinkFrame.inspect(...) -> ResearchLinkFrameInspection`, and `researchWebReader.read(...) -> ResearchWebReaderResult` on `window.dshDesktop`.

- [ ] **Step 1: Write failing registry and trusted IPC tests**

Extend `test/research-link-frame.test.ts`:

```ts
const authorized = registry.authorize({ sessionId: 's1', nodeId: 'n1', url: 'https://example.com/a' })
expect(authorized.url).toBe('https://example.com/a')
expect(authorized.frameName).toMatch(/^sherlock-research-link-[a-f0-9]{32}$/)
expect(registry.resolve({ sessionId: 's1', nodeId: 'n1' })).toEqual(authorized)
```

Add an inspection fixture whose `mainFrame.framesInSubtree` contains a matching `name` and URL. Assert that the handler executes one fixed script and returns only bounded `{ title, scrollWidth, clientWidth }`. Add rejection cases for a stale node, mismatched frame URL, missing frame, destroyed frame, oversized title, and non-finite metrics.

Extend the reader handler test to prove a child frame cannot call it and an authorization mismatch returns `unavailable` without invoking fetch.

- [ ] **Step 2: Run the bridge tests and verify RED**

Run:

```bash
npx vitest run test/research-link-frame.test.ts test/research-web-reader.test.ts
```

Expected: FAIL because `frameName`, `resolve`, `inspect`, and the reader preload bridge are absent.

- [ ] **Step 3: Implement opaque frame identity and fixed inspection**

Store an opaque frame name with each authorization. Generate it in the registry using an injected `randomId` or `randomBytes(16).toString('hex')`; never derive a DOM frame name from raw session or node IDs.

Expose:

```ts
export type ResearchLinkFrameInspection = {
  url: string
  title: string
  scrollWidth: number
  clientWidth: number
}

resolve(value: unknown): ResearchLinkAuthorization | null
async inspect(value: unknown, frames: readonly WebFrameMain[]): Promise<ResearchLinkFrameInspection | null>
```

Find the frame by exact opaque name and an allowed current URL. Execute only this static script:

```js
(() => ({
  title: document.title,
  scrollWidth: Math.max(document.documentElement?.scrollWidth ?? 0, document.body?.scrollWidth ?? 0),
  clientWidth: Math.max(document.documentElement?.clientWidth ?? 0, window.innerWidth ?? 0)
}))()
```

Validate the structured result in main before returning it. Register `research:link-frame:inspect` through `registerTrustedMainWindowHandler`.

- [ ] **Step 4: Register the cookie-free reader bridge**

Create a frozen preload bridge:

```ts
export function createResearchWebReaderBridge(invoke: ResearchWebReaderInvoke) {
  return Object.freeze({
    read(value: { sessionId: string; nodeId: string; url: string }) {
      return invoke('research:web-reader:read', value) as Promise<ResearchWebReaderResult>
    }
  })
}
```

Register the handler in `src/main/index.ts` with the active main window, shared `ResearchLinkFrameRegistry`, and `globalThis.fetch`. Expose it in `src/preload/index.ts` next to `researchLinkFrame`. Do not expose cookies, headers, raw filesystem paths, or arbitrary fetch options.

- [ ] **Step 5: Run bridge/security tests and commit**

Run:

```bash
npx vitest run test/research-link-frame.test.ts test/research-web-reader.test.ts test/ipc-trust.test.ts test/security.test.ts
npm run typecheck
git add src/main/state/research-link-frame.ts src/preload/research-link-frame.ts src/preload/research-web-reader.ts src/preload/index.ts src/main/index.ts test/research-link-frame.test.ts test/research-web-reader.test.ts
git commit -m '功能：扩展研究网页检查与阅读桥'
```

Expected: all focused tests and type checking PASS.

---

### Task 3: Persist automatic titles and compute responsive frame layout

**Files:**
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js`
- Modify: `test/sherlock-composer-workspace-ui.test.ts`

**Interfaces:**
- Consumes: `researchLinkFrame.authorize`, `researchLinkFrame.inspect`, and `researchWebReader.read` from Task 2.
- Produces: workspace methods `applyWebLinkInspection(nodeId, expectedUrl, inspection)` and pure helper `researchWebFrameLayout(containerWidth, scrollWidth)`.

- [ ] **Step 1: Write failing migration, stale-response, rename, and layout tests**

Add workspace tests proving:

```ts
expect(workspace.createWebLink('https://example.com/a')).toMatchObject({
  title: 'example.com', titleMode: 'auto'
})
expect(workspace.applyWebLinkInspection(node.id, node.url, { title: '真实标题' })).toBe(true)
expect(workspace.getSnapshot().artifacts[0]).toMatchObject({ title: '真实标题', titleMode: 'auto' })
workspace.renameNode(node.id, '我的标题')
expect(workspace.applyWebLinkInspection(node.id, node.url, { title: '第二个标题' })).toBe(false)
expect(workspace.getSnapshot().artifacts[0]).toMatchObject({ title: '我的标题', titleMode: 'custom' })
```

Cover legacy empty, URL-like, hostname, and `%20` titles migrating to `auto`, a descriptive legacy title migrating to `custom`, and an inspection response whose `expectedUrl` no longer matches.

Test the pure layout helper:

```ts
expect(researchWebFrameLayout(720, 720)).toEqual({ logicalWidth: 720, scale: 1 })
expect(researchWebFrameLayout(720, 1200)).toEqual({ logicalWidth: 1108, scale: .65 })
expect(researchWebFrameLayout(400, 4000)).toEqual({ logicalWidth: 615, scale: .65 })
```

Use exact assertions matching the implementation rule: logical width is at most 1440 and scale is clamped to `.65` through `1`.

- [ ] **Step 2: Run the workspace tests and verify RED**

Run:

```bash
npx vitest run test/sherlock-composer-workspace-ui.test.ts -t 'web link|automatic title|responsive frame'
```

Expected: FAIL because `titleMode`, `applyWebLinkInspection`, and the layout helper are absent.

- [ ] **Step 3: Implement title persistence and migration**

Extend canonical web-link artifacts with `titleMode: 'auto' | 'custom'`. Infer old values with a pure helper that treats empty, normalized URL, hostname, and `%20`-prefixed titles as automatic. Set `auto` in `createWebLink` and `updateWebLink`; set `custom` when `renameNode` changes a web link.

Implement stale-safe application:

```js
applyWebLinkInspection(nodeId, expectedUrl, inspection) {
  const index = snapshot.artifacts.findIndex((node) =>
    node.id === nodeId && node.kind === 'web-link' && node.url === expectedUrl && node.titleMode === 'auto'
  )
  const title = normalizeResearchWebTitle(inspection?.title, expectedUrl)
  if (index === -1 || title === snapshot.artifacts[index].title) return false
  const artifacts = snapshot.artifacts.slice()
  artifacts[index] = { ...artifacts[index], title }
  update({ artifacts }, true)
  return true
}
```

- [ ] **Step 4: Implement bounded responsive layout calculation**

Use:

```js
function researchWebFrameLayout(containerWidth, scrollWidth) {
  const width = Math.max(1, Number(containerWidth) || 1)
  const content = Math.max(width, Number(scrollWidth) || width)
  const logicalWidth = Math.min(1440, content)
  const scale = Math.max(.65, Math.min(1, width / logicalWidth))
  return { logicalWidth: Math.round(width / scale), scale }
}
```

Keep this helper exported for focused tests.

- [ ] **Step 5: Run workspace tests and commit**

Run:

```bash
npx vitest run test/sherlock-composer-workspace-ui.test.ts -t 'web link|automatic title|responsive frame'
npx patch-package @deepseek-ai/dsh-client-ui-conversation
git add patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch test/sherlock-composer-workspace-ui.test.ts
git commit -m '功能：持久化网页标题并计算自适应布局'
```

Expected: focused tests PASS and the workspace/model change is already reproducible through the canonical patch.

---

### Task 4: Render inspected websites and the WeChat reader in the component

**Files:**
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js`
- Modify: `test/sherlock-composer-workspace-ui.test.ts`

**Interfaces:**
- Consumes: Task 2 preload bridges and Task 3 workspace helpers.
- Produces: `ResearchCanvasWebFrame` states `authorizing`, `loading`, `ready`, `reader-loading`, `reader-ready`, and `unavailable` with explicit retry UI.

- [ ] **Step 1: Write failing rendered UI tests**

Add a normal-page test whose authorize bridge returns `{ url, frameName }`, dispatch iframe `load`, and assert `inspect` is called with the current identity. Resolve it with `{ title: '真实页面', scrollWidth: 1200, clientWidth: 720 }`; assert the workspace title changes and the iframe wrapper contains scale/layout data attributes.

Add a resize test with a controllable `ResizeObserver`: change the component content width, fire the observer, and assert a debounced re-inspection and updated logical width.

Add a WeChat test:

```ts
const read = vi.fn(async () => ({
  status: 'ready',
  url: 'https://mp.weixin.qq.com/s/abc',
  title: '英伟达豪掷70亿，下场做开放大模型了',
  bodyHtml: '<p>文章正文</p><img src="https://mmbiz.qpic.cn/a.png">'
}))
// create link, await reader, then assert:
expect(host.querySelector('[data-research-wechat-reader]')).not.toBeNull()
expect(host.querySelector('[data-research-web-frame]')).toBeNull()
expect(readerFrame?.getAttribute('sandbox')).toBe('')
expect(readerFrame?.getAttribute('srcdoc')).toContain("script-src 'none'")
```

Add failure and retry assertions with “暂时无法读取文章”, “重试”, and “浏览器打开”.

- [ ] **Step 2: Run rendered tests and verify RED**

Run:

```bash
npx vitest run test/sherlock-composer-workspace-ui.test.ts -t 'web frame|WeChat|微信|responsive'
```

Expected: FAIL because inspection, reader rendering, and retry states are absent.

- [ ] **Step 3: Implement normal iframe inspection and resize adaptation**

Set the iframe `name` to the opaque value from authorization. On `load`, call `inspect`; pass the title to `workspace.applyWebLinkInspection`. Observe the frame shell with `ResizeObserver`, debounce through `requestAnimationFrame`, and recompute inspection only after width changes. Apply styles to an inner scale layer rather than the component chrome:

```js
style: {
  width: `${layout.logicalWidth}px`,
  height: `${100 / layout.scale}%`,
  transform: `scale(${layout.scale})`,
  transformOrigin: 'top left'
}
```

Keep wrapper overflow contained and preserve internal iframe scrolling when the `.65` floor cannot fully fit a fixed-width page.

- [ ] **Step 4: Implement scriptless WeChat reader rendering**

Detect the strict WeChat article URL before rendering the remote iframe. Call `researchWebReader.read` after authorization and render a dedicated iframe with `sandbox=""`, `referrerPolicy="no-referrer"`, and an app-generated `srcDoc` containing:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https://mmbiz.qpic.cn https://mmbiz.qlogo.cn data:; style-src 'unsafe-inline'; script-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'">
<style>html,body{margin:0;background:#fff;color:#242424}body{padding:24px;font:16px/1.75 -apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif}img{display:block;max-width:100%;height:auto;margin:16px auto}table{display:block;max-width:100%;overflow:auto;border-collapse:collapse}pre{overflow:auto;white-space:pre-wrap}</style>
```

Escape metadata inserted into the document shell. Insert only the already-sanitized `bodyHtml`. Apply the returned title through the stale-safe workspace method. Failed reads render an explicit central fallback instead of an empty white viewport.

- [ ] **Step 5: Run rendered tests and commit**

Run:

```bash
npx vitest run test/sherlock-composer-workspace-ui.test.ts -t 'web frame|WeChat|微信|responsive'
npx patch-package @deepseek-ai/dsh-client-ui-conversation
git add patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch test/sherlock-composer-workspace-ui.test.ts
git commit -m '功能：网页组件支持自适应和微信阅读视图'
```

Expected: focused UI tests PASS and the rendered implementation is reproducible through the canonical patch.

---

### Task 5: Replay the canonical dependency patch and verify the web-link feature

**Files:**
- Verify: `patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch`
- Verify: all files changed in Tasks 1–4

**Interfaces:**
- Consumes: the completed web-link implementation.
- Produces: a reproducible patch that survives `npm install` and is ready for multi-session integration.

- [ ] **Step 1: Confirm the canonical patch contains every UI change**

Run:

```bash
rg -n 'titleMode|applyWebLinkInspection|researchWebFrameLayout|researchWebReader|reader-ready' patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch
```

Expected: the conversation patch contains `titleMode`, frame inspection, responsive layout, WeChat reader states, and their CSS.

- [ ] **Step 2: Verify patch replay in an isolated temporary dependency tree**

Run:

```bash
patch_replay_dir="$(mktemp -d)"
cp package.json package-lock.json "$patch_replay_dir/"
cp -R patches "$patch_replay_dir/patches"
npm ci --prefix "$patch_replay_dir" --ignore-scripts
(cd "$patch_replay_dir" && npx patch-package --error-on-fail)
```

Expected: patch-package exits 0 without offsets or rejected hunks. The temporary directory may be removed after its absolute path printed by `mktemp -d` has been checked.

- [ ] **Step 3: Run the complete focused web-link gate**

Run:

```bash
npx vitest run test/research-link-frame.test.ts test/research-web-reader.test.ts test/security.test.ts test/ipc-trust.test.ts test/sherlock-composer-workspace-ui.test.ts
npm run typecheck
npm run build
git diff --check
```

Expected: focused tests, type checking, build, and whitespace check PASS. Do not run the full test suite.

- [ ] **Step 4: Confirm the feature tip is clean**

Run:

```bash
git status --short
```

Expected: the worktree is clean and the web-link feature is independently integratable.
