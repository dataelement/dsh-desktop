# Windows: profile repair 无法收敛，且自身在生产坏包

现场：desktop 0.5.0 / `@deepseek-ai/dsh` 0.1.1-rc.1 / Windows 10 19045 / NTFS / Defender 实时保护开启。
结论来自一台真实卡死的机器（日志 + 磁盘状态），代码位置对应 `main` @ 5de2105。

## 现象

启动卡在 splash 页，永不进入主界面，且每次启动都在恶化：

```
[stderr] node_modules\node-pty\lib\conpty_console_list_agent.js:13
[stderr] Error: AttachConsole failed
[node] Harness process exited (signal SIGTERM)
[desktop] repairing profile: cleared 4 damaged package directories
[desktop] profile repair failed: Profile repair timed out after 5 minutes.
...
[desktop] repairing profile: cleared 6 damaged package directories
[desktop] profile repair failed: Profile repair timed out after 5 minutes.
...
[desktop] repairing profile: cleared 15 damaged package directories
[desktop] profile repair failed: Profile repair timed out after 5 minutes.
```

坏包数 4 → 6 → 15 单调增长。最终 `node_modules/.pnpm` 只剩 `lock.yaml`，顶层残留 107 个空壳目录，
`dshmarket` 被整个删除 —— 于是市场的更新/卸载也一并失效（manifest 仍声明 `dshmarket@1.9.0`，磁盘上已无此物）。

## 三个相互放大的缺陷

### 1. 修复是"先破坏后重建"，失败后单调恶化

`src/main/index.ts:511` `repairProfilePackages()`：

```ts
const removed = await clearDamagedPackageDirectories(dshHome)  // 先删
if (removed.length === 0) return
const result = await installProfileDependenciesWithDsh({ ... }) // 再装
```

安装未完成时，profile 比修复前更残缺。下次启动扫出更多坏包，删得更多，装得更不完。
没有任何机制能让它收敛。

### 2. 超时是固定墙钟，且给了最重的操作最短的预算

`src/main/runtime/profile-plugin-command.ts:7`：

```ts
const OPERATION_TIMEOUT_MS = 15 * 60 * 1000  // 单个插件增删
const REPAIR_TIMEOUT_MS    =  5 * 60 * 1000  // 全量重装（本例 167 个包）
```

超时后 SIGTERM 落在 pnpm 身上 —— 而这恰好是坏包的生产方式，见下。

### 3. `clone-or-copy` 在 NTFS 上退化为全量 copy

`src/main/runtime/harness-runtime.ts:151` 与 `profile-plugin-command.ts:134` 均硬编码：

```ts
npm_config_package_import_method: 'clone-or-copy',
npm_config_child_concurrency: '1',
npm_config_side_effects_cache: 'false',
```

`clone` 是 reflink（CoW），仅 btrfs/XFS/APFS/ReFS 支持。**Windows 主流是 NTFS，clone 必然失败，逐文件 copy 兜底。**
本例 store 已有 1.8 GB 且是热的（安装期间 store 无写入，几乎不涉及下载），耗时全在把几万个小文件复制进
`node_modules`，叠加 Defender 实时扫描 —— 5 分钟装不完是必然。store 与 profile 同卷，`hardlink` 本可用。

注：这些是**环境变量**，优先级高于 profile 的 `.npmrc`，用户侧改 `.npmrc` 无效。

## 坏包是怎么产生的

`src/main/state/profile-repair.ts` 的判定（`findDamagedPackageDirectories`）：非 symlink 的目录，满足其一即为坏包 ——

- 名字含 `_tmp_` 或 `.dsh-old-`（`plugin-recovery.ts:15` `isDisposableModuleDirectory`），即 pnpm 的暂存/换名残留；
- 没有可读且 `name` 为字符串的 `package.json`，即"顶着包名但不是包"。

而文件头注释已经点明了成因：pnpm 把包写进暂存目录后 rename 到最终名字，**Windows 上目标被占用时 rename 失败**，
留下残骸；此后每次 rename 到同名都失败，profile 就卡死。

**关键在于这形成了闭环**：5 分钟超时 → SIGTERM 打断 pnpm 的 copy/rename → 制造出新的坏包 →
下次启动清掉更多、要装的更多 → 更装不完 → 再超时。**修复机制本身成了坏包的主要生产者**，
4 → 6 → 15 正是这个循环的读数。

第一张骨牌是 node-pty 的 `AttachConsole failed` —— 那是它在无控制台进程里的运行时故障，**不是安装残缺**
（该包随发 prebuilds，`prebuilds/win32-x64/` 完整，`build/Release` 本就不该存在）。它值得单独查，
但真正让机器无法自愈的是循环本身：任何一次 harness 崩溃都足以点燃它，起因是什么并不重要。

## 建议修改

### A. 安装原子化（治本）

1. **旁装再切换**：在 `profiles/<name>.next/` 装好后再替换，不要就地删。Windows 无 POSIX
   rename-over-directory 原子性，建议加一层间接：`profiles/web` 作为指向
   `profiles/versions/web-<lockhash>/` 的 junction，切换 = 重建 junction，旧版本保留可秒级回滚。
2. **提交标记**：安装成功后才写 `.install-complete`（含 `pnpm-lock.yaml` hash）。启动时只信任
   marker 存在且 hash 匹配的 profile。半截状态永不被当成可用状态 —— 单这一条即可打断上述闭环。
3. 仓库已依赖 `@deepseek-ai/dsh-atomic-write`，文件级原子写已具备；缺的是**目录级**的同等保证。

### B. 超时改为无进度超时

盯 pnpm stdout / 目标目录写入，例如 90s 无任何进展才判死，取代固定 5 分钟；并把进度透传到 splash，
当前用户只看到一个不动的启动页，零信息。

### C. 按文件系统决定 import method

Windows + NTFS 用 `hardlink`（或交回 pnpm 默认的 `auto`）；`child-concurrency` 提到 4；
`side-effects-cache` 开启，避免 node-pty 这类原生包每次重装重跑构建副作用。

取舍需注意：hardlink 与 store 共享 inode，原地改写会污染 store —— 这应是 `clone-or-copy` 的初衷。
建议配 `verify-store-integrity`，而不是退回 copy。**此项需要在 NTFS 上实测确认后再合入。**

### D. 预装 profile 依赖

profile 仅 2 个直接依赖（`dshmarket`、`dsh-better-sidebar`）展开成 167 个包，可在打包时进
`resources/app`，让首启动零安装，从根上避开这条路径。

## 验证建议

- NTFS + Defender 开启下构造一次 harness 崩溃，触发 repair，断言坏包数不再单调增长；
- 安装中途 kill 进程，重启后断言 profile 仍可用（marker 未写 → 走重建，而非半截）；
- 对比 `clone-or-copy` 与 `hardlink` 在冷/热 store 下的耗时。

## 用户侧临时绕过

完全退出 app 后手动安装（不带上述节流环境变量，因而不受 5 分钟超时限制）：

```powershell
cd "$env:APPDATA\dsh-desktop\harness\profiles\web"
& "$env:LOCALAPPDATA\Programs\DSH Desktop\resources\app\node_modules\node\bin\node.exe" `
  "$env:LOCALAPPDATA\Programs\DSH Desktop\resources\app\node_modules\pnpm\bin\pnpm.cjs" `
  install --no-frozen-lockfile
```

并将 `%APPDATA%\dsh-desktop`、`%LOCALAPPDATA%\pnpm\store` 加入 Defender 排除目录（需管理员）。
修复完成前不要反复启动 app —— 每启动一次都会多删一批包。
