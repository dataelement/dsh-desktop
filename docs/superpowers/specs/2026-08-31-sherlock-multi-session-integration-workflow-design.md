# Sherlock 多 Session 功能集成与版本治理设计

## 状态

本设计已于 2026-08-31 在对话中获得方向批准，等待用户完成书面审阅后进入实现计划。

## 背景与问题

Sherlock 的多个 Codex session 可能运行在根目录 checkout、不同 Git worktree，或同一
目录的不同时间点。每个目录都能独立生成 `dist-notarized/.../Sherlock.app`，而现有
`script/build_and_run.sh --verify` 会先停止所有名为 `Sherlock` 或 `Sherlock Dev` 的
进程，再从脚本所在目录构建并启动同一正式身份 `com.evanarts.sherlock`。因此，从旧
worktree 启动测试版会替换另一个 session 刚构建的客户端；用户看到的功能回退不一定
表示 Git 合并丢失，也可能只是运行了不同提交的产物。

当前未执行新 fetch 的本地状态显示 `main` 与上游 `origin/main` 双向分叉，所以本流程
把本地 `main` 定义为日常功能集成的唯一基线。不得在功能集成过程中自动 `pull`、
rebase 到远端或 force-push；上游同步和远端历史整理属于独立任务。

## 目标

- 每个功能 session 都有隔离、可追溯、可完整合并的 Git 边界。
- 未提交修改不得成为 session 之间的交接载体。
- 共享身份的 Sherlock 客户端始终来自一个明确的集成入口。
- 两个 session 不能同时构建或替换共享客户端。
- 用户能在真实客户端中确认当前分支、提交、构建时间和集成功能清单。
- 功能合并、客户端验收、正式版本发布保持为相互独立的门槛。
- 合并失败或验收失败时保留功能分支和 worktree，不丢失可恢复状态。

## 非目标

- 本设计不整理当前 `origin/main` 与本地 `main` 的分叉历史。
- 不改变正式版本号递增、Apple 公证、Cloudflare 发布或更新器协议。
- 不要求日常功能开发运行全量测试。
- 不自动推送分支、标签或创建远端 Pull Request。
- 不自动删除分支、worktree、未跟踪文件或构建产物。
- 不允许多个预览客户端共享可写的正式用户数据目录。

## 核心角色与状态

### 本地 `main`

`main` 只包含已经完成本地集成和用户验收的提交。功能 session 不直接修改 `main`，
正式发布仍只能从干净的本地 `main` 执行。

### 功能 worktree

每个功能使用独立分支和 worktree，分支名采用
`codex/feat/<ascii-slug>-<YYYYMMDD>`。分支从创建时的本地 `main` 提交派生，一个
worktree 只服务一个功能。Codex 原生 worktree 能力优先于手写 `git worktree add`。

### 集成批次

需要同时验收一个或多个功能时，由唯一的“Sherlock 集成 session”从当前本地 `main`
创建短期分支 `codex/integration/<YYYYMMDD>-<NN>`。它完整合并功能分支、构建共享
客户端，并在验收通过后以 fast-forward 方式推进 `main`。

### 共享客户端

进程名 `Sherlock`、Bundle ID `com.evanarts.sherlock`、正式用户数据目录和本地集成
输出共同组成共享测试身份。只有 `main` 或 `codex/integration/*` 的干净工作区可以
构建和启动这个身份。共享本地包使用独立 `local-integration` channel，关闭自动和手动
在线更新，避免公开 feed 把正在验收的本地提交替换掉；正式发布仍使用既有
`notarized` channel。

### 功能预览客户端

功能 session 如确需在合并前做独立 UI 预览，必须使用与功能 slug 绑定的进程名、
Bundle ID、输出目录和用户数据目录。预览客户端不能停止共享 `Sherlock`，不能读取或
写入正式用户数据，也不能被描述为集成测试版或正式发布候选。

### 源码清洁

“源码干净”不是简单要求 `git status` 完全无输出。它要求：没有 staged 或 unstaged 的
tracked 改动，没有位于源码、配置、测试、文档和脚本目录中的未跟踪文件；只允许
`dist-*`、`output/` 等被明确列入代码化白名单的生成物。未跟踪路径若类型不明则按源码
处理并拒绝。被 Git 忽略的依赖和补丁应用状态由独立 dependency digest 约束。

## 不可破坏的约束

1. 一个功能 session 对应一个功能分支和一个 worktree。
2. 交接必须指向 Git 提交；存在未提交源码或仅存在于未跟踪文件中的功能不可交接。
3. 功能分支合并前不得删除；合并后也要保留到真实客户端验收通过。
4. 共享客户端只由集成 session 从允许的分支启动。
5. 每个共享或预览产物必须携带可见、可机读的构建来源。
6. 合并冲突必须停止并显式解决，不自动选择 `ours` 或 `theirs`。
7. 正式版本号只在正式发布流程中改变；本地批次使用构建来源标识，不伪造新版本号。
8. 本设计新增的 preflight、集成和本地预览脚本只操作本地 Git 状态，不 pull、不 push、
   不 force、不删除；既有正式发布脚本继续遵守正式发布手册的明确授权。
9. 共享构建必须持有覆盖全部 worktree 的互斥锁，且来源门禁失败时不能停止当前客户端。

## 功能 Session 生命周期

### 1. 创建

功能 session 开始前记录本地 `main` 的完整提交哈希，并从该提交创建 worktree。若
现有 worktree 早于本治理规则，必须先完成合并、重建或明确放弃；不得继续用缺少保护
脚本的旧 worktree 启动共享客户端。

创建后的首个检查包括：

- 当前目录确实是 linked worktree；
- 当前分支符合 `codex/feat/*`；
- 基准提交是当时的本地 `main`；
- 没有 staged/unstaged 源码或未跟踪源码；允许的构建输出不参与源码清洁判断；
- 只运行与功能直接相关的基线检查。

### 2. 开发

每个功能 session 只能修改自身范围内的文件。每个可独立解释并完成聚焦验证的修改都
创建中文本地提交；不得把其他 session 的未确认改动混入提交。功能实现完成后，session
再次运行直接相关的测试、类型检查和必要的真实 UI 验证，但不运行全量测试。

### 3. 交接

完成的 session 输出结构化“待合并卡片”，至少包含：

```text
功能：<用户可理解的功能名>
分支：codex/feat/<slug>-<date>
基准提交：<full SHA>
最终提交：<full SHA>
提交范围：<base>..<tip>
提交列表：<ordered full SHAs>
涉及文件：<machine-readable name-status list>
聚焦检查：<命令、结果和绑定的 tip SHA>
真实界面验证：<结果或不适用原因>
已知风险或冲突：<无或具体说明>
```

交接前置条件为功能 worktree 源码干净，且 `基准提交..最终提交` 中没有未声明的其他
功能提交。分支 ref 必须仍精确指向卡片声明的最终提交；若 ref 后续前进，原卡片失效并
重新生成。卡片可以由只读 preflight 脚本生成，但不能替代 Git 提交。

## 集成生命周期

### 1. 建立批次

集成 session 从当前本地 `main` 创建一个新的短期集成分支和独立 worktree，并记录：

- 批次 ID；
- `main` 基准提交；
- 计划集成的功能分支与最终提交；
- 每项功能的用户验收要点。

同一时间只能有一个拥有共享客户端启动权的集成批次。

批次清单保存为
`config/sherlock-integration-batches/<YYYYMMDD>-<NN>.json`，并作为集成分支的首个
提交进入 Git。清单包含 schema、批次 ID、`main` 基准、功能分支、声明的最终提交和
验收要点；合并完成后追加实际合并提交和验证摘要。清单不得在构建时临时推断或静默
更新。`main` 直接构建时批次可以为空，只记录当前 `main` 提交。

批次建立时还要在 Git common directory 中创建持久的 active-batch lease。lease 包含
批次 ID、分支、`main` 基准、当前集成 tip 和随机 owner token，从建立批次持续到用户
验收后推进 `main`，或用户明确取消批次。lease 存在时：

- 只有 owner token 匹配的集成执行器可以随着新提交追加更新当前 tip；
- 只有该 lease 声明的精确分支和 tip 可以构建共享客户端；
- `main` 和其他集成分支不能顺序替换正在验收的客户端；
- 普通构建互斥锁仍只保护一次构建过程，不能替代 active-batch lease；
- 同名批次或分支已存在但 base、manifest 或 lease 不完全一致时必须拒绝，不能 reset、
  rebase、复用或移动已有 ref。

### 2. 功能分支预检

对每个功能分支执行只读检查：

- 分支存在且最终提交仍可达；
- 分支 ref 精确等于卡片与批次清单声明的最终提交；
- 对应 worktree 没有未提交源码；
- 声明的 base 同时是 feature tip 和批次 `main` 基准的祖先；
- `git log <declared-base>..<declared-tip>` 与交接卡片的精确提交列表一致；
- `git diff --name-status <declared-base>...<declared-tip>` 与卡片的机器可读文件列表一致；
- 分支尚未被完整合并，或明确报告为幂等跳过；
- 相关聚焦检查记录绑定同一个 declared tip SHA。

若功能分支包含未声明历史、找不到提交、工作区脏或基准关系异常，预检停止，不修改
集成分支。

### 3. 合并

功能分支按依赖顺序使用 `git merge --no-ff --no-commit` 完整合并，保留功能边界和
来源。每个功能进入索引和工作树后先运行其聚焦检查，通过才创建中文合并提交。检查
失败且尚未提交时使用 `git merge --abort` 恢复批次原状态。发生冲突时停止在当前集成
分支，列出冲突文件和两侧语义；禁止整体采用 `ours` 或 `theirs`。解决后重新运行受
影响检查，再创建明确的中文合并提交。

如果集成期间 `main` 前进，先把新的 `main` 合入集成分支并重新执行受影响检查，确保
最新 `main` 仍是集成分支的祖先；不得把旧批次直接覆盖到新的 `main`。

### 4. 共享客户端验收

所有计划功能合并后，集成 session：

1. 检查分支类型、工作区清洁度和批次清单；
2. 运行本次功能覆盖的聚焦测试及 `npm run typecheck`；
3. 使用 `./script/build_and_run.sh --verify` 构建共享客户端；
4. 使用包校验脚本验证最终 App、签名和内置 Node；
5. 读取真实 Sherlock 窗口，按批次清单逐项确认功能和回归护栏；
6. 保持客户端打开供用户测试。

用户明确验收前，集成分支不能推进 `main`，功能分支和 worktree 不能清理。
用户验收绑定客户端 provenance 中的精确 integration tip。验收后只要集成分支、批次
清单、依赖摘要或 `main` 发生任何变化，原验收立即失效；必须重新生成来源、构建、读取
真实界面并再次获得验收。

### 5. 推进 `main`

验收通过后，集成执行器转到仓库根目录的 canonical `main` worktree，确认该 worktree
没有未提交源码、分支确实为 `main`，且 HEAD 仍等于批次记录的预期 `main` SHA。随后
确认当前 `main` 是集成分支的祖先，并确认每个声明的功能最终提交都是集成分支祖先，
再执行 `git merge --ff-only codex/integration/<batch>`。推进后逐个确认功能最终提交已经
成为 `main` 祖先，在 `main` 上运行最小必要的集成确认，并记录批次 ID、集成提交、功能
提交和验证结果，最后释放 active-batch lease。

只有当 `main` 已包含全部功能最终提交、相应 worktree 干净且用户不再需要迭代时，才
允许普通删除功能分支和移除 worktree。任何包含未提交或未跟踪文件的 worktree 都必须
保留并报告，禁止强制移除。

## 构建来源与客户端可见性

### 来源文件

构建前生成一个只包含非敏感来源信息的 JSON 文件，并在签名前纳入 App 资源：

```json
{
  "schemaVersion": 1,
  "productVersion": "0.7.3",
  "mode": "local-integration",
  "channel": "local-integration",
  "branch": "codex/integration/20260831-01",
  "commit": "<full SHA>",
  "mainCommit": "<full SHA>",
  "sourceClean": true,
  "dependencyDigest": "sha256:<hex>",
  "batchId": "20260831-01",
  "manifestDigest": "sha256:<hex>",
  "features": [
    { "branch": "codex/feat/example-20260831", "commit": "<full SHA>" }
  ],
  "builtAt": "<ISO-8601>"
}
```

`mode` 决定必填字段并采用失败关闭策略：

- `local-main`：channel 为 `local-integration`，`mainCommit == commit`，`batchId` 和
  `manifestDigest` 为 null，`features` 为空；
- `local-integration`：channel 为 `local-integration`，批次、manifest 摘要、main 基准
  和非空功能列表必须与 active-batch lease 一致；
- `feature-preview`：channel 为 `feature-preview`，必须记录规范化 slug、稳定身份哈希、
  feature base/tip，不接受脏源码；
- `formal`：channel 为既有 `notarized`，必须从干净 `main` 在正式公证构建签名前生成，
  记录正式版本和 source commit，不携带本地 active-batch lease。

缺失或未知 mode/channel 必须在选择 App 身份、用户数据目录、迁移和更新策略之前拒绝
启动，不能回退到 legacy 或正式身份。

文件不得包含用户名、绝对路径、凭据、工作区内容或会话数据。来源文件先生成在明确
忽略的临时目录，再通过 builder `extraResources` 在签名前纳入 App；不得写入未忽略的
源码目录。`dependencyDigest` 至少覆盖 lockfile、`patches/` 内容、补丁应用结果、Bundled
Plugin Profile manifest 和工作区 Node 版本；同一 Git 提交不能因为不同 worktree 的
忽略依赖状态而获得相同来源声明。签名后修改会破坏包签名。

集成 worktree 使用自己的依赖目录，并按已提交 lockfile 和补丁重新准备或验证依赖；不
通过共享另一个 worktree 的 `node_modules` 来缩短构建。依赖准备结果不匹配时停止，不
通过修改 provenance 摘要来接受未知运行时。

### 用户可见信息

Sherlock 的“关于”或开发信息区域显示：

```text
Sherlock 0.7.3
Integration 20260831-01
codex/integration/20260831-01 @ <short SHA>
构建时间 <local time>
```

正式版本显示 `Formal <version> @ <short SHA>`；功能预览显式显示
`Feature Preview <slug> @ <short SHA>`。窗口可见信息与 App 内 JSON 必须一致。

### 共享构建门禁

`./script/build_and_run.sh` 的 `--run`、`--verify`、`--debug`、`--logs` 和
`--telemetry` 都会操作共享身份，因此必须在停止现有客户端前经过同一本地来源门禁；
`--formal` 也使用同一互斥锁和 active-batch 冲突检查，但继续采用更严格的正式 Git
门禁：

- 当前分支只能是 `main` 或 `codex/integration/*`；
- 不能处于 detached HEAD；
- tracked 文件必须干净；
- 只允许明确列出的构建输出目录为未跟踪状态，其他未跟踪源码必须拒绝；
- 集成分支必须提供有效批次清单，且列出的提交都可从当前 HEAD 到达；
- active-batch lease 存在时只能由 lease 声明的精确 integration branch/tip 构建；
- 依赖摘要必须由当前 lockfile、补丁和已准备运行时重新计算并匹配；
- 构建来源文件与当前 Git 状态一致。

门禁失败时不得停止当前 Sherlock，不得覆盖现有 App，并输出当前目录、分支、提交和
具体失败条件。

### 共享构建锁与替换顺序

所有 worktree 共享同一个 Git common directory。共享构建在该目录下用原子目录创建
获取互斥锁，锁中记录持有进程、worktree、分支、提交和开始时间。已有活锁时新构建
停止并报告持有者；陈旧锁只能在确认记录进程不存在后由显式恢复命令处理，普通构建不
自动删除锁。

构建脚本必须通过退出 trap 在成功、普通失败和信号中释放自己持有的锁；不能释放 PID
或来源信息不匹配的其他构建锁。

共享构建严格按以下顺序执行：

1. 来源门禁通过；
2. 获取全仓共享构建锁；
3. 固定 HEAD、`main` 和批次清单；
4. 在 canonical 根目录下构建新的不可变 generation，并执行包校验；
5. 再次确认 HEAD、源码状态和批次清单未变化；
6. 记录当前 active generation 的绝对 App 路径，只在以上检查全部通过后停止旧客户端；
7. 用新 generation 的绝对 App 路径启动，等待 Harness 正常主界面就绪并核对 provenance；
8. 新 App 就绪后更新 active pointer，再次验证移动/切换后的签名和完整可执行路径；
9. 若启动、Harness 或来源验证失败，停止新 App，保持 active pointer 不变并重新打开旧
   generation；
10. 释放构建锁。

generation 固定存放在由 Git common directory 推导出的 canonical 根目录
`dist-local-integration/generations/<mode>-<short-sha>-<build-id>/Sherlock.app`，不位于
可被删除的功能或集成 worktree 中。active pointer 只记录已经成功启动并验证的不可变
generation，不通过复制覆盖修改已签名 App。切换、回滚和重启后都重新执行签名、来源和
精确路径检查。

停止旧客户端之前的失败直接保留旧客户端；停止后的失败必须完成上述自动回滚，若旧 App
也无法重启则报告两个绝对路径和诊断，不得声称仍保留可测试状态。正式发布门禁与本地
共享门禁保持为两个入口：本地门禁不能因为其他干净的并行功能 worktree 尚未合并而
阻止日常集成，正式发布仍必须阻止任何未合入分支或脏 worktree。

`local-integration` channel 在主进程更新策略、IPC、菜单、侧栏和“关于”页的自动及
手动入口中都返回禁用状态，不能只依赖 builder 的 `publish: null`。它使用独立 builder
配置、`publish: null`，且包校验断言不存在 `app-update.yml`。

`local-integration` 为了真实验收继续使用正式 Sherlock 用户数据目录，但不得向全局
`~/.agents/skills` 发布技能。Bundled Plugin Profile 和启动迁移必须幂等、版本化，并在
Harness 就绪前保留可恢复备份；启动失败回滚 generation 时同时恢复本次启动产生的托管
配置变更。Harness 就绪后的用户会话、设置或内容修改属于正常用户数据，不随 App 回滚。

## 功能预览隔离

功能预览采用独立命令和配置，不复用共享 `--verify`：

- 输出目录：`dist-feature-preview/<normalized-slug>-<identity-hash>/`；
- App 名称与进程名：`Sherlock Preview - <Display Slug>`；
- Bundle ID：`com.evanarts.sherlock.preview.<normalized-slug>.<identity-hash>`；
- 用户数据目录：
  `Application Support/sherlock-preview-<normalized-slug>-<identity-hash>`；
- channel：`feature-preview`，自动和手动更新、公证、公开 feed、正式数据迁移全部禁用；
- 包内不得生成 `app-update.yml`；
- 启动和停止只针对该预览进程；
- 界面持续显示 Feature Preview 来源信息。

预览来源门禁只接受源码干净、已提交的 `codex/feat/*` checkpoint；脏预览不受支持，
也不能用来生成交接卡片。slug 必须经过小写 ASCII、长度和字符白名单校验，避免无效
Bundle ID 或路径逃逸，并追加原始分支名的稳定短哈希，避免两个原始 slug 归一化后发生
身份、输出或 userData 碰撞。预览数据删除只发生在用户明确授权时；脚本本身不自动清理。
预览 channel 还必须跳过向全局 `~/.agents/skills` 同步技能，只写入自己的 user data，
避免不同预览或共享客户端在 Git 之外继续相互覆盖。

## 上游与远端边界

`origin` 当前指向上游项目，不是日常功能集成的同步基线。普通功能与集成脚本不得执行
`git pull`。上游同步必须使用独立的 `codex/upstream-sync/<YYYYMMDD>` 分支和批次，
先显式 fetch、审查分叉、解决冲突并完成本地验收，再决定是否进入 `main`。如需远端
备份，应配置独立 fork remote 并只推送命名分支；未经用户明确授权不得 force-push。

## 自动化组件

实现阶段把职责拆成四个小组件：

1. **Session/集成规则文档**：更新 `AGENTS.md`，新增面向开发者的集成 runbook。
2. **Git preflight**：只读分析分支、worktree、提交范围、清洁度和集成批次，不执行
   pull、push、merge、删除。
3. **集成执行器**：在 preflight 通过且用户已选择功能分支后，只创建全新的唯一集成
   分支并逐项追加合并；不 reset、rebase、复用同名分支或移动既有 ref，冲突时停止，
   绝不自动清理。
4. **构建来源与启动门禁**：生成来源文件、嵌入客户端、在 UI 展示，管理跨 worktree
   构建锁，并区分共享构建与独立预览构建。

Git preflight 和集成执行器分离，便于任何 session 先安全查看将要发生的动作。执行器
必须支持 dry-run，并在真实合并前打印基准、目标、提交列表和预计改动文件。

## 失败处理

- **功能 worktree 脏**：停止交接，列出文件；返回原 session 提交或明确排除。
- **功能已部分合并**：比较 patch-id 和可达性，不重复 cherry-pick；报告缺少的提交。
- **提交范围包含其他功能**：停止，要求拆分分支或明确把它们加入同一批次。
- **合并冲突**：保留集成 worktree 和冲突状态，禁止自动选边或删除。
- **`main` 在批次中前进**：把最新 `main` 合入批次，重新验证后才能 fast-forward。
- **active-batch owner 中断**：保留 lease、集成分支和 worktree；显式恢复命令核对
  owner token、manifest 和当前 tip 后才能接管，普通构建不能清除 lease。
- **批次被拒绝或取消**：先释放共享启动权并保留所有功能分支；随后由用户在合并、保留
  或明确丢弃集成分支之间作决定。正式门禁继续把未合入分支视为阻塞，不按分支名静默
  豁免。
- **共享构建来源不合法**：在杀进程和打包之前失败，保留当前可测试客户端。
- **另一 session 正在构建**：报告共享锁持有者并停止，不排队、不抢锁、不杀进程。
- **构建期间 HEAD 或源码变化**：废弃暂存产物，保留旧客户端并报告前后来源。
- **新 generation 启动失败**：恢复 active pointer 并重新启动旧 generation，分别报告
  新旧绝对 App 路径和签名/来源结果。
- **客户端显示来源与 JSON 不一致**：包校验失败，不允许进入用户验收。
- **真实界面缺少某项功能**：先核对当前 App 完整路径和来源提交，再判断为代码回归。
- **远端分叉或 push 被拒绝**：停止并单独处理；集成脚本不得 force-push。
- **清理时发现未知文件**：保留 worktree 并列出文件；不得 `--force`、`branch -D`、
  手工删目录或运行 `git gc --prune=now`。

## 聚焦验证

自动测试必须覆盖：

- 临时 Git 仓库中的正常功能分支、脏 worktree、未跟踪源码、已合并分支、异常基准、
  部分合并和 `main` 前进；
- dry-run 不修改 refs、索引、工作区、远端或进程；
- 合并冲突保留可恢复状态，且不删除功能 worktree；
- active-batch lease 的创建、tip 追加更新、owner 恢复、main/其他批次阻塞和显式释放；
- 所有共享启动模式在非法分支、detached HEAD、脏源码和无效清单下，在停止旧客户端前
  退出；正式模式仍使用更严格门禁；
- 两个 worktree 并发构建时只有一个获得锁，失败者不停止或替换客户端；
- 构建中 HEAD/源码变化时拒绝切换产物；不可变 generation、active pointer、启动失败
  回滚、签名复验和完整可执行路径确认；
- 四种 provenance mode 的必填/空值规则、未知 channel 失败关闭、提交可达性、无敏感
  路径、manifest/依赖摘要、签名前嵌入和包内/UI 一致性；
- 相同 Git commit 但 lockfile、补丁或运行时依赖状态不同会产生不同依赖摘要并触发检查；
- 功能预览的 App 名、Bundle ID、输出和用户数据隔离，以及不停止共享 Sherlock；
- `local-integration` 与 `feature-preview` 的自动和手动更新都被禁用，预览包不包含
  `app-update.yml`，两种本地 channel 都不向全局技能目录同步；
- 正式构建仍遵循既有干净 `main`、签名、公证和发布门槛；
- 默认测试收集继续排除 `.worktrees/**`，避免重复依赖和测试污染。

真实验收按 `docs/sherlock-local-test-runbook.md` 执行，但只能由集成 session 从合法
来源启动共享客户端。验收必须读取真实窗口，并同时确认本批功能、既有工作区/会话、
输入框和构建来源信息。

## 推行顺序

1. 先清点现有 worktree 和仍在使用它们的 Codex session。已合并且源码干净的在用户
   确认无人继续使用后清理；未合并或有未提交源码的先完成交接。必须保留的旧 worktree
   要合入治理提交或从更新后的 `main` 重建；在全部旧入口升级前明确禁止它们启动共享
   Sherlock，因为新门禁不会自动出现在旧 checkout 中。
2. 更新 `AGENTS.md` 和 runbook，明确从下一批功能开始执行新规则。
3. 增加只读 Git preflight、交接卡片生成和对应临时仓库测试。
4. 增加 active-batch lease、共享构建门禁、跨 worktree 锁、不可变 generation、
   `local-integration` channel、来源 JSON、包校验和客户端来源显示。
5. 增加短期集成分支执行器及 dry-run，验证 fast-forward 推进边界。
6. 最后增加独立功能预览构建，避免它影响共享客户端或正式数据。

每一阶段独立提交并运行直接相关的聚焦测试。全部机制完成后，从两个并行功能分支做一
次演练：分别提交、生成交接卡片、合入一个短期批次、构建共享客户端、核对来源与功能，
用户验收后 fast-forward 到 `main`。演练不触发远端推送、正式发布或公证。
