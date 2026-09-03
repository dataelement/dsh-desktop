# 升级到 Harness 0.1.2-rc.1

对照上游 [`dsh-v0.1.2-rc.1`](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.2-rc.1)
（commit `a66e4702047846cdaa10c66c9d3df3951f5ea70d`）从 `0.1.2-alpha.4` 升级。

前序升级见：

- `0.1.1-rc.2` → `0.1.2-alpha.1`：[harness-0.1.2-upgrade.md](./harness-0.1.2-upgrade.md)
- `0.1.2-alpha.1` → `0.1.2-alpha.3`：[harness-0.1.2-alpha.3-upgrade.md](./harness-0.1.2-alpha.3-upgrade.md)
- `0.1.2-alpha.3` → `0.1.2-alpha.4`：[harness-0.1.2-alpha.4-upgrade.md](./harness-0.1.2-alpha.4-upgrade.md)

## 维护方式

上游尚未发布 npm registry 包，Desktop 继续使用仓库内 `packages/harness-0.1.2-rc.1/`
的本地 tgz，而非改回语义化 registry 依赖。该目录由上游标签执行 `build:official` 后分别
以 `release/pack.ts --family vendor`、`--family dsh` 产生：9 个 vendor 与 242 个 dsh
tarball。`package-lock.json` 已随 `file:` 路径和 tarball 完整性重新生成。

## 上游变化与 Desktop 影响

rc.1 的 release note 汇总范围是 `0.1.1-rc.2` 至 rc.1，而非只列 alpha.4 之后的增量；下表
前四行大多已在当前 alpha.4 基线中。对本次 Desktop 升级真正新增的上游源码差异是最后一行。

| 范围 | rc.1 变化 | Desktop 处理 |
| --- | --- | --- |
| 会话体验 | release note 包含过程/System prompt 折叠、完整历史导航、token/耗时、可调宽度和字号 | 大多已在 alpha.4 基线；现有会话、侧栏、轨迹补丁保留。 |
| Agent 与连接 | release note 包含子 Agent 双向 `send_message`、连接状态/自动重试、ACP/模型设置能力 | 大多已在 alpha.4 基线；不新增 Desktop 侧 API。 |
| 附件与工具 | release note 包含图片后台压缩上传、轨迹图片、`web_fetch` 默认可用、PTC mode 调整 | 大多已在 alpha.4 基线；不把实验性 Bundle 直接加入生产闭包。 |
| 运行时修复 | release note 包含 Node 24.0–24.11.1 启动/HMR、Profile preset 和持久 shell 修复 | 大多已在 alpha.4 基线；Desktop 内置 Node 24.9.0，仍须实机回归。 |
| 存储安全 | alpha.4 后新增投影缓存/JSON 存储跨版本读取、备份及损坏记录跳过恢复 | 现有 18 个 dsh 补丁未覆盖这些文件，按新 tgz 原样保留。 |

包名集合和 `@deepseek-ai/dsh` 运行时闭包相对 alpha.4 均无增删。因此没有把 Inspector、Web
Preview 或其他可选 Bundle 意外打入桌面应用。

## 补丁迁移

保留 `@deepseek-ai/cordis-plugin-loader@1.0.3` 的 vendor 补丁；其余 18 个
`@deepseek-ai/dsh*` 补丁文件名由 `0.1.2-alpha.4` 改为 `0.1.2-rc.1`。上游本次未变更这些
补丁覆盖的源码文件，版本标识迁移后仍必须由 `patch-package` 的 clean install 结果验证。

## 验证

- 上游标签：`pnpm install --frozen-lockfile`、`pnpm run build:official`、两类 `release/pack.ts` 成功。
- 产物闭包：242 个 dsh、9 个 vendor tarball；与 alpha.4 的包名及根运行时闭包一致。
- Desktop：待执行 `npm ci`（含 postinstall/patch-package）、测试、typecheck 与构建验证。
