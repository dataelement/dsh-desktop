# PR 871：上一轮 27 项测试失败逐项归因

## 范围与结论

对照对象：PR 提交 `a06364f2f0fc96582190e8348e50e9799369030b` 与上游基线 `78a02230`。仅归因原日志的 9 个 suites、27 项失败，不代表完整回归或安装验收。

结论：**PR 引入的测试契约失配 2 项；基线已有失败 7 项；环境相关 17 项；未定 1 项**。其中环境 17 项包含 Electron Helper 运行器问题 16 项、嵌套 schemastery 依赖拓扑 1 项。Office 原失败未稳定重现，保留未定，不用“无关”替代证据。

原始 stderr 与全部实验 stdout/stderr 保留在工作区旁的本地 `failure-attribution-logs/` 目录（不随仓库提交）。下表列出日志名便于本机复核，远端审查可按给出的命令复现。日志中的绝对路径仅属于当次机器诊断证据，不是代码或 fixture 的运行要求。

## 方法与隔离边界

1. 在工作区新建独立 detached worktree `failure-attribution-baseline`，固定 `78a02230`。主仓最初 `git status --short` 为空，HEAD 为上述 PR 提交。
2. 基线根目录 `node_modules` 使用主仓依赖目录 symlink，未执行安装、未改锁文件。**共享目录中的本地 `file:` 包 symlink 仍指向主仓 PR 的 packages，不能据此声称完整纯净依赖安装。**
3. 本轮相关 market 测试直接读取各 worktree 的本地 client 源码（不是经共享 symlink 导入），因此基线 PASS/PR FAIL 的结论不受该项污染。harness 依赖测试同样从各自 packages 的物理 manifest 路径创建 resolver。其余对照输入（目标 9 个测试、Office/verify 脚本、README、package/lock）在两个提交之间无差异；共享 registry 依赖不变。
4. 基线第一次缺少 `.build/office-runtime`，出现两个资源缺失失败，**不能拿这次 Office 结果对照原失败**。随后只在基线 `.build` 下创建指向主仓相同 Office runtime 的 symlink，再实跑，7/7 通过。未改动共享资源内容。
5. 基线初始没有 PR 工作目录中额外的 `packages/ppt-runtime/core/node_modules`，harness 测试通过。为匹配实际依赖拓扑，复制该目录（约 24 MB）到基线相同位置后再次实跑，精确复现 duplicate schemastery；基线 tracked 文件仍保持原版，主仓依赖未删除/移动。
6. 默认 `node` 实际是 Harness 包装器，运行时 `process.execPath` 为 BISHENG Helper，Node `24.17.0`、Electron `43.0.0`，继承 `ELECTRON_RUN_AS_NODE=1`。另用机器已有真实 Node `25.9.0` 跑同样两侧测试，仍显式保留 `ELECTRON_RUN_AS_NODE=1`，区分“Node 模式变量存在”与“可执行文件本身是 Electron”两个因素。
7. 未运行 npm pretest，避免修改主仓生成物；使用已有准备资源，直接调用 Vitest CLI。未提交任何 commit。报告编写期间主代理另行修改市场等测试；下列 PR 日志是在那些后续修复前取得，不能作为后续 WIP 状态的测试报告。

### 可复现实验命令

以下命令在对应 worktree 根目录运行；实际每次重定向 stdout/stderr 到下表日志，并追加 `EXIT_CODE`。

```bash
git worktree add --detach <workspace>/failure-attribution-baseline 78a02230
ln -s <main>/node_modules <baseline>/node_modules

# 两侧均使用完全相同的 suite 参数
SUITES='test/electron-node-loader.test.ts test/harness-dependency-baseline.test.mjs test/market-client.test.mjs test/node-pty-asar-layout.test.ts test/office-runtime.test.mjs test/open-in-app-environment.test.ts test/readme-parity.test.ts test/release.test.ts test/verify-asar-unpack.test.ts'
node node_modules/vitest/vitest.mjs run $SUITES
ELECTRON_RUN_AS_NODE=1 /opt/homebrew/bin/node node_modules/vitest/vitest.mjs run $SUITES

# 基线资源隔离补充（只新增基线中的 symlink/未跟踪依赖目录）
mkdir -p <baseline>/.build
ln -s <main>/.build/office-runtime <baseline>/.build/office-runtime
cp -R <main>/packages/ppt-runtime/core/node_modules <baseline>/packages/ppt-runtime/core/node_modules
node node_modules/vitest/vitest.mjs run test/office-runtime.test.mjs
node node_modules/vitest/vitest.mjs run test/harness-dependency-baseline.test.mjs
```

`<main>`、`<baseline>` 和 `<workspace>` 是本次实际绝对目录的可移植占位符。Office 单独复跑在复制 schema 目录之前完成；之后全套真实 Node 对照已同时具有 Office 资源及 schema 拓扑。

| 代号 | 实验与完整日志 | 结果 |
| --- | --- | --- |
| A | 基线默认 Helper、尚无生成资源：`baseline-shared.log` | 25 failed / 76 passed / 4 skipped；含两个不可直接比较的 Office 缺资源失败 |
| B | 基线相同 Office 资源：`baseline-office-prepared.log` | Office 7/7 PASS，exit 0 |
| C | 基线相同 schema 拓扑：`baseline-schema-topology.log` | harness 1 failed / 1 passed，exit 1 |
| D | PR 默认 Helper：`pr-rerun.log` | 26 failed / 75 passed / 4 skipped，exit 1；Office PASS |
| E | 基线真实 Node，资源/拓扑已对齐：`baseline-native-node.log` | 8 failed / 93 passed / 4 skipped，exit 1 |
| F | PR 真实 Node：`pr-native-node.log` | 10 failed / 91 passed / 4 skipped，exit 1 |

默认运行器版本证据：本地 `environment.json`。市场客户端提交差异：本地 `market-diff.txt`。Vitest 版本为 `4.1.11`，每轮共 105 tests；4 个跳过项是未启用 opt-in 原生 Electron Open In 场景，不属于原 27 项。

## 27 项逐项对照

编号按原日志失败组顺序列出；同一组的参数化失败也逐项列出。A–F 的含义及完整日志如上。

| # | Suite / 单项 | 原失败原因 | 基线实测与 PR 复测 | 判定 |
| --- | --- | --- | --- | --- |
| 1 | electron-node-loader：requests each internal module | 测试用 `process.execPath` 当普通 Node，预期 `runtime.electron=null`，实际 `43.0.0` | A 同样失败；D 同样；E/F 此 suite 4/4 PASS | **环境**：Helper 冒充 node，断言运行器身份不成立 |
| 2 | harness-dependency-baseline：resolves shared Cordis and schema | dsh-ppt 解析到 core 嵌套 schemastery，非宿主根实例 | A 干净基线 2/2 PASS；C 复制相同嵌套依赖后精确同错；D/E/F 均同错 | **环境**：工作目录依赖拓扑；不能将 A 的 PASS 单独解释为 PR 回归 |
| 3 | market-client：preserves … enable/restart，zh | 开启响应 mock 只有 `{ok:true}`，新客户端仅 `restartRequired===true` 才显示重启按钮；测试读取不存在按钮的 `.props` | A/E 基线此项 PASS，D/F PR 此项 FAIL | **引入**：PR 改变客户端响应契约，既有测试 mock/断言未同步；不是据此证明实际宿主产品功能坏了 |
| 4 | market-client：preserves … enable/restart，en | 同 #3，英文参数 | A/E PASS，D/F FAIL | **引入**：同上 |
| 5 | node-pty-asar-layout：app.asar，default helper | Helper 运行器下 archive 被 Electron 虚拟文件系统解释，报 `Invalid package … app.asar` | A/D 同错；E/F suite 4/4 PASS | **环境**：Electron 运行测试与真正 Node 的 ASAR 语义不同 |
| 6 | node-pty-asar-layout：app.asar，external helper | 同 #5，外部 helper 参数 | A/D 同错；E/F PASS | **环境** |
| 7 | office-runtime：full packaging gate | 原记录的 xlsx→pdf Electron 子进程退出 1，`killed:true`、stdout/stderr 为空 | A 缺 runtime，不能比较；B 同资源基线 PASS；D PR PASS；E/F PASS | **未定**：原失败本次未重现；可能瞬态进程/资源问题，但没有原始底层错误足以证明 |
| 8 | open-in bundle：scrub ELECTRON_RUN_AS_NODE | 删除 Node selector 后用 `process.execPath` 启动，本机变为 Helper GUI 路径，`-e` 不再执行 Node witness，ENOENT | A/D 同错；E/F PASS | **环境**：测试假定其自身可执行文件为普通 Node |
| 9 | open-in bundle：scrub electron_run_as_node | 同 #8，小写变量参数 | A/D 同错；E/F PASS | **环境** |
| 10 | open-in bundle：scrub Electron_Run_As_Node | 同 #8，混合大小写参数 | A/D 同错；E/F PASS | **环境** |
| 11 | open-in bundle：early nonzero child exit | Helper 清除 selector 后不以 Node 执行 `process.exit(7)`；promise resolve 而非预期 reject | A/D 同错；E/F PASS | **环境** |
| 12 | open-in module：scrub ELECTRON_RUN_AS_NODE | 同 #8，读取 installed module 入口 | A/D 同错；E/F PASS | **环境** |
| 13 | open-in module：scrub electron_run_as_node | 同 #12，小写参数 | A/D 同错；E/F PASS | **环境** |
| 14 | open-in module：scrub Electron_Run_As_Node | 同 #12，混合大小写参数 | A/D 同错；E/F PASS | **环境** |
| 15 | open-in module：early nonzero child exit | 同 #11，module 入口 | A/D 同错；E/F PASS | **环境** |
| 16 | open-in：installed host plugin route | 路由返回 `{ok:true}`，但 Helper GUI 子进程未写 Node witness，随后 ENOENT | A/D 同错；E/F PASS | **环境** |
| 17 | readme-parity：README.md current facts | 缺少当前依赖版本字串 `@deepseek-ai/dsh@0.2.2-rc.1` | A/D/E/F 均失败，README 与依赖/测试在两个提交间不变 | **基线**：产品事实文档与断言不一致 |
| 18 | readme-parity：README.zh.md current facts | 同 #17，中文 README | A/D/E/F 均失败 | **基线** |
| 19 | readme-parity：README.ja.md current facts | 同 #17，日文 README | A/D/E/F 均失败 | **基线** |
| 20 | readme-parity：README.ru.md current facts | 同 #17，俄文 README | A/D/E/F 均失败 | **基线** |
| 21 | readme-parity：README.es.md current facts | 同 #17，西班牙文 README | A/D/E/F 均失败 | **基线** |
| 22 | readme-parity：README.pt.md current facts | 同 #17，葡萄牙文 README | A/D/E/F 均失败 | **基线** |
| 23 | release：stable website / previews GitHub | 首次中断于 README 缺 `https://github.com/dataelement/dsh-desktop/releases` 字串断言；后续 Pre-release 检查尚未执行，不能声称其也已失败 | A/D/E/F 同一断言失败 | **基线**：发布 README 契约不满足 |
| 24 | verify-asar-unpack：reject packed native binary | Helper 中 ASAR 虚拟目录语义干扰测试临时 Resources 清理，报 `ENOTEMPTY`，不是原预期验证器判定 | A/D 同错；E/F suite 4/4 PASS | **环境**：Electron ASAR filesystem 与 Node 不同 |
| 25 | verify-asar-unpack：accept unpacked binary | 同 #24，正例 | A/D 同错；E/F PASS | **环境** |
| 26 | verify-asar-unpack：reject missing physical payload | 同 #24，缺失物理文件负例 | A/D 同错；E/F PASS | **环境** |
| 27 | verify-asar-unpack：reject changed same-size bytes | 同 #24，同大小变更负例 | A/D 同错；E/F PASS | **环境** |

原日志将两条 early-exit 失败合并显示在一组；本表仍按真实两个测试各计一项。其余编号并不依赖原终端 `[n/27]` 展示序号。

## 后续上游状态（不改变本轮归因基准）

主代理随后报告已 fetch 到上游 `8f7804fe`，其中 `c66c7f5a`（#885）修正 README/发布测试契约，并计划合入。上表 #17–#23 的“基线”专指实测的 `78a02230`，不能理解为最新上游仍失败。本归因代理未独立验证该后续提交或合入后的回归；最终 7 项是否消除以主代理后续测试日志为准。

## 后续修复与最终验证

- 正式壳打开窗口时显式区分 `manual` / `reconnect`；手机重连仅展示配对窗口，不调用 `toggleTunnel` 改变模式。补充 LAN 无会话、旧窗口已销毁、已有公网隧道三种单元回归。
- 市场中英文 mock 明确返回 `restartRequired:true`，补充 false 时不显示重启按钮的回归；测试环境提供真实浏览器已有的 `CustomEvent` / `dispatchEvent` 能力。
- 合入上游 `8f7804fe`（含 #885），承接精简 README 的测试契约修复，而不是修改 README 来满足过时断言。
- 主仓两个源码包 `core` / `adapter` 的本地嵌套 schemastery 为 `3.18.2`，根依赖为 `3.19.0`。逐项核对后移动到 `.build` 备份（未删除、未改源码或锁文件），恢复宿主单例解析；基线复制目录保留供复核。
- 通过清洁 `npm ci`，完整 postinstall 的全部补丁成功重放；随后类型检查和完整构建成功。
- 新增真实 Electron 子进程测试，在独立临时 userData / DSH_HOME 中执行真实窗口和配对页 JS，覆盖手动 loading、并发合并、重用、隧道成功与双线路失败、页面切 LAN 后关窗重连以及全新 LAN 重连。provider 为本机模拟，不访问公网，renderer 不暴露 Node 全局，最后清理全部窗口和 bridge。
- 最终用原生 Node 跑全量 Vitest：**3240 通过、0 失败、9 跳过（3249 总项，exit 0）**；真实 Electron 手机窗口冒烟包含在本轮全量中并通过。JSON 和完整日志保留在本地 `.build/pr871-final-tests.json` / `.build/pr871-final-tests.log`（不提交生成物）。
- Windows、真实公网手机及已安装正式包仍未验证；不能把模拟线路成功或本机 Electron 冒烟称为公网/安装包验收。

## 处置边界与剩余风险

- #3/#4 应按本 PR 新契约更新测试：明确模拟 `restartRequired:true` 的按钮/通知路径，并补 false 或缺字段不提示路径；是否缺字段等价 false 应以宿主实际可选响应契约为准。本报告只记录失败归因，未在归因阶段修改测试。
- #2 未清理主仓依赖。可先备份确认重复的 schemastery/其他宿主单例，再单独隔离移动并跑依赖及 PPT 验证；不要整目录盲删，不要与正在运行的测试同时改依赖。复制到基线的目录刻意保留便于复核。
- #7 不能强判基线或引入。原错误没有 LibreOffice/adapter 输出；本次两侧相同 runtime 均成功只排除了“稳定复现”，不等于找出原始失败原因。
- 真实 Node `25.9.0` 与 Helper 内 Node `24.17.0` 不是严格同 Node 小版本 A/B；不过同侧换为普通 Node 后 16 项集中消失，且原错误直接体现 Electron runtime 身份/ASAR/GUI 执行语义。结论限定为当前运行环境，不推断所有 Electron/Node 版本。
- 未做干净 npm ci、完整依赖闭包隔离、完整全套回归、打包或安装 UI 验收。共享 file 包指向 PR 的限制已明确披露，不能将这份报告包装成完整版本交付对照。
- 本次持久化背景任务均已结束并收集 exit code。除本报告外，归因工作未改主仓源码/测试/锁文件、未修改用户 Profile、未 commit；其他代理同期 WIP 不属于本报告变更。
