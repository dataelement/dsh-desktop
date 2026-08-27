# Task 3 实施报告：研究文件安全预览协议

## Status

- 已完成 Task 3 的主进程持久授权表、短期 capability、只读预览协议、Finder/sidebar 窄 admission bridge 和显式撤销接口。
- 当前版本保持 `0.7.3`；未发布、未改公开更新源，也未运行全量测试。
- 本任务的本地提交信息为：`支持研究文件安全预览协议`。

## 现有契约与接口选择

- Better Sidebar 的 renderer 拖拽 `{ path, name }` 可伪造，既有 `/sidebar/file` 仅做 lexical containment，因此没有复用它作为预览授权凭据。
- sidebar admission 固定为 `{ sessionId, nodeId, relativePath }`。主进程从 `${userData}/harness/storages/workspace.json` 反查 session 对应的权威 workspace root，再对 root 和目标执行 `realpath` 与分隔符安全的 containment 检查；renderer 不能提交 root 或绝对路径。
- Finder admission 在 preload 内对真实 `File` 调用 `webUtils.getPathForFile`。空路径或合成 File 不触发 IPC；renderer 得到的仅是 `{ authorizationId, url, contentType, name }` descriptor。
- renderer 可持久化的画布 JSON 只需要保留 opaque `authorizationId`。重启恢复必须同时匹配主进程持久记录中的 `(sessionId, nodeId)`，不会采用 renderer 写入的 path。
- 既有 `dshDesktop.getPathForFile(File)` 暂时只为当前附件发送/Finder drop 兼容保留；新的 preview capability 不读取其返回值，也没有 `read(path)` 或 `admitFinderPath`。Task 5 在 rich-node consumer 完成迁移并建立回归后再删除或收窄该 legacy 方法。

## Implementation

- 新增 `src/main/state/research-file-preview.ts`：
  - `${userData}/research-file-preview/authorizations.v1.json` 下的有界 JSON 授权存储，原子 temp/rename 写入，文件权限 `0600`；持久数据不含 capability token。
  - Finder 与 sidebar admission、重启 reissue、authorization/node/session revoke，以及短期 token 过期处理。
  - `sherlock-preview://<opaque-token>/...` 的 GET/HEAD handler；支持 200、单 Range 206、无效/多 Range 416，并返回准确 `Content-Length`、`Content-Range`、MIME。
  - 图片、SVG、PDF、HTML 及 HTML 相对 CSS/图片/脚本的扩展名与 magic 检查；每次请求重新 `realpath`，阻止 `..`、encoded slash/backslash/NUL 和 symlink escape。
  - `Cache-Control: no-store`、`X-Content-Type-Options: nosniff`、`Referrer-Policy: no-referrer` 与阻断网络、子 frame、对象、表单、base URL 的 CSP。Task 2 安全门虽然已经通过，但脚本执行仍由后续 Task 6 在 sandbox iframe 接线时显式开放；当前静态 HTML 为 fail-closed。
- `src/main/index.ts` 在 app ready 前注册 privileged scheme，在 ready 后、`createWindow()` 前安装 `protocol.handle`，且未把 `sherlock-preview:` 加入 `isTrustedAppUrl`。
- 新增 preload helper，所有新 preview API 只在已有 `process.isMainFrame` 分支内暴露；主进程 IPC 复用 Task 2 的 trusted main-frame 校验。

## TDD Evidence

### RED

先创建 `test/research-file-preview.test.ts` 并扩展 `test/research-file-drop.test.ts`，随后运行：

```text
npm test -- --run test/research-file-preview.test.ts test/research-file-drop.test.ts
```

预期失败原因：生产模块 `../src/main/state/research-file-preview` 尚不存在，同时 preload 尚无 `researchPreview` descriptor bridge；既有 Research drop 测试仍为绿色。这确认失败来自缺失的新行为，而非既有回归。

自审阶段又先增加 HTML 顶层预览可被 sandbox iframe 装载的 CSP 行为断言；它因 CSP 含 `frame-ancestors 'none'` 得到 RED，随后删除该会阻断预览组件自身嵌入的 directive，并保留 `frame-src 'none'` 来阻止预览内容继续嵌套页面。

### GREEN

```text
npm test -- --run test/research-file-preview.test.ts test/research-file-drop.test.ts
Test Files  2 passed (2)
Tests       63 passed (63)
```

覆盖 Finder/sidebar admission、主进程 workspace identity、持久恢复、token 过期/撤销、GET/HEAD、开区间/后缀 Range、416、多 Range 拒绝、MIME/magic、HTML 子资源、encoded traversal、symlink escape、真实生产 IPC handler 的 trusted-main-frame 行为，以及 synthetic File 零 IPC。

直接受影响的 Task 2 安全边界回归：

```text
npm test -- --run test/preload-main-frame.test.ts test/security.test.ts test/ipc-trust.test.ts
Test Files  3 passed (3)
Tests       11 passed (11)
```

## Typecheck and hygiene

```text
npm run typecheck
> tsc --noEmit -p tsconfig.node.json
exit 0

git diff --check
exit 0
```

## Risks / follow-up boundary

- Task 3 只生产安全 preview descriptor 与协议。Task 5/6 才会让 rich canvas node 消费 descriptor、在节点删除/session 切换时调用 revoke，并完成图片/PDF/HTML 的真实组件接线。
- 当前 HTML 脚本由 CSP 禁用；Task 6 必须同时用 sandbox iframe（无 `allow-same-origin`、表单、popup、下载、top navigation）及既有 Task 2 frame/IPC 测试来证明可安全开放本 capability 下的脚本。
- 最终 packaged app 与真实画布交互验证属于 Task 7；本任务按计划只执行聚焦测试、类型检查与 diff 检查。

## Review fix round 1/5

### 撤销事务性

评审指出 `revokeAuthorization`、`revokeNode`、`revokeSession` 原先会先删除内存授权和 capability，再忽略 `storage.save(false)` 并返回成功。这会让旧磁盘授权在重启后复活，同时误导调用方撤销已经持久化。

先增加三组表驱动行为测试，在可控存储拒绝写入时得到 RED：三种入口都返回了 `true`，而测试要求 `false`。实现改为先构造保留授权候选集合，只有 `storage.save` 成功后才提交内存删除与 token 撤销。失败时内存、旧 token 和磁盘记录全部保持一致；写入恢复后再次撤销成功，重启也无法 restore。

### 动态主窗口 Origin 与 Chromium CORS

评审确认 `corsEnabled/supportFetchAPI` 本身不足以让 Task 6 的 PDF.js 从动态 Harness origin 跨源 fetch。先增加真实 registry + production protocol wrapper 行为测试，得到 RED：`handleResearchFilePreviewProtocolRequest` 尚不存在。

实现后的 protocol wrapper 每次请求都从当前 `mainWindow.webContents.getURL()` 解析 origin，并复用可信应用 URL 策略，仅接受实际 `http://127.0.0.1:<port>` 或 `http://localhost:<port>` origin。renderer 无法传入 allowed origin。带 Origin 的合法请求精确回显：

- `Access-Control-Allow-Origin: <当前精确 origin>`；
- `Vary: Origin`；
- `Access-Control-Expose-Headers: Accept-Ranges, Content-Length, Content-Range, Content-Type`。

错误端口、外部 origin 或当前窗口不是可信 Harness HTTP URL 时，在任何 `realpath/stat/read/stream` 前返回 403，且不返回 ACAO。无 Origin 的 image/iframe navigation 保持原 capability 语义。另窄支持 OPTIONS，只接受 GET/HEAD 与 `Range` 请求头，并返回相同精确 origin、`Access-Control-Allow-Headers: Range` 和允许方法。

本轮 GREEN：

```text
npm test -- --run test/research-file-preview.test.ts test/research-file-drop.test.ts
Test Files  2 passed (2)
Tests       68 passed (68)

npm test -- --run test/preload-main-frame.test.ts test/security.test.ts test/ipc-trust.test.ts
Test Files  3 passed (3)
Tests       11 passed (11)

npm run typecheck
> tsc --noEmit -p tsconfig.node.json
exit 0
```

当前仓库没有小型 Electron/Chromium CORS 集成 harness，因此本轮用真实 service、真实文件访问和生产 origin wrapper 验证边界；Task 7 仍需在本地构建的真实 Sherlock 中用 PDF.js 验证动态端口的 Range fetch。
