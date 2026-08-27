# Task 6 实施报告：PDF 与 HTML 研究画布预览

## Status

- 已完成 PDF 单页预览、页码标题、滚轮翻页、DPR/像素上限、渲染取消与完整资源释放；首屏比例仅在自动默认几何时写回，手动或已持久比例不会被覆盖。
- 已完成仅使用 capability URL 的 HTML iframe，使用 `sandbox="allow-scripts"`、`no-referrer`、lazy loading、限制 Permissions Policy、精确 capability CSP 与授权根目录围栏。
- PDF.js 精确固定为 `4.10.38` 开发依赖；幂等脚本将 library、worker、CMaps、standard fonts 和 LICENSE 复制到真实 web frontend 静态输入目录，并从 Electron 包输入排除原始依赖与仅由其引入的 `@napi-rs/canvas*`。
- 未修改输入框宽度/位置、loading、应用版本、发布或更新逻辑；未运行全量测试或本地发布构建。

## PDF behavior

- production wheel helper 统一处理 pixel/line/page `deltaMode`，80 px 等效阈值、180 ms 节流、方向反转清零和 `1...pageCount` 边界；每次最多翻一页。PDF body 始终消费 wheel，包括 Command/metaKey wheel，避免同一事件继续平移或缩放画布。
- PDF.js `getDocument` 使用同源 staged worker/CMaps/fonts，明确 `useWasm: false`、`isEvalSupported: false` 与独立的 `maxImageSize: 8_000_000`，避免单张超大图片在进入 canvas backing-store 限制前造成无界解码；未加入版本兼容性未验证的 `canvasMaxAreaInBytes`。每次页码或尺寸变化先 cancel 旧 render task，再用 generation 防止取消后晚到的 promise 发布旧页。
- backing-store helper 以 O(1) 比例缩放限制 DPR 和 8,000,000 canvas pixels，覆盖极端、无效与畸形尺寸，不使用逐像素循环或会突破上限的硬下限。
- 首个 PDF page viewport 仅在 `sizeMode: auto` 且节点仍为 Task 4 默认 PDF 比例时写回内容比例；32 px 标题栏不计入比例。手动几何、已知比例、重入、翻页和 resize 不会再次覆盖。
- PDF canvas 同时测量 mounted preview body 的实际 `clientWidth` 与 `clientHeight`，每页以 `min(clientWidth, clientHeight * pageRatio)` 计算 CSS/backing 宽度，并由 `ResizeObserver` 响应普通/选中边框和手动 resize；不再把 border-box 外框宽度写入内容区。任一维尚未测得时不调用 `getPage` 或 `render`，避免旧外框宽度抢跑。DOM 回归以独立 literal 覆盖 portrait/landscape 及 auto、selected、manual 三态，所有 production render viewport 均为 measured body-fit width，且 `scrollWidth == clientWidth`、`scrollHeight == clientHeight`。
- 离屏、unmount 或换页/缩放会 cancel render、`page.cleanup()`、清零 canvas backing，并通过 loading task 这一单一 owner 销毁 PDF document/worker。teardown 的同步异常与异步 rejection 都被局部消费，避免 `PDFDocumentProxy.destroy()` 委托同一 loading task 后重复 destroy；随后只释放 exact ephemeral token。回到视口从 durable authorization 恢复。加载、文档、取页或渲染错误均保留文件名标题和本地错误态。
- loader 使用真实 `/sherlock-pdfjs/loader.js` module script；失败会移除残留 script 并清除共享 promise，后续可重新加载，不会挂在永不触发的旧标签上。

## PDF.js packaging

- `pdfjs-dist@4.10.38` 位于 exact `devDependencies`。staging 脚本校验真实安装版本，将 ESM 源字节复制为静态服务器能够以 JavaScript MIME 提供的 `pdf.min.js` 与 `pdf.worker.min.js`，同时复制 CMaps、standard fonts、LICENSE 和稳定 loader。
- 脚本接入 `postinstall` 与 `build`，先写进程级 staging 目录再替换目标。启动时只清理由脚本 exact `<destination>.staging-<pid>` 前缀产生且进程已不存在的 sibling，保留相似名称与仍存活进程；当前 staging 始终在 `finally` 清理。测试覆盖旧目录回收、相似目录保留、copy 失败无残留、两次稳定文件 hash；真实目录连续执行两次的 189 文件 SHA-256 清单也完全相同。
- production-like HTTP 测试调用真实 static server，确认 loader/library/worker 返回 `text/javascript` 和真实 PDF.js 字节，而不是 `.mjs` 的错误 MIME 或 SPA index fallback。
- electron-builder `files` 明确排除 `node_modules/pdfjs-dist/**`、`node_modules/@napi-rs/canvas/**` 和 `node_modules/@napi-rs/canvas-*/**`；`npm ls --all` 确认本仓库的 `@napi-rs/canvas` 仅由 PDF.js 引入。浏览器实际只消费约定的 staged assets。

## HTML security and interaction

- iframe `src` 只能来自主进程恢复的 `sherlock-preview://<capability>/`，不使用 `srcdoc`、`file://` 或 renderer path。固定 `sandbox="allow-scripts"`，不授予 same-origin、forms、popups、downloads、modals 或 top navigation。
- root HTML CSP 为 default-deny。style/image/classic external script source精确收敛到当前 capability token；允许 inline style 但禁止 inline script/eval。`connect-src`、object、nested frame、worker、manifest、form 和 base replacement 全部关闭，`frame-ancestors` 精确为当前 Harness origin；另一 capability token 不在允许源中。
- 相对 CSS/图片/经典外部脚本仍经主进程真实根目录与 symlink 围栏；module/fetch 的 opaque `Origin: null` 继续拒绝。iframe 普通 wheel 不由父 canvas prevent，viewport 不变；选择变化不重建 iframe，离屏释放后重入恢复新 token，晚到 restore 会释放 exact token。
- Task 4/5 shared shield 在节点拖动、四角 resize 与 Space-pan 时覆盖 iframe，结束后恢复交互；节点离屏仍保留同尺寸、可选择/移动 placeholder。

## Security Ruling

- opaque sandbox 下，相对 webfont 的浏览器请求携带 `Origin: null`。为保持既有能力协议拒绝 `Origin: null`，v1 不放宽 CORS、不加 `allow-same-origin`，HTML 使用系统字体降级；CSP 仅允许自包含 `data:` font。
- 当前 admission map 未加入音视频扩展，因此 v1 不宣称支持相对 media。首版支持 capability-scoped CSS、图片和经典外部脚本；这比 scheme-wide 资源授权或扩大文件类型更符合最小权限。
- HappyDOM 可验证 iframe policy、父层事件、身份稳定和 capability lifecycle，但不能证明真实 Chromium iframe 内部滚动/脚本视觉效果；留给 Task 7 packaged Electron fixture 进行真实交互验收。

## TDD evidence

### RED

首次在生产实现前运行四个聚焦文件：

```text
npm test -- --run test/research-file-drop.test.ts test/sherlock-composer-workspace-ui.test.ts test/research-file-preview.test.ts test/pdfjs-assets.test.ts
Test Files  4 failed (4)
Tests       9 failed | 191 passed (200)
```

失败覆盖：缺少 PDF.js staging/精确依赖、wheel/DPR helpers、dynamic HTML CSP，以及真实 mounted PDF/HTML consumers。

后续收紧测试在实现前分别得到：

```text
真实 .js/MIME 与 extreme backing-store: 3 failed
PDF 首屏比例 helper:                1 failed
PDF loader 失败残留 tag:            1 failed
opaque iframe font-src ruling:       1 failed
LICENSE/devDependency/package 排除:  2 failed
```

最终安全/UI 复核新增 RED：

```text
maxImageSize + stale/current staging cleanup:
Test Files  2 failed (2)
Tests       3 failed | 102 skipped (105)

border-box body sizing:
Test Files  1 failed (1)
Tests       1 failed | 101 skipped (102)

single PDF teardown owner:
Test Files  1 failed (1)
Tests       1 failed | 101 skipped (102)

二维 body-fit re-review:
Test Files  1 failed (1)
Tests       1 failed | 102 skipped (103)
Failure     body 0x0 时已提前 getPage(1)
```

### GREEN

```text
npm test -- --run test/research-file-drop.test.ts test/sherlock-composer-workspace-ui.test.ts test/research-file-preview.test.ts test/pdfjs-assets.test.ts
Test Files  4 passed (4)
Tests       207 passed (207)

npm test -- --run test/preload-main-frame.test.ts test/ipc-trust.test.ts test/security.test.ts test/research-file-preview.test.ts
Test Files  4 passed (4)
Tests       41 passed (41)

npm run typecheck
tsc --noEmit -p tsconfig.node.json
PASS
```

其他门禁：

- `git diff --check`: PASS
- full conversation patch `git apply --reverse --check`: PASS
- PDF.js actual staging two-run SHA-256 comparison: PASS（189 files）
- `npm ls pdfjs-dist @napi-rs/canvas --all`: `pdfjs-dist@4.10.38 -> @napi-rs/canvas@0.1.100`
- package contract：exact devDependency、LICENSE、真实 HTTP JavaScript MIME/bytes、raw dependency exclusions、staging lifecycle，以及 portrait/landscape 二维 body-fit 全部包含在 207/207 聚焦结果中。

## Files

- `package.json`, `package-lock.json`
- `scripts/install-pdfjs-assets.mjs`
- `src/main/state/research-file-preview.ts`
- `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js`
- `patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch`
- `test/pdfjs-assets.test.ts`
- `test/research-file-drop.test.ts`
- `test/research-file-preview.test.ts`
- `test/sherlock-composer-workspace-ui.test.ts`
- `.superpowers/sdd/2026-08-27-research-canvas-visual-components/progress.md`

## Remaining QA

- Task 7 必须在真实 packaged Electron 中验证 PDF worker 加载、高清屏 canvas、真实 PDF wheel/resize/offscreen，以及 opaque iframe 内部滚动、经典外部脚本、相对 CSS/图片和拖动/缩放 shield。Task 6 不以 HappyDOM 结果替代该用户可见验收。
