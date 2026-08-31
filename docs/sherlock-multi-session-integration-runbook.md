# Sherlock 多会话集成运行手册

本手册从功能 worktree 到本地 `main` 的接受与保留，所有 Git 操作仅限本地。Plan A 的交接、预检、批次、租约和集成工具现在生效；Plan B 的共享客户端源码/来源构建器尚未生效，Plan C 的隔离功能预览尚未生效。在 Plan B 落地前，当前 `AGENTS.md` 的本地测试运行手册继续有效；功能 worktree 绝不能构建或替换共享 Sherlock 客户端。

不会在本流程中执行 `pull`、`push`、`rebase`、`reset`、强制删除分支或 worktree。`main` 是本地集成权威；上游同步另见 Git 规范。

## 1. 功能分支与交接

从当前本地 `main` 创建一个独立 worktree，并在功能完成、源码干净且已完成直接相关验证后作中文提交：

```bash
git worktree add -b codex/feat/<slug>-<YYYYMMDD> ../sherlock-<slug> main
git -C ../sherlock-<slug> commit -m "功能：完成 <功能说明>"
```

交接卡绑定完整 base SHA、当前 feature tip 和检查证据：

```bash
npm run git:handoff -- --repo ../sherlock-<slug> --base <full-main-sha> --metadata ./handoff-metadata.json --output ./handoff-<slug>.json --format json
```

交接卡不是提交的替代品。分支或 tip 变化、worktree 变脏、提交范围不再精确时，重新运行交接，不能修改旧卡片以伪造新状态。

## 2. 建立或接管集成批次

集成分支固定为 `codex/integration/<YYYYMMDD>-<NN>`。新建批次由 canonical `main` 创建 worktree；`--dry-run` 只输出计划，不创建 worktree、分支、清单或租约。

```bash
npm run git:integration -- create --repo /absolute/path/to/canonical-main --worktree /absolute/path/to/integration-20260831-01 --batch 20260831-01 --handoff /absolute/path/to/handoff-a.json --checks /absolute/path/to/integration-checks.json --dry-run --json
npm run git:integration:preflight -- --repo /absolute/path/to/canonical-main --phase prepare
npm run git:integration -- create --repo /absolute/path/to/canonical-main --worktree /absolute/path/to/integration-20260831-01 --batch 20260831-01 --handoff /absolute/path/to/handoff-a.json --checks /absolute/path/to/integration-checks.json
```

仅当 Git 已登记的同名 integration worktree 精确位于当前本地 `main` tip、没有清单且没有冲突租约时才可接管：

```bash
npm run git:integration:preflight -- --repo /absolute/path/to/integration-20260831-01 --phase prepare
npm run git:integration -- adopt --repo /absolute/path/to/integration-20260831-01 --batch 20260831-01 --handoff /absolute/path/to/handoff-a.json --checks /absolute/path/to/integration-checks.json
```

## 3. 预检、合并与继续

每次变更前先运行只读预检。预检的 `--json` 只写 stdout；错误诊断只写 stderr。

```bash
npm run git:integration:preflight -- --repo /absolute/path/to/integration-20260831-01 --phase merge --manifest /absolute/path/to/integration-20260831-01/config/sherlock-integration-batches/20260831-01.json --feature codex/feat/<slug>-<YYYYMMDD> --json
npm run git:integration -- merge --repo /absolute/path/to/integration-20260831-01 --manifest /absolute/path/to/integration-20260831-01/config/sherlock-integration-batches/20260831-01.json --feature codex/feat/<slug>-<YYYYMMDD>
```

若合并冲突，执行器保留冲突和租约，并以 `INTEGRATION CONFLICT` 输出两侧提交上下文。解决冲突后先预检、再继续；不要 abort、reset 或删除现场：

```bash
npm run git:integration:preflight -- --repo /absolute/path/to/integration-20260831-01 --phase continue --manifest /absolute/path/to/integration-20260831-01/config/sherlock-integration-batches/20260831-01.json --feature codex/feat/<slug>-<YYYYMMDD>
npm run git:integration -- continue --repo /absolute/path/to/integration-20260831-01 --manifest /absolute/path/to/integration-20260831-01/config/sherlock-integration-batches/20260831-01.json --feature codex/feat/<slug>-<YYYYMMDD>
```

## 4. 所有权恢复与 main 同步

中断的 owner 只能在确认同一批次和精确集成 tip 后恢复；不要手改 common-dir lease 或 owner token。

```bash
npm run git:integration:preflight -- --repo /absolute/path/to/integration-20260831-01 --phase recover-owner --manifest /absolute/path/to/integration-20260831-01/config/sherlock-integration-batches/20260831-01.json --commit <exact-integration-sha>
npm run git:integration -- recover-owner --repo /absolute/path/to/integration-20260831-01 --manifest /absolute/path/to/integration-20260831-01/config/sherlock-integration-batches/20260831-01.json --confirm-batch 20260831-01 --confirm-tip <exact-integration-sha>
```

若 `main` 已前进，必须先把其变更由执行器记录到批次，随后重新验证合并结果：

```bash
npm run git:integration:preflight -- --repo /absolute/path/to/integration-20260831-01 --phase sync-main --manifest /absolute/path/to/integration-20260831-01/config/sherlock-integration-batches/20260831-01.json --main-worktree /absolute/path/to/canonical-main
npm run git:integration -- sync-main --repo /absolute/path/to/integration-20260831-01 --manifest /absolute/path/to/integration-20260831-01/config/sherlock-integration-batches/20260831-01.json
```

## 5. 接受、晋升与取消

用户先在批准的共享客户端中接受精确 integration tip；Plan B 到位前不在 feature worktree 构建共享客户端。接受只记录元数据，不推进 `main`：

```bash
npm run git:integration:preflight -- --repo /absolute/path/to/integration-20260831-01 --phase accept --manifest /absolute/path/to/integration-20260831-01/config/sherlock-integration-batches/20260831-01.json --commit <accepted-integration-sha>
npm run git:integration -- accept --repo /absolute/path/to/integration-20260831-01 --manifest /absolute/path/to/integration-20260831-01/config/sherlock-integration-batches/20260831-01.json --commit <accepted-integration-sha> --confirm-batch 20260831-01
```

只有已接受、clean 且可 fast-forward 的 canonical `main` 才可晋升。先使用 dry run，确认后执行真实晋升：

```bash
npm run git:integration:preflight -- --repo /absolute/path/to/integration-20260831-01 --phase promote --manifest /absolute/path/to/integration-20260831-01/config/sherlock-integration-batches/20260831-01.json --commit <accepted-integration-sha> --main-worktree /absolute/path/to/canonical-main
npm run git:integration -- promote --repo /absolute/path/to/integration-20260831-01 --manifest /absolute/path/to/integration-20260831-01/config/sherlock-integration-batches/20260831-01.json --main-worktree /absolute/path/to/canonical-main --confirm-batch 20260831-01 --confirm-tip <accepted-integration-sha> --dry-run
npm run git:integration -- promote --repo /absolute/path/to/integration-20260831-01 --manifest /absolute/path/to/integration-20260831-01/config/sherlock-integration-batches/20260831-01.json --main-worktree /absolute/path/to/canonical-main --confirm-batch 20260831-01 --confirm-tip <accepted-integration-sha>
```

若用户明确放弃该批次，保留 worktree、分支与记录，仅以显式取消归档租约：

```bash
npm run git:integration:preflight -- --repo /absolute/path/to/integration-20260831-01 --phase cancel --manifest /absolute/path/to/integration-20260831-01/config/sherlock-integration-batches/20260831-01.json
npm run git:integration -- cancel --repo /absolute/path/to/integration-20260831-01 --manifest /absolute/path/to/integration-20260831-01/config/sherlock-integration-batches/20260831-01.json --confirm-batch 20260831-01 --explicit-cancellation
```

## 恢复和保留策略

- 保留的冲突：保留 `MERGE_HEAD`、分支和 worktree；修复后执行 `continue`，或由用户明确取消。
- 部分清单记录或 CAS：不要手改 JSON、lease 或 ref；用同一 manifest 和精确 tip 运行相应 `continue`，必要时 `recover-owner`。`INTEGRATION RECOVERY_REQUIRED` 表示现场仍可检查。
- 中断所有权：仅使用 `recover-owner` 的 batch/tip 双重确认。token 丢失或状态不精确时保留现场并进行人工审阅。
- 陈旧的未来构建锁：Plan B 的共享构建锁尚未生效；届时只能由其 runner 诊断并释放确认过的陈旧锁，不能从功能 worktree 绕过来源门禁。
- 已取消批次：保持取消归档、分支和 worktree 可检查；新需求新建新批次，不复用取消批次。
- 旧治理前 worktree：不得启动共享客户端。保留以检查或完成独立提交；需要继续开发时，从当前本地 `main` 新建合规 feature worktree 并重新交接。

## 稳定退出码与输出

| 退出码 | 含义 | stdout / stderr 约定 |
| --- | --- | --- |
| 0 | 成功、帮助或已计划的 dry run | `--json` 为单一 JSON stdout；非 JSON 的成功使用稳定 `INTEGRATION ...` / `PREFLIGHT PASSED` token |
| 1 | 只读预检阻止操作，或 lifecycle 的策略/状态拒绝 | preflight 在 stdout 写 `PREFLIGHT BLOCKED` 和 findings；lifecycle 拒绝的诊断写 stderr，stdout 为空 |
| 2 | 无效 CLI 参数、输入或 schema/执行错误 | 诊断仅写 stderr，stdout 为空 |
| 3 | 保留的合并冲突结果 | 非 JSON lifecycle stdout 以 `INTEGRATION CONFLICT` 开始，并提供冲突提交上下文 |
| 4 | 必须显式恢复的结果 | 非 JSON lifecycle stdout 以 `INTEGRATION RECOVERY_REQUIRED` 开始，现场不会被删除 |

使用 `--help` 获取可执行参数面：

```bash
npm run git:handoff -- --help
npm run git:integration:preflight -- --help
npm run git:integration -- --help
```
