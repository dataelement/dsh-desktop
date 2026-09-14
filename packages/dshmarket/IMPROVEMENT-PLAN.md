# dshmarket（DSH 插件市场）可落地改进方案

> 版本：v1.0　|　对象：dshmarket 插件（仓库 `dsh-market`，npm 名 `dshmarket`）
> 依据：针对 `src/routes.ts`（编译产物 `lib/routes.js`）、`client/client.js`、`src/registry.ts` + `data/registry-snapshot.json`、`scripts/preflight.mjs`、宿主 `dsh plugin` CLI 的审计。

---

## 0. 审计基线（现状盘点，防止"重复造轮子"）

先说明现状里**已经有**的能力，本方案只补缺口：

| 能力 | 现状位置 | 现状 | 缺口 |
|---|---|---|---|
| 安装执行 | `src/routes.ts` `/dsh-market/install` | 走 `dsh plugin add`，目标 = `entry.npm` 或 `github:repo` | 无 monorepo 子包/subpath 支持；无目标存在性与 `dsh.bundle` 前置校验 |
| 装后生效 | `src/hot.ts` hotMount + `/install` 返回 `hot` 布尔 | 纯 insert patch 可热挂 | 不校验是否真正进入 `dsh.profile.bundles`；失败原因不区分，"重启后生效"一刀切 |
| 更新 | `/dsh-market/update` re-add `name@latest` / `github:repo` | 只看 exitCode | 无 before/after 版本对比；`minimumReleaseAge` 导致的"假更新"无感知 |
| 进度 | `/dsh-market/status` 轮询 lastLine + `parseProgressPct`（client.js） | 已有进度条 + 取消按钮 | 依赖 pnpm 非 TTY 聚合行，CI 下常不吐 → 长时间"安装中…"，无阶段/包名 |
| 错误呈现 | client.js `installError` 单行 + 页头"导出日志"链接 | 有日志导出（`/dsh-market/logs`，脱敏） | stderr 尾部 600 字符一坨，无错误码/关键行解析，无错误旁的导出按钮 |
| 构建脚本 | 无（宿主 CLI 只在 git 安装失败时打印一行提示，见 `dsh` 的 `lib/plugin-*.js`：提示把 pnpm 打印的 key 写入 `<profileDir>/pnpm-workspace.yaml` 的 `allowBuilds`） | — | UI 无"批准构建脚本并重试"入口 |
| 目录数据 | `data/registry-snapshot.json`（237 条）+ `src/registry.ts`（TTL 1h + 快照回退） | 字段：name/owner/url/category/description/npm/stars/install/added | 无 subpath/package 映射；npm 名只做格式校验不做存在性校验；无目录过期提示与手动刷新 |

**关键宿主事实**（方案依赖这些真实机制）：
- profile 目录 = `$DSH_HOME/profiles/<name>`，内含 `package.json`（依赖 + manifest `dsh.profile.bundles`）与 `pnpm-workspace.yaml`（可写构建放行配置）。
- `dsh plugin <args>` 是 pnpm 薄转发器：在 profile 目录跑 `pnpm <args>`，成功后按"是否声明 `dsh.bundle`"把依赖 reconcile 进 `dsh.profile.bundles`；无 `dsh.bundle` 的依赖只警告、不进 bundles（装成普通依赖）。
- 因此"装完是否生效"的真值就是：**包名是否出现在 `<profileDir>/package.json` 的 `dsh.profile.bundles` 里**。
- `--reporter=ndjson` 是 pnpm 原生选项，可拿到结构化进度事件（`progress` / `fetchingProgress`），pnpm 官方 issue 有跟踪记录。

**改动位置约定**：源码在 `src/*.ts`，构建产物为 `lib/*.js`（下文写"src/routes.ts（→ lib/routes.js）"指同一处）；`client/client.js` 是**无构建步骤**的手写 CJS bundle（`scripts/preflight.mjs` 校验其 loader id），新组件一律以内联子组件实现，不引入新构建链。

---

## 1. 优先级总览

| 编号 | 改进项 | 优先级 | 改动位置 | 一句话价值 |
|---|---|---|---|---|
| P0-1 | 安装目标解析：monorepo 感知 + 安装前校验 | **P0** | registry schema + `src/routes.ts` + client | 消灭"装错目标/装了个不生效的东西" |
| P0-2 | 安装后验证与"已安装但未生效（原因）" | **P0** | 新 `src/verify.ts` + 三处路由 + client | 装完立即知道生效没有、为什么 |
| P0-3 | 更新版本校验（含 minimumReleaseAge 说明与一键处理） | **P0** | `/update` 路由 + client | 消灭"假更新"事故 |
| P0-4 | 构建脚本放行 UI（allowBuilds + 一键重试） | **P0** | 新路由 + 新对话框组件 | 最常见的首装失败变成一键解决 |
| P1-5 | 错误呈现：stderr 关键行 + 错误旁导出日志 | **P1** | `src/diagnose.ts` + `ErrorPanel` 组件 | 报错可看懂、可复制、可提交 |
| P1-6 | 进度/取消：真实阶段进度（ndjson） | **P1** | `runDshPlugin` + `/status` + 进度条 | 安装过程透明、可安全取消 |
| P1-7 | 安装目标锁定 commit（可复现安装） | **P1** | `resolveTarget` + `/install` | 可复现、更新有明确的 commit diff |
| P1-8 | 目录数据治理（schema 校验、过期提示、刷新） | **P1** | `scripts/preflight.mjs` + 新校验脚本 + client | 目录可信，坏条目不上架 |
| P1-9 | 结构化诊断与操作建议（错误分类服务） | **P1** | 新 `src/diagnose.ts` | 每类错误给一个可执行动作 |
| P2-10 | 目标 profile 选择 | **P2** | 新路由 + 下拉组件 | 终端类插件装对地方 |
| P2-11 | 安装台账（journal） | **P2** | `src/log.ts` 扩展 + 新路由 | 可审计、可回溯 |
| P2-12 | 断线恢复与幂等增强 | **P2** | 路由 + client | 刷新/断网不丢状态 |
| P2-13 | 打磨：无障碍、i18n、性能 | **P2** | client | 细节体验 |

---

# P0 —— 必须修（直接造成错误结果或死胡同）

## P0-1 安装目标解析：monorepo 感知 + 安装前校验

**事故映射**：目录中相当一部分条目是"仓库根不可装"的真实形态——文档/聚合仓库根无 `package.json`，真包在 `packages/xxx` 子目录；或子包已发布到 npm 但目录没填 `npm` 字段。当前 `/install` 只做 `entry.npm` 或 `github:repo` 二选一（`src/routes.ts`），monorepo 仓库会装错目标或装失败；`dsh plugin` 对无 `dsh.bundle` 的依赖只打一行警告就把它写进 dependencies（"已安装"但没有生效，还污染 profile）。没有任何"目标包存在且声明 `dsh.bundle`"的前置校验，`NPM_NAME_RE` 只校验名字格式。

**改动位置**：
- 目录数据 `data/registry-snapshot.json` + `src/registry.ts` 的 `RegistryPlugin` 接口（schema 扩展）；
- `src/routes.ts`（→ `lib/routes.js`）`/dsh-market/install` 与新增 `resolveTarget(entry)` / `preflightTarget(target)`；
- `client/client.js`：确认弹窗展示解析后的目标，卡片加"monorepo 子包"徽标，`isInstalled` 扩展匹配；
- `scripts/preflight.mjs`：registry 条目合法性校验（发布前 gate）。

**具体做法**：
1. **registry schema 扩展**（可选字段，向后兼容）：
   - `subpath?: string` — 仓库内包目录（如 `packages/dsh-foo`），语义 = "仓库根不可装，真包在此子目录"；
   - `package?: string` — 该子包在 npm 上的发布名（若已发布，优先走 npm）；
   - `npm?: string` — 保留，整包 npm 名，最高优先级；
   - `uninstallable?: boolean` — 显式标记"该仓库无 DSH 插件可装"（纯文档站）。
2. **目标解析顺序** `resolveTarget(entry)`：
   a. `entry.npm` 合法 → `npm:<name>`（registry tarball，最小下载量，优先）；
   b. 否则 `entry.package` 合法 → `npm:<name>`；
   c. 否则 `entry.subpath` 存在 → git 子目录语法 `github:owner/repo#<sha>` + 子目录（pnpm ≥9 支持 git URL 子目录，见 [pnpm PR #7487](https://github.com/pnpm/pnpm/pull/7487) 与 [讨论 #8148](https://github.com/orgs/pnpm/discussions/8148)；实施时以本地 pnpm 版本实测语法并做版本探测，语法不兼容则**报可操作错误**而不是静默装根包）；
   d. 否则（仓库根可装）→ `github:owner/repo#<sha>`。
3. **安装前校验** `preflightTarget`（4s 超时 + 内存缓存，失败降级不阻塞）：
   - npm 目标：`pnpm view <name> version dsh.bundle`（或 npm registry metadata `versions[latest].dsh`）→ 包不存在 → **拦截**，报"目标包不存在/目录 npm 字段过期"；存在但无 `dsh.bundle` → 黄色告警"该包未声明 dsh.bundle，装入后不会成为 profile 层（可能仅客户端插件）"，允许继续但明确后果；
   - git 目标：raw.githubusercontent.com 拉 `<subpath>/package.json` 校验存在 + `dsh.bundle`；
   - 校验结果随 install 响应返回 `preflight: { exists, bundle, reason }`，确认弹窗就展示。
4. **客户端**：确认弹窗显示"将安装：`@scope/dsh-foo`（来源：npm 包）"或"来源：GitHub 子目录 packages/dsh-foo"；`isInstalled` 增加按 `package`/`subpath` 解析出的包名匹配；`uninstallable` 条目置灰并显示"该仓库不包含可安装的 DSH 插件"。

**验收标准**：
- 构造 3 条测试目录数据（monorepo 子目录、子包已发布 npm、纯文档仓库）：前两者装到正确的子包并进入 bundles；第三者前端置灰不可装。
- 安装不存在的 npm 名或未声明 `dsh.bundle` 的包：安装前即拦截/告警，不进入 1–3 分钟的 pnpm 流程。
- `isInstalled` 能识别 subpath 条目对应的已安装包；确认弹窗展示解析后的真实目标。

**用户收益**：不再出现"点了安装、等半天、装了个不对的东西/什么都没装成"；装之前就知道装的是什么、装进去会不会生效。

---

## P0-2 安装后验证与"已安装但未生效（原因）"提示

**事故映射**：当前 install 返回 `ok + hot` 布尔，hotMount 只在 patch 是纯 `id/name` insert 时成功（`src/hot.ts` 的 `parseSimplePatch`），失败统一落进"重启后生效"横幅。但用户无法区分四种结局：patch 含 config/disable 行（热挂不支持）、CLI 认为无 `dsh.bundle`（装成了普通依赖）、纯客户端插件（只有 `dsh.client` 没有 bundle patch）、真装坏了。对 web profile，"重启后生效"= 整个 dsh 重启，代价大，用户有权知道为什么不能热加载。

**改动位置**：
- 新 `src/verify.ts`：`verifyActivation(profile, name)`；
- `src/routes.ts`：install/uninstall/update 三处响应统一带 `activation`；hotMount 失败路径返回具体原因；
- `client/client.js`：结果呈现改三态 + 原因展开。

**具体做法**：
1. `verifyActivation(profile, name)` 输出 `{ state: 'live' | 'restart' | 'inert' | 'broken', reasons: string[] }`：
   - 读 `<profileDir>/package.json` 的 `dsh.profile.bundles`（CLI reconcile 后的真值）→ 是否含 name；
   - 读 `node_modules/<name>/package.json` 的 `dsh.bundle` / `dsh.client` / `main`；
   - 读 `cordis.patch.yml` 并复用 `parseSimplePatch` 判定可否热挂；
   - 汇总原因（示例："patch 含配置行，热挂载仅支持纯 insert"、"未声明 dsh.bundle，已作为普通依赖安装"、"仅客户端插件，无 bundle patch"）。
2. 三处操作响应带 `activation`；hotMount 的 false 路径把"为什么不行"（Include 不可用 / patch 复杂 / 无 patch）传出来而不是只返回布尔。
3. 客户端四态呈现（替换现在的"重启后生效"一刀切）：
   - 🟢 **已生效（热加载）**；
   - 🟠 **已安装，重启后生效** —— 原因：xxx；
   - ⚪ **已安装但未成为 profile 层** —— 原因：该包未声明 dsh.bundle（可能仅客户端插件），附 README 链接；
   - 🔴 **安装完成但校验失败** —— 附"导出日志"。
4. `inert` 状态引导：链接包 README / 提示适合的 profile（与现有 terminal 警告合并为统一的"目标适配"提示）。

**验收标准**：
- 用三个测试包（纯 insert patch / 含 config 的 patch / 无 dsh.bundle 的库）安装，UI 分别展示三种明确状态与原因，不再统一"重启后生效"。
- `verifyActivation` 与 CLI reconcile 结果一致（读同一 manifest 字段），不存在"UI 说生效但 bundles 里没有"。

**用户收益**：装完立即知道"到底生效没有、为什么、还要做什么"；"装上了但没生效"从玄学变成有因可查，避免无谓重启。

---

## P0-3 更新版本校验（含 minimumReleaseAge 说明与一键处理）

**事故映射**：`/update` re-add 后只看 `exitCode === 0`，客户端就显示"✓ 已更新，重启后生效"。但 pnpm 新版本默认带发布年龄门槛 `minimumReleaseAge`（新发布版本会被解析器跳过；不同 pnpm 版本默认值不同——近版默认约 24h，且存在"新 major 被跳过不回退"的已知问题，见 [pnpm #10100](https://github.com/pnpm/pnpm/issues/10100)）；github 目标更新是 HEAD 重解析，上游无新提交时版本（commit）也不变。结果：**点了更新、显示成功、版本号没动**，用户以为功能坏了。

**改动位置**：
- `src/routes.ts` `/dsh-market/update`（+ 复用小工具 `readInstalledVersion`、`readLockCommits`）；
- `client/client.js`：更新结果面板；
- 可选新路由 `/dsh-market/relax-minimum-release-age`（一键处理）。

**具体做法**：
1. **before/after 对比**：update 前 `before = readInstalledVersion(name)`（github 目标读 lockfile commit）；成功后 `after`；`before === after` → 响应 `{ noChange: true, before, after }`，且客户端**绝不**显示"已更新"。
2. **原因判定与提示**：
   - npm 目标：查 npm registry 最新版 vs 当前版。存在更高版本 → 说明大概率被 `minimumReleaseAge` 挡住：展示"最新版本 vX.Y.Z（发布于 N 小时前）未在 npm 上新发布前被 pnpm 接受，受发布年龄门槛限制"，并读当前门槛值（`pnpm config get minimum-release-age` / workspace 配置）一起展示；给"**放宽门槛并重试**"按钮 → 新路由在 `<profileDir>/pnpm-workspace.yaml` 写入 `minimumReleaseAge: 0`（保留原有内容）后重跑 update。不存在更高版本 → "已是最新版本 vX"。
   - github 目标：`readLockCommits` 的 HEAD commit 对比 → 无新提交时明确"上游无新提交（HEAD 仍为 abc1234）"。
3. **更新提示前置**：`/updates` 列表在"npm 存在更高版本但会被策略跳过"时，徽标显示"有新版本（受发布年龄门槛限制）"，而不是简单显示"已是最新"——让用户在点按钮之前就知道。

**验收标准**：
- 在设置 `minimumReleaseAge` 的 profile 中触发"有更高版本但被跳过"的更新：UI 明确显示版本未变 + 策略原因；点"放宽门槛并重试"后版本真正变化。
- 无新版本时更新后显示"已是最新（vX）"，绝不出现"✓ 已更新"。
- github 目标无新提交时显示 commit 对比而不是"更新成功"。

**用户收益**：更新按钮结果可预期、可解释；"假更新"事故消失；被发布年龄策略挡住的用户有一键选项，不必去翻 pnpm 文档。

---

## P0-4 构建脚本放行 UI（allowBuilds + 一键重试）

**事故映射**：pnpm v10+ 默认不执行依赖构建脚本；含原生依赖/`prepare` 脚本的插件（esbuild、node-gyp、git 安装包）**首次安装必失败**。stderr 里有 "Ignored build scripts: esbuild" 字样，但 UI 只显示一坨尾部文本；宿主 CLI 也只在 git 安装失败时打印一行文本提示（"add the exact key pnpm printed above under allowBuilds in `<profileDir>/pnpm-workspace.yaml`"）——用户要么看不懂，要么得手动编辑 yaml。

**改动位置**：
- `src/routes.ts`：新增 `/dsh-market/approve-builds` 路由 + stderr 解析函数；
- `client/client.js`：新内联组件 `BuildApprovalDialog`；
- 与 P1-9 的 `src/diagnose.ts` 共用解析。

**具体做法**：
1. **解析**（新 `parsePnpmFailure(stderr)`）：正则捕获 `Ignored build scripts: (\S+(?:, \S+)*)` / `approve-builds` 字样 / `ERR_PNPM_*` 错误码 → `{ code, blockedBuilds: string[], hint }`。
2. **对话框**：install 失败且 `blockedBuilds` 非空 → 弹出清单（`esbuild@0.25.x`、`node-gyp` 等）+ 说明"pnpm 默认禁止第三方构建脚本执行，这些包需批准后才会运行其构建"，两个按钮：
   - **"批准并重试"**：POST `/dsh-market/approve-builds`（body 携带原 install 的 url 或解析后的包清单）→ 服务端读-合并-写 `<profileDir>/pnpm-workspace.yaml` 的 `allowBuilds`（pnpm ≥11 键名；pnpm 10 为 `onlyBuiltDependencies`——按 `pnpm --version` 主版本选键，**保留 yaml 原有内容不覆盖**）→ 自动重发原 install 请求；
   - "仅导出日志"。
3. **安全**：写入的包名白名单校验（仅允许"目录条目解析出的目标包 + pnpm 报告的被拦包名"集合），拒绝任意字符串；写文件与安装日志走 `log.ts` 事件流（脱敏）。

**验收标准**：
- 安装一个带 esbuild/原生依赖的测试插件：失败后弹出清单对话框；点"批准并重试"后 `pnpm-workspace.yaml` 出现对应 allowBuilds/onlyBuiltDependencies 条目（原有内容保留），重试成功并进入生效提示。
- pnpm 10 与 11 两种环境下写入正确的键名并再次安装通过。

**用户收益**：最常见的第一安装失败从"看不懂的报错"变成"一个按钮解决"，无需手写 yaml；与 P1-5 的错误面板共用解析，一处识别多处受益。

---

# P1 —— 强烈建议

## P1-5 错误呈现：stderr 关键行 + 错误旁导出日志

**事故映射**：当前错误 = `error || stderr || stdout` 尾部 600 字符塞进一行（client.js `installError`）；stderr 在路由里只留 64KB 尾部；"导出日志"入口只在页头小字链接，出错现场没有。

**改动位置**：
- `src/routes.ts`：`runDshPlugin` 增加 `lastErrorLines`（stderr 尾部 ~40 行）与 `diagnosis`；输出缓冲上限提高；
- 新 `src/diagnose.ts`（错误分类，与 P1-9 合并实现）；
- `client/client.js`：新内联组件 `ErrorPanel` 替代单行错误文本。

**具体做法**：
1. **路由侧**：失败时 `diagnosis = { code, summary, keyLines: string[], blockedBuilds?, actionType? }`；stdout/stderr 环形缓冲扩大到 256KB 尾部；完整输出可经 `/dsh-market/logs` 导出（复用 `log.ts` 脱敏：路径→`~`、密钥掩码）。
2. **ErrorPanel**：
   - 首行：错误码 + 一句话结论（"解析依赖失败 / 网络超时 / 构建脚本被拦 / 目标包不存在"）；
   - 折叠的"关键行"块（≤10 行）；
   - "完整输出"可展开（stdout/stderr 尾部原文）；
   - 按钮组：**复制**、**导出日志**（下载 `/dsh-market/logs`，导出文件头带 profile、目标、pnpm 版本、本次操作参数）。
3. **i18n**：新增文案进 zh/en 词典；导出文件头沿用 `log.ts` 的 `exportLogs` 格式扩展。

**验收标准**：
- 人为制造三类失败（断网、包不存在、构建脚本被拦），UI 分别显示对应错误码 + 结论 + 关键行，一键复制/导出包含上下文的日志。
- 导出内容不含明文密钥与绝对 home 路径（沿用现有 sanitize 并加回归用例）。

**用户收益**：报错能看懂、能复现、能一键提交给维护者；支持成本显著下降。

---

## P1-6 进度/取消：真实阶段进度（ndjson）

**事故映射**：现有进度轮询 `/status` 的 `lastLine` 并解析 pnpm "Progress: resolved..." 聚合行（`parseProgressPct`）；CI 模式下 pnpm 非 TTY 输出往往不吐该行 → 用户长时间只看到"安装中…"，不知道是卡住还是在进行；阶段（解析/下载/链接/克隆）不可见。取消已有（killTree）但无"正在取消"中间态，取消后依赖可能半写，状态回执简单。

**改动位置**：
- `src/routes.ts`：`runDshPlugin` 追加 `--reporter=ndjson`（pnpm 原生选项，进度事件见 [pnpm issue #3822](https://github.com/pnpm/pnpm/issues/3822)），`/status` 响应升级；`/cancel` 增加"取消中"态；
- `client/client.js`：进度条升级。

**具体做法**：
1. **结构化进度**：以 `--reporter=ndjson` 追加到 pnpm 参数（`dsh plugin add <target> --reporter=ndjson`，pnpm 全局选项），解析事件流维护内存进度：
   - `progress` 事件 → `{ phase: 'resolving' | 'downloading' | 'linking', resolved, resolvedTotal }`；
   - `fetchingProgress` 事件 → 当前下载包名 + 字节进度；
   - 旧 pnpm 无 ndjson 事件 → 回退现有行解析 + 阶段猜测（并记录一条 warn 日志便于升级建议）。
   - 实施前先用 CI 模式实测事件流形态（含失败时的 error 事件），解析器带未知事件容错。
2. **/status 升级**：`{ phase, done, total, currentPackage, seconds, active, cancelled }`（保留 `lastLine` 兼容旧客户端）。
3. **客户端进度条**：阶段徽标（解析依赖 → 下载 → 链接）+ 当前包名 + N/M + 百分比；git 克隆阶段显示"克隆仓库…"。
4. **取消**：点击 → "正在取消…"（disable 防重复）；killTree 后回执 `{ cancelled, partial }`；客户端对比 manifest before/after 展示真实残留状态（"已取消，部分依赖已写入/已回滚"），并清理 sessionStorage 的 pending 标记。

**验收标准**：
- 安装 30+ 依赖的插件：进度条显示 解析/下载/链接 阶段与 N/M，不再长时间"卡在安装中"。
- 下载中途取消：≤3s 内显示取消确认；profile 依赖状态与文件系统一致（无幽灵依赖）。

**用户收益**：安装过程透明可预期；误点或等太久可随时安全取消，取消后果明确。

---

## P1-7 安装目标锁定 commit（可复现安装）

**事故映射**：git 目标当前不锁 commit，重复安装/重建 profile 结果不可复现；"更新"语义模糊（HEAD 移动即算更新）。`readLockCommits` 已能从 lockfile 读出 codeload 的 40 位 sha——锁已隐式存在，只是没写进安装命令。

**改动位置**：`src/routes.ts` 的 `resolveTarget` / `/install`；`/updates` 复用已有 commit 对比。

**具体做法**：
1. install 时先取 `https://api.github.com/repos/<repo>/commits/HEAD`（已有 `fetchJson`，复用 4s 超时 + 缓存），目标写 `github:owner/repo#<sha>`（subpath 场景同样带 sha）。
2. "更新"按钮语义 = "把锁移到最新 HEAD"，更新前后展示 commit 对比（old sha → new sha 前 8 位），与 P0-3 的 noChange 判定共用。

**验收标准**：同一条目装两次，lockfile 中 codeload tarball URL 完全一致；更新按钮前后 commit 明确展示；无新提交时显示"上游无新提交"而非"更新成功"。

**用户收益**：可复现安装；更新有明确的"版本变化"证据；为 P0-3 的 github 分支提供可靠数据。

---

## P1-8 目录数据治理

**事故映射**：目录是手工维护的 snapshot（237 条），`npm` 字段可选且无存在性校验；npm 名过期/拼错会直接装错或装失败；TTL 1h 缓存 + 离线快照没有"目录更新于 X"的提示，前端也无法手动刷新。

**改动位置**：`scripts/preflight.mjs`（发布 gate）、新 `scripts/validate-registry.mjs`（CI/维护）、`src/registry.ts`（force 刷新）、`client/client.js`。

**具体做法**：
1. **preflight 扩展**：每条 entry——`url` 必须 GitHub、`subpath` 无 `..`/绝对路径、`npm`/`package`/`subpath` 互斥约束、`install` 命令与 `resolveTarget` 解析结果一致、name 不重复；`npm run prepack` 已挂钩，顺带生效。
2. **新校验脚本**：对全部条目做轻量探测（npm 条目查 registry metadata；git 条目查 repo 根 `package.json` 是否存在），输出"不可装/待修复"清单，与 snapshot 一起提交。
3. **前端**：展示目录 `updated` 日期 + "目录已刷新（x 分钟前）"；页头加"刷新目录"（GET `/dsh-market/registry?force=1` 绕过 TTL）；`uninstallable`/探测失败的条目置灰并显示原因。

**验收标准**：目录更新流程跑校验零报错；前端可看到更新时间并可手动刷新；失效条目不再出现可点的"安装"按钮。

**用户收益**：目录可信度高，坏条目不会出现在用户面前浪费一次安装时间。

---

## P1-9 结构化诊断与操作建议（错误分类服务）

**事故映射**：错误处理散落在路由与客户端，识别逻辑重复；同一类错误（如构建脚本被拦）在安装、更新两个入口表现不一致。

**改动位置**：新 `src/diagnose.ts`（P1-5 与 P0-4 的共用底座）。

**具体做法**：把 pnpm 常见失败映射到 `{ message, action, actionType }`：

| pnpm 错误形态 | 建议动作 | actionType |
|---|---|---|
| `Ignored build scripts:` | 批准构建脚本 | `approve-builds`（→ P0-4 对话框） |
| `ERR_PNPM_NO_MATCHING_VERSION` / 包不存在 | 目标包不存在，更新目录 | `manual`（附链接） |
| `ERR_PNPM_FETCH_*` / `EAI_AGAIN` / 网络超时 | 重试 / 检查网络 | `retry` |
| 更新后版本未变 + npm 有更高版 | 放宽 minimumReleaseAge | `relax-minimum-release-age`（→ P0-3） |
| git 克隆失败 / 子目录语法不支持 | 手动安装或报告目录条目 | `manual` |
| 未识别错误 | 导出日志反馈 | `export-log`（→ P1-5） |

install/update/uninstall 响应统一带 `diagnosis`；客户端错误面板按 `actionType` 渲染对应按钮。验收：10 类常见错误各有一个可执行建议；未识别错误一律回退"导出日志"。

---

# P2 —— 锦上添花

## P2-10 目标 profile 选择
- **改动位置**：新 `/dsh-market/profiles` 路由 + client 下拉。
- **做法**：install 目前固定 `config.profile`（web）。增加"安装到"下拉（web / headless / 用户已有 profile），terminal 类插件默认提示装到 headless（与现有 `looksTerminal` 合并）；服务端保持安全边界：只允许 curated registry + 本机 profile 白名单。
- **验收**：终端类插件可一键装进 headless profile 并生效。
- **收益**：CLI 类插件有正确去处，不再污染 web profile。

## P2-11 安装台账（journal）
- **改动位置**：`src/log.ts` 扩展（内存事件流 → profile 下 `.dsh-market/journal.jsonl`，脱敏持久化）+ 新只读路由。
- **做法**："已安装"页显示"何时装的、装了什么目标、当时版本"，导出日志附带台账。
- **验收**：重装/更新后台账可查历史版本与时间。
- **收益**：可审计、可回溯，出问题能定位"哪次操作导致的"。

## P2-12 断线恢复与幂等增强
- **改动位置**：`/install` 路由 + client。
- **做法**：已有 sessionStorage pending 恢复（client.js `busyUrl` 恢复）；增强为 install 请求带幂等键（目标+commit），路由对重复请求返回既有结果；轮询恢复时显示"上次安装可能已完成，正在确认…"。
- **验收**：安装中途刷新页面，恢复后状态收敛到真实结果。
- **收益**：刷新/断网不丢状态、不重复安装。

## P2-13 打磨
- **做法**：Esc 关闭弹窗、焦点管理、aria 标签；排序/搜索增强（关键词高亮）；新组件配色沿用现有 CSS 变量（暗色主题自适应）；237 条卡片列表虚拟化（可选）。
- **验收**：键盘可完成"搜索→安装→取消"全流程；暗色主题下无死色块。
- **收益**：体验完整度。

---

## 实施顺序建议

**阶段 A —— 判定与数据层先行（不依赖 UI，立刻提升可信度）**
1. **P0-1 的 registry schema 扩展 + preflight 校验**（纯数据 + `scripts/preflight.mjs`，零 UI 依赖）；
2. **P0-3 的 before/after 版本对比**（纯服务端判定，客户端只改一处文案分支）；
3. **P0-2 的 `verifyActivation`**（新模块，install/update/uninstall 三处挂响应字段）。
> 理由：这三件是"结果正确性"的地基，且**全部是服务端/数据侧改动**，UI 的呈现都是消费它们的判定结果；先做地基，后续 UI 一次成型、不用返工。三者相互独立，可并行分派。

**阶段 B —— 正确性落地（消灭三大事故）**
4. P0-1 目标解析 + 前置校验接入 `/install`（含 git 子目录语法实测）；
5. P0-2 客户端四态呈现；
6. P0-3 客户端 noChange 面板 + "放宽门槛并重试"。
> 理由：这三件直接消灭"装错目标、装完不知道生效没有、假更新"三个最高频事故，先于任何体验优化。

**阶段 C —— 可操作性（让失败可自助解决）**
7. **P1-9 diagnosis 服务**（P0-4 与 P1-5 的共同底座，先于两者）；
8. **P0-4 构建脚本放行对话框**（依赖 7 的解析 + 需要新路由）；
9. **P1-5 ErrorPanel**（依赖 7）。
> 理由：构建脚本被拦是最常见首装失败，但"一键批准"必须建立在可靠的错误解析上，所以 diagnosis 先行；ErrorPanel 复用同一解析。

**阶段 D —— 过程透明**
10. **P1-6 ndjson 进度/取消**（需要真实安装回归验证事件流）；
11. **P1-7 commit 锁定**（改安装参数，必须与 10 一起回归主安装链路）。
> 理由：两者都触碰安装主链路，一起做可共享一次完整的安装回归测试。

**阶段 E —— 治理与打磨**
12. P1-8 目录校验脚本、P2-10/11/12/13 各项。
> 理由：全部是增量优化，不阻塞主链路；放在最后避免与主链路改动互相干扰。

**贯穿原则**：每个阶段结束都跑一遍主链路回归（安装真实插件 → 校验 bundles → 热挂/重启 → 更新 → 卸载），保持 `scripts/preflight.mjs` 与 `npm run check` 绿；客户端改动坚持内联子组件、不引入构建链（避免破坏 `preflight` 对 loader id 的校验）；所有新增文案进 zh/en 双词典。

---

## 事实参考
- pnpm git 依赖子目录支持：[pnpm/pnpm#7487](https://github.com/pnpm/pnpm/pull/7487)、[pnpm Discussion #8148](https://github.com/orgs/pnpm/discussions/8148)、[pnpm 支持包来源文档](https://www.pnpm.cn/id/package-sources)
- `minimumReleaseAge` 发布年龄门槛与已知问题：[pnpm/pnpm#10100](https://github.com/pnpm/pnpm/issues/10100)、[pnpm CHANGELOG](https://github.com/pnpm/pnpm/blob/a751c7f2/pnpm/CHANGELOG.md?plain=1#L37-L45)
- 构建脚本放行字段演进（`onlyBuiltDependencies` → `allowBuilds`）：[pnpm/pnpm#11209](https://github.com/pnpm/pnpm/pull/11209)、[pnpm/pnpm#10235](https://github.com/pnpm/pnpm/issues/10235)、[pnpm v10→v11 迁移](https://pnpm.io/migration)
- ndjson 进度事件：[pnpm/pnpm#3822](https://github.com/pnpm/pnpm/issues/3822)、[pnpm/pnpm#5380](https://github.com/pnpm/pnpm/issues/5380)
