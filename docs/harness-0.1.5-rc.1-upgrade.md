# 升级到 Harness 0.1.5-rc.1

从 `0.1.2-rc.1` 升级到 `0.1.5-rc.1`（2026-09-10 发布，npm `latest` / `next`）。
跳过了中间的 `0.1.3-alpha.2`、`0.1.5-alpha.1`、`0.1.5-alpha.2`。

前序升级见 [harness-0.1.2-rc.1-upgrade.md](./harness-0.1.2-rc.1-upgrade.md)；
本次同时执行了 [harness-0.1.5-patch-refactor.md](./harness-0.1.5-patch-refactor.md)
里的第 1、2 步。

> **后续：已跟进到 `0.1.5-rc.2`**（2026-09-10 发布，npm `next`；`latest` 仍为 rc.1）。
> 上游 4 个提交，只改了反馈弹窗、交付文件卡片排版与对话间距。
>
> - 217 个 dsh 依赖改为 `0.1.5-rc.2`，19 个补丁文件改名；cordis 系版本未变。
> - 移除 `@deepseek-ai/dsh-typert-generator`：它是 TypeScript 分析 / 代码生成工具，
>   不在任何运行时依赖链上（lockfile 里只有根项目依赖它），上游 rc.2 也未发布该包。
> - 被打补丁的 19 个包里只有 `chat`、`deliverables`、`sidebar` 在 rc.2 有改动，
>   其余与 rc.1 逐字节相同；这三个包里补丁触及的函数与锚点逐一比对均未变化，
>   sidebar 的 CSS hash 也未变。20 个补丁全部干净套用，无需重做。
> - `packages/*` 的 dsh peer 区间 `^0.1.5-rc.1` 已覆盖 rc.2，未改动（PPT tarball 因此无需重打）。
> - 验证：vitest 754/754、tsc、build、`verify-harness-auth.mjs` 通过；web profile（含 PPT）
>   在自带 Node 与 Electron utility process 下均正常引导（token 1.6–2.4s），inject / entry
>   失败 0；真实 Chromium 加载首屏 console.error 0 条。

## 一、依赖方式：vendored tarball → npm registry

`0.1.2-rc.1` 升级文档里写的「上游尚未发布 npm registry 包」已经不成立。实测 226 个
`file:` 依赖里，218 个 `@deepseek-ai/dsh-*` 在 registry 上都有 `0.1.5-rc.1`，其余 8 个
cordis 系包也都有各自的正式版本（版本号与原先 pin 的完全一致）。

而且 registry 上的是**上游 CI 的官方产物**，不是本机重打的包。对比
`dsh-client-ui-workspace@0.1.2-rc.1` 的 CSS region 注释：

```
npm     : \0dsh-css:/home/runner/work/deepseek-harness/...  → .YDXeBa_projectRow
vendored: \0dsh-css:/private/tmp/dsh-harness-v0.1.2-rc.1/... → .A5jQHq_projectRow
```

因此本次：

- `package.json` 的 226 个 `file:` 依赖改为精确版本号（dsh 系 `0.1.5-rc.1`，cordis 系
  `4.0.2` / `1.0.3` / …）
- 删除 `packages/harness-0.1.2-rc.1/`（254 个文件，8.1 MB）
- `package-lock.json` 重新生成，每条 `@deepseek-ai/dsh-*` 都带 registry URL + integrity

`npm ci` 的可复现性从「仓库自包含」变成「registry 可达 + lockfile integrity 锁定」。
`test/release.test.ts` 里原先强制 vendored 布局的用例改写成了新契约：所有 dsh 依赖必须
精确 pin 到同一个版本、必须有 integrity、且不得再出现 `file:packages/harness-`。

副作用：不再需要本地 clone 上游跑 `build:official` + 两次 `release/pack.ts`，
CSS patch 也不再携带构建机绝对路径（`patches/` 下已无任何本机路径）。

## 二、上游破坏性变化与处理

### 1. session persistence seam 整体重写

`SessionPersistence` 从 `append/prepare/inspect/ensureMaterialized/…` 改成 handle
所有权模型：

```ts
abstract create(header, options): Promise<SessionHandle>   // 取写所有权
abstract open(id, access: 'read' | 'write', options): Promise<SessionHandle>
abstract flush(): Promise<void>
abstract stat(id, options): Promise<SessionPersistenceSnapshot | undefined>
abstract list(options): Promise<readonly SessionPersistenceSnapshot[]>
```

seam 包从 66 KB 缩到 12 KB，coordinator 搬进 `dsh-session-persistence-jsonl`
（61 KB → 135 KB）。上游到 0.1.5 仍然没有 `session/delete`，删除会话依旧是 Desktop 的功能。

**重写后的实现**（比旧版更贴合上游语义）：

- `dsh-session-persistence`：抽象基类加一个默认拒绝的 `delete(_id, _options)`，
  后端可覆盖；不再需要 `assertDeletable` 那套 phase 检查
- `dsh-session-persistence-jsonl`：`delete(id, options)` 走和 `open(id,'write')`
  完全相同的排他路径——`tracker.claimWrite(id)` 取进程内独占 + `acquireLease()` 取
  目录级跨进程锁，再删除那一个日志文件，保留共享的 project 目录；
  `finally` 里清 `coldLogMemo` / `migrationPreparations` 并释放锁
- 未 materialize 的 pending session 直接拒绝删除

`test/session-delete-patch.test.ts` 的行为用例改成对新 API 的真实读写（create →
append → flush → close → delete → stat/list 校验），跑在真的 JSONL 后端上。

### 2. replace surfaceOp 字段改名

`{ op: 'replace', start, end }` → `{ op: 'replace', startSeq, endSeq }`，
0.1.5 对旧结构直接抛 `session event "user/message" carries an invalid replace surfaceOp`。

内置 PPT 插件命中了这个改动：`packages/ppt-runtime/core/lib/index.js` 清理过期自动指令时
构造的就是旧结构。已修正源码并重打 `packages/ppt-bundles/` 的两个 tarball，
同步刷新 `packages/ppt-runtime/artifacts.json` 的 sha256 / integrity。

### 3. 部署 persona 拆分

`SystemPrompt` 的 `persona` 选项拆成 `personaPrefix` / `personaSuffix`，
section 名从 `deployment:persona` 改成 `deployment:persona-prefix`（已导出为
`PERSONA_PREFIX_SECTION`）。产品代码不使用该选项，只有 `test/ppt-activation.test.mjs`
的夹具需要跟随改名。

### 4. peerDependencies 区间

`^0.1.2-alpha.4` 不匹配 `0.1.5-rc.1`（semver 对不同版本的预发布不做匹配），
`npm install` 直接 ERESOLVE。已把仓库内插件的 dsh peer 区间统一放宽到 `^0.1.5-rc.1`：
`packages/ppt-runtime/{core,adapter}`、`dsh-desktop-client-ui`、
`dsh-desktop-market-installer`、`dsh-desktop-preset-transfer`。
`dshmarket` 的多版本并集追加一项而不是覆盖，保留它对旧 Harness 的兼容声明。

### 5. slot 名录

- 新增：`sidebar.panellist`、`conversation.session.header.corner`、`tool.title.readImage`
- 移除：`conversation.details.tool`（仓库内无使用）
- Desktop patch 出来的 `conversation.input.accessory`、`conversation.hero.modeActions`
  上游依旧没有

## 三、patch 迁移

20 个 patch 全部迁到 `+0.1.5-rc.1`（`cordis-plugin-loader` 仍是 `1.0.3`，上游未变）。
其中 6 个原样套用，14 个重做。

**顺带修掉的老问题**：早先几个 patch 把整个 CSS 字符串和 class map 换成了本机重新构建的
副本（带本机绝对路径、自造 hash）。这会在每次上游重打包后静默失配——页面渲染出的 class
在样式表里根本不存在。本次改成**只追加**：保留上游的 CSS 与 class map，把 Desktop 自己的
规则接在后面，只往 class map 里加新键。

- `dsh-client-ui-agent-preset`：+516 → +470
- `dsh-client-ui-workspace`：+326 → +207
- `AgentPresetSection` 的 Desktop 专属 class 改用 `dshPreset_` 前缀。0.1.5 这张表的
  上游 hash 恰好就是旧 patch 自造的 `rtSEdW_`，继续沿用会和上游共享命名空间。

`test/preset-transfer-patch.test.ts` 里那条「class map 对齐」用例随之改写：不再比对具体
hash，而是断言 patch 只新增 class map 键、绝不重述上游条目——这个失配模式现在从结构上
不可能再出现。`test/ppt-integration.test.ts` 的 CSS 断言也改成按 class 名匹配，不再钉死
hash 前缀。

## 四、验证

- `npm ci`：990 个包，20 个 patch 全绿，brand assets 注入正常
- `npx vitest run`：**751 / 751 全绿**
- `tsc --noEmit -p tsconfig.node.json`：通过
- `npm run build`：通过
- `node scripts/verify-harness-auth.mjs`：通过（401 → 303 换 cookie → 200）
- 用 Desktop 的完整启动路径引导 `web` 与 `desktop-safe-mode`：自带 Node 与 macOS
  Electron utility process 两条路径都正常服务（401）

## 五、启动入口契约变更（真机暴露，最初被误判）

0.1.5 把 CLI 从「模块顶层无条件执行」改成了「入口点门禁 + 具名导出」：

```js
// 0.1.2 lib/bin.js
const invocation = parseDshArgs(process.argv.slice(2), readVersion());
switch (invocation.mode) { ... }

// 0.1.5 lib/bin.js
async function runCli() { ... }
if (import.meta.main) await runCli();
export { runCli };
```

`build/harness-node-entry.mjs` 是 `await import(dshEntryPath)` 把 bin.js **当模块导入**的，
所以 `import.meta.main === false`，`runCli()` 根本不会执行——进程加载完什么也不做，
事件循环一空就 exit 0，**没有任何报错**。桌面端只能看到
`Harness stopped unexpectedly (exit code 0 (0x00000000))`。

对照实验（同一个自带 Node、同样参数、干净 DSH_HOME）：

| 启动方式 | 结果 |
| --- | --- |
| 直接 `node bin.js web …` | 起服务（401） |
| 经 `harness-node-entry.mjs` 导入 | 加载后静默 exit 0 |

修复：入口在 import 之后显式调用导出的 `runCli()`，老版本没有该导出时保持原有的
import 副作用行为。`test/harness-node-entry.test.ts` 增加回归用例，同时锁住上游两端契约
（`import.meta.main` 门禁 + `runCli` 导出）与入口的调用方式。

已验证：自带 Node 与 macOS Electron utility process 两条路径都能正常起服务（401）。

> **订正**：本文档早先版本把 `test/safe-mode-runtime.test.ts` 的失败归因为
> 「0.1.5 下注册任何 ESM loader 钩子都会导致引导静默退出」。那是错的——当时的对照组用的是
> **直接执行 bin.js**，绕开了 wrapper，所以才正常。钩子与此无关，真正原因就是上面这条入口
> 契约变更。修复后该用例通过，测试套件 **751/751 全绿**。

## 六、connection 路由的 inject 归属（真机暴露）

0.1.5 的 `ctx.connection.rpc.handle()` 会把 RPC 通道注册成一条 **webServer 路由**，
而且注册动作发生在「读取 `connection` 的那个 Context」上：

```js
// dsh-client-connection
get rpc() { const owner = this.ctx; return { handle: (ch, h) => this.register(owner, ch, h) } }
register(owner, channel, handler) { ... return owner.effect(() => owner.webServer.register(route), ...) }
```

内置 PPT 插件直接 `ctx.connection.rpc.handle(...)`，那个 Context 没有 `webServer`，
于是抛 `cannot get property "webServer" without inject`，**整棵 plugin tree 加载失败**。
桌面端的表现是：web profile 起不来 → 插件恢复 → 安全模式 → 再重启，每次冷启动空转约 90 秒。

注意：只把 `"webServer"` 加进插件的 `inject` 数组**不管用**（实测 fiber.inject 和 store 里
都有它，仍然报同样的错），因为出问题的不是插件自己的 Context。正确写法是把注册放进
scoped inject——这也正是同一个包里 `registerPreviewAssets` 已经在用的模式：

```js
ctx.inject(["webServer"], (webCtx) => {
  webCtx.connection.rpc.handle("/dsh-ppt", pptRpc(service), { authority: "trusted-host" });
  webCtx.connection.rpc.handle("/kimi-ppt", pptRpc(service), { authority: "trusted-host" });
});
```

顶层 `inject` 保持不变（不把 `webServer` 列为必需），这样没有 web server 的 profile 里
插件的工具半边照常可用，只是不注册 RPC 通道。

`test/ppt-activation.test.mjs` 与 `test/ppt-validation.test.mjs` 的假 host 需要补上
`effect` / `webServer` 两个成员，否则 scoped 回调不会执行、RPC 通道注册不上。

实测：干净 DSH_HOME 下用 Desktop 的完整启动参数引导 **web profile（含 PPT）**，
两次冷启动分别 **5s / 4s** 就绪，`without inject` 失败数为 0。

> 同一个 0.1.5 严格校验也打中了第三方插件 `dsh-plugin-width-slider`（同样的
> `webServer` 报错）。那个不是我们的代码，需要插件作者跟进，或用户先禁用它。

## 七、遗留问题


- 中间版本 `0.1.3-alpha.2` / `0.1.5-alpha.1` / `0.1.5-alpha.2` 未逐版比对，只做了两端对比。
  session 日志的磁盘格式如有迁移步骤需另行确认。
- 尚未做真机 Electron 冷启动回归（5 个 desktop 插件镜像、无 plugin-recovery UI）。
- 真机日志里看到用户 profile 的第三方插件 `dsh-usage-stats` 在 0.1.5 下报
  `invalid unit name 'usage-stats-aliases'`（`dsh-storage-json` 收紧了 unit 名校验），
  以及 `dsh-better-sidebar` peer 校验失败导致 generation 迁移被冻结。这两条是
  **第三方插件与 0.1.5 的兼容问题**，不属于本次改动，但会影响真机验证，需单独跟进。
- PPT bundle 是在现有 tarball 上做的定点修改后 `npm pack` 重打，没有跑完整的
  `npm run ppt:build`（会重新截图 16 套模板）。建议在合并前跑一次完整重建对齐产物。
