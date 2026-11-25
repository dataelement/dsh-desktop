# DSH 0.2.1-rc.1 功能与官方 Desktop 设计评估

评估日期：2026-10-17。对象：`codex/compat-dsh-0.2.1-rc1`，基于 Desktop
`V0.12.0`，Harness 从 `0.2.0-rc.2` 升级到 `0.2.1-rc.1`。

## 结论

主加载链、模型设置、预设入口和 PPT 模式界面已有通过的验证；原有 28 个 patch
已经逐项迁移或保留，详见 [升级记录](harness-0.2.1-rc.1-upgrade.md)。但是不能把
这些结果解释为新版所有功能均已正常：源码对照识别出的运行时补丁遗漏和当前目录
语义不一致已在本分支修复，处理详情见文末；新增可选功能大多尚未做真实操作验收。

最值得跟进的官方设计是：生产依赖补丁的显式分类与完整性门禁、Windows 安装目录操作
的有限重试与可诊断恢复，以及绑定源代码和签名资格的不可变发布产物。它们直接改善
我们现有架构的可靠性，不需要换用官方 Desktop 或重建 Agent runtime。

## 来源与比较边界

- 上游旧 tag：`dsh-v0.2.0-rc.2`，`639ed015397290b3745d163aafe02ffee4aa3f84`。
- 上游目标 tag：`dsh-v0.2.1-rc.1`，`1600d8a1e140dcde43a1a0941940a0480712c011`。
- [完整源码比较](https://github.com/deepseek-ai/deepseek-harness/compare/dsh-v0.2.0-rc.2...dsh-v0.2.1-rc.1)。
- 官方 Desktop 指上述目标提交的 `apps/desktop`，不是本仓库，也不是本机安装的应用。
  比较使用 `git show` 读取精确 tag；上游本地 checkout 的旧 HEAD 不作为目标版本证据。
- 实际产品输入仍是 npm 发布包和本仓库锁文件；上游 monorepo 的 pnpm patch 不会因为
  我们升级 npm 包而自动生效。客户端内嵌 bundle 与运行时外部依赖必须区别检查。

## 新版变化与我们当前的状态

下表记录诊断时状态，目录与运行时 patch 两项的后续修复见文末。
“源码接入”表示目标包、组合或调用链已核对；不代表已用真实模型、正式安装包或
目标平台验证。可选 bundle 随依赖携带且默认关闭，不应在升级时自动替用户开启。

| 变化 | 上游实际行为 | 本分支判断与验收缺口 |
| --- | --- | --- |
| 工作目录服务 | `workingDirectory` 从会话事件投影读取当前目录；`working_directory` 可切换，创建时的 `header.cwd` 保持不变 | 基础组合已接入；我们 Office/PPT 仍有旧目录读取，见下文，不能判定兼容完成 |
| Git Worktree | 可选 `create_worktree` 创建保留的检出目录/分支，并切换调用 Session 的目录；关闭插件不删除它们 | 包已包含、默认关闭；未做真实创建/退出/重启验收；只有创建能力，没有合并/删除管理器 |
| 会话搜索 | 可选的五个 Agent 只读查询工具，限定授权工作区；首次搜索才建立内存索引 | 已进入依赖闭包；不是侧栏搜索框；未验证首次建索引、权限过滤和重启后的重建 |
| 持久终端 | 独立 terminals 服务组；非 Windows 使用 bash，Windows 使用 pwsh 方言；Web 终端输入改为双向流 | 包和组合已包含；未验证交互、取消、退出及 Windows；还存在 node-pty 上游补丁遗漏 |
| 会话标题 | 可选 session-titles bundle，新增 all-prompts 模型策略，保留已有足够好的标题 | 包已包含；未验证真实模型生成、失败降级及重启恢复，不等于升级后全部会话自动改标题 |
| 思维链翻译 | 可选翻译 bundle/translator，增加模型消费路径 | 包已包含、默认关闭；未验证翻译模型选择、失败行为及额外调用成本 |
| Ralph / Agent team / Inspector | 可选循环、团队或诊断组合；Ralph 面向人明确要求的循环任务 | 属于按需启用功能；尚未验收；不要把启用它们当作普通升级步骤 |
| 自定义插件市场 | 可配置索引来源，Plugins 新增 Discover 页，安装仍消费插件管理服务 | 包已包含、可选组合已定义；我们有独立市场与 generation backend，尚未验证两套入口共存、安装事务及回滚 |
| 凭据显示遮挡 | Web 默认组合注册 UserText matcher，已发送/排队等文本中识别部分 token、私钥与 URL 密码 | 新 UserText factory 已保留；遮挡只影响显示，原文、复制和模型输入仍为原值；未单独验收匹配与显示切换，手机自有 UI 不自动继承 |
| 自定义模型 reasoning | 原生编辑器改为标准 pi-ai 档位及 API 映射；更新模型目录、Azure provider ID | 模型设置页及新建草稿已实机验证；保留我们任意映射和旧配置迁移；真实请求与 Azure 认证未验证，pi-ai 实际版本另有差异 |
| 聊天与输入体验 | 新 Session options slot、原子 slash chips、字体分项配置；ChatFlow 折叠/动画时钟及 viewport 优化，侧栏折叠水位调整 | 已合并原生 hero.options，Desktop modeActions 各一个出口；主界面可见；窄窗口、多贡献项、字体组合和长会话性能未验收 |
| Office | 渐进式 skills、直接 dsoffice 命令，删除旧 check_office.py；上游引擎升级到 0.1.5 | Python smoke 已创建真实 docx/pptx/xlsx 并检查文档结构；后续 Desktop/PPT 也已统一到 0.1.5，并迁移逐页通知补丁，验收见升级记录 |
| Session / 子 Agent | 串行 claim、preset 选择与恢复、格式状态及迁移/派生会话引导；SDK persisted resume | 删除及创建适配、持久化回归已通过；旧用户会话升级、fork、真实子 Agent 续跑未全链验收；不可假设新日志可降级给旧版本读取 |
| Remote / API 访问控制 | 主体身份、RBAC、方法/事件资源声明、列表过滤，撤销后丢弃已缓冲事件；API operator 与浏览器身份隔离 | Zod Remote 描述符及删除 RPC 已适配；认证 smoke 通过；非 owner 全矩阵和自有手机桥接与新授权模型的关系尚未验收 |
| 客户端跨版本保护 | graph 带 host release；发现另一 release 时暂停插件更新并提示整页重载 | 上游机制保留；尚未验证应用升级后旧页面、HMR/generation 变更与冷缓存/旧缓存组合 |
| PTC | 支持按所有者保留内存的 REPL，并处理策略变化、取消和进程释放 | 能力已在依赖内；默认仍为 per-call，不能声称默认拥有持久解释器；未验证 persistent 模式，闲置所有者会保留进程且无空闲过期 |
| 持久化与协议稳定性 | JSONL 列举使用共享并发上限、损坏 metadata 容错；修复空文本历史及跨协议往返 | 删除已被上游覆盖的旧容错 hunk，相关回归通过；大规模历史性能与真实多协议模型往返未验证 |

可选清单的权威输入为发布包 `dsh-app-boot/lib/index.js` 的 `OPTIONAL_BUNDLES`。
旧 schedule bundle 已退休；底层 schedule 工具仍存在，不应重引入旧 bundle。
我们的 generation projection 只拥有自身条目，应继续保留用户选择的官方可选项。

## 优先问题与原始证据

以下保留修复前的可复核差异；第 1、2 项已完成源码修复，不再是未处理项。

### 1. 生产运行时没有继承全部上游补丁

官方 [`runtime-patch-policy.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/1600d8a1e140dcde43a1a0941940a0480712c011/apps/desktop/scripts/runtime-patch-policy.ts)
明确把两项定义为 shared runtime patch：

| 依赖 | 官方目标 | 本分支实际输入 | 影响判断 |
| --- | --- | --- | --- |
| `@earendil-works/pi-ai` | 固定 1.1.0，并补丁移除多个 provider 对每段工具参数 delta 的重复 JSON 解析 | 锁文件/安装为 1.3.0；OpenAI completions 与 Responses 的 delta 路径仍存在 `parseStreamingJson`；没有本地对应 patch | 不能视为与官方验证输入等价；大型流式工具参数的重复解析风险仍在。未复现实际卡顿或错误，不能直接宣称 1.3.0 整体不兼容 |
| `node-pty` | 1.2.0-beta.15；补充外置 spawn helper 解析，以及 ConPTY kill 后主动 dispose 输出 worker | 相同版本但 npm 原包；Unix 仍仅使用默认 helper 路径；ConPTY 分支仍等待下一段 data 才 dispose | 外置 helper 场景及无后续输出的 Windows 关闭流程缺少官方修复；未在 Windows 复现，因此属于已确认代码差异、待平台验证的问题 |

现有 `patches/@deepseek-ai+dsh-llm-pi-ai+...` 修改的是 Harness adapter，不会给底层
`@earendil-works/pi-ai` 打补丁。`asarUnpack` 已包含 spawn-helper，因此也不能把
Unix 的额外路径支持缺失直接等同于我们默认安装包必然启动失败。

建议：先确定我们审定的 pi-ai 版本，再基于该版本适配必要 patch；对 node-pty
补齐适用运行路径，并增加真实 Windows 终端退出验证。不要只复制文件名或将上游
1.1.0 patch 强套在 1.3.0。28/28 自有 patch 重放成功不构成上游补丁完整性证明。

### 2. 当前目录与 Office/PPT 输出根目录不一致

上游 `dsh-working-directory` 的 `get(session)` 读取 projection，`set()` 追加
`working-directory/change`；`header.cwd` 是创建元数据。切换目录不会扩大 sandbox
权限，上游 `sandboxPolicy.resolve()` 仍以创建目录作为默认授权根，这是有意区分。

我们的以下路径仍读取 `header.cwd`：

- `packages/dsh-desktop-office/lib/template-tool.js:workspacePolicy`：模板复制/编辑根目录。
- `packages/dsh-desktop-office/lib/modes.js:registerOfficeContext`：基础及业务 skill 查找目录。
- `packages/ppt-runtime/core/lib/index.js:workspaceRoot` 与 `automaticSkill`：PPT 文件根目录及 skill 查找。

本轮用两个临时目录调用真实 `workspacePolicy`，注入新的 current directory 和符合上游
语义的原授权根，结果仍返回 original，`mismatch=true`。这是函数级复现，未调用模型
或真实 Worktree，证明模板路径选择不会跟随当前目录；PPT 的同类问题目前为源码确认。

这不仅影响可选 Worktree：基础组合已经提供 `working_directory`。用户切换后，常规
工具和 Office/PPT 可能使用不同根目录，产物落回原项目。

建议：明确“当前操作目录”和“授权根”的不同职责；统一通过 workingDirectory 获取
当前目录，再独立验证其位于现有许可范围。不能简单把 current cwd 写成新的权限根。
增加 original → 子目录/Worktree → 重启恢复 → 路径失效回退的行为测试。

### 3. Office 版本收敛和自定义市场验收

初次审计时存在根 0.1.3 与嵌套 0.1.5 两条路径。现已按用户要求统一固定
libreoffice-kit 0.1.5，PPT 依赖与根 override 同步；逐页预览回调仍为上游缺口，
已将补丁迁移到 0.1.5，保留取消、背压与失败清理语义。

官方 Discover 可以借鉴 UI 和来源元数据，但安装必须仍经过我们 generation
commit/rollback、宿主依赖闭包和启动失败隔离。需要真实安装、禁用、卸载、重启以及
失败回滚的组合验收，才能决定是否展示新入口。

## 官方 Desktop 值得跟进的设计

该范围内 `apps/desktop` 共 174 个文件变化（+7386/-779）；`src` 实际主要变化是
main、更新渠道与本地设置，变更重心在打包、安装和发布。不要将它理解成全新宿主架构。

| 优先级 | 上游设计 | 我们已有基础 | 建议跟进方式 |
| --- | --- | --- | --- |
| 发布前 | 运行时 patch 显式分类、精确版本覆盖、SHA256 与 lock 对照，拒绝遗漏/失效规则/同包未打补丁版本 | patch-package、逐项测试与干净 npm ci | 按 npm 的实际生产闭包建立分类/覆盖门禁，包括上游 runtime patch；保持 npm，不照搬临时 pnpm 工程 |
| 发布前（Windows） | 目录操作保留 Win32 原错误；仅对 5/32/33 做最多 10 次递增等待；回滚失败保留备份和恢复信息 | 已有 unique new/old 目录、暂存后替换及回滚；当前使用单次 Rename | 增量跟进有限重试、阶段日志和恢复停止状态，覆盖有进程占用、恢复也被锁及重试后成功；需要 Windows 原生 smoke |
| 近期 | 不可变 release store：绑定 commit、workflow commit、run/attempt、target、签名资格及逐文件 SHA512，原子保存，发布前重算 | Release artifact 校验、ModelScope 归档/回退目录与 release workflow | 先补统一产物 manifest 和按原产物提升/回滚；不重复创建第二套存储，也不在审核后重新构建字节 |
| 近期 | 安装包 manifest 固定更新 channel，与 semver 和上传环境分离；显式无效值失败 | 已有更新状态 reducer、用户确认、跳过版本及版本目录降级 | 多渠道确有需求时增加包内固定渠道与跨渠道测试；不要直接套用官方旧包默认 nightly 的产品策略 |
| 近期 | 保守、按目标平台清理复制后的运行时；未知资源保留，不修改开发依赖树 | asarUnpack、平台准备和 verify-target | 以最终资源清单证明精简，特别检查 Office/native/pty；每个平台跑产物启动，不做宽泛目录删除 |
| 已随 Harness 引入，需验收 | Host release identity 隔离旧页面与新插件图 | 自有 generation backend 与恢复入口 | 验证新旧 release、generation 切换、重载提示和 bootstrap 冷/热缓存，避免重复做另一套前端版本状态 |
| 按需 | 启动 Host 前读取并校验少量本地 shell settings；异常回默认并记录诊断 | 自有 main settings/Profile 与恢复配置 | 只把真正独立于 Harness 的壳层选项放这里，沿用已有配置所有权，避免第二套通用设置中心 |

上游实现参考：

- [运行时 patch 准备与校验](https://github.com/deepseek-ai/deepseek-harness/blob/1600d8a1e140dcde43a1a0941940a0480712c011/apps/desktop/scripts/prepare-runtime-patches.ts)
- [Windows 目录替换与恢复](https://github.com/deepseek-ai/deepseek-harness/blob/1600d8a1e140dcde43a1a0941940a0480712c011/apps/desktop/scripts/installer-directories.nsh)
- [不可变发布存储](https://github.com/deepseek-ai/deepseek-harness/blob/1600d8a1e140dcde43a1a0941940a0480712c011/apps/desktop/scripts/desktop-release-store.ts)
- [安装包内更新渠道](https://github.com/deepseek-ai/deepseek-harness/blob/1600d8a1e140dcde43a1a0941940a0480712c011/apps/desktop/src/update-channel.ts)
- [目标平台运行时文件策略](https://github.com/deepseek-ai/deepseek-harness/blob/1600d8a1e140dcde43a1a0941940a0480712c011/apps/desktop/scripts/runtime-file-policy.ts)

不建议本次直接跟进的事项：强制登录/强制更新的产品策略、为同步而整体替换现有
市场/generation、自动启用实验 bundle，以及将 Electron 43.0.0 机械升到官方 44.7.0。
Electron 还涉及原生 addon 指纹、平台资源与签名安装验收，需独立升级。

## 验证证据与交付边界

上一阶段在同一分支执行：干净 npm ci（28/28）、typecheck、build、完整测试
207 文件/2047 项、补丁目标语法检查、临时 Harness 认证 smoke，以及独立 Profile
的 web 和重启后 Electron 原生窗口验证。具体流程和限制见升级记录。

报告初稿新增的是精确 tag 源码比较、实际 npm 依赖与 patch 字节路径检查，以及临时目录
中的 Office 当前目录最小复现。初稿阶段仅新增报告；随后按用户要求实施了下节修复。

发布前仍需完成：双引擎真实 Office 流程、新功能按实际开放范围验收、Windows 原生
与签名安装包验收。当前可判定
“基础迁移与主要界面验证通过”，不能判定“所有新增功能正常”或“已发布可用”。

## 后续修复

- `pi-ai` 继续采用本分支已使用的 1.3.0，通过 npm override 固定版本；对照官方
  1.1.0 patch，逐项适配六个 provider 文件的 delta 分支，保留最终参数解析和 replay。
  新增 `@earendil-works+pi-ai+1.3.0.patch`，未将 1.1.0 补丁直接改名套用。
- 新增 `node-pty+1.2.0-beta.15.patch`：保留默认 asar 路径，支持显式/可执行文件同级
  spawn helper，ConPTY kill 后立即 dispose 输出 worker。macOS 的默认和显式外置
  helper 已实际启动终端；Windows worker 行为用模拟对象验证，尚未做 Windows 原生验收。
- Office 模板与 Word worker 的 cwd 使用 `workingDirectory.ensure`；授权根仍来自
  sandbox policy，当前目录必须位于该根内（含 realpath 后的软链接检查）。原有受限
  worker 不因用户切换目录而扩大写权限；未选择工作区仍拒绝执行。
- PPT 的项目读写/导出改用当前目录，并校验 sandbox mode 和授权根；只读模式允许
  读取/检查，拒绝写入。已有完整访问权限按其原语义处理。技能上下文在目录变化时刷新，
  不复用旧目录的宿主快照；用户显式技能调用保持其原有语义。
- 真实临时 Harness 的集成测试调用 workingDirectory.set 后执行 Office 模板工具，
  确认副本落在新目录，旧目录不存在同一路径；真实 Word worker 和生成后的 PPT 包也
  验证了新目录读写。没有修改真实用户 Profile 或已安装应用。

上述两项新依赖 patch 的退出条件：固定上游版本包含等价修复，并通过流式参数完整性、
asar/helper 解析和 Windows 终端退出验证后移除。正式发布前仍需 Windows 原生验收。

修复后验证：干净 npm ci（30/30 patch）与完整 postinstall、typecheck、build、
diff 检查通过；完整测试 209 文件/2054 项通过。新增与变动的测试及初次失败修正记录
见 [升级记录](harness-0.2.1-rc.1-upgrade.md#功能审计后的修复)。
