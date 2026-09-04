# 升级到 Harness 0.1.2-alpha.4

> 后续 `0.1.2-alpha.4` → `0.1.2-rc.1` 的升级见 [harness-0.1.2-rc.1-upgrade.md](./harness-0.1.2-rc.1-upgrade.md)。

对照上游 [`dsh-v0.1.2-alpha.4`](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.2-alpha.4)
（commit `ad05e08b11c97a8ec58d20367eb70b86a070624d`）从 `0.1.2-alpha.3` 升级。

前两段升级见：
- `0.1.1-rc.2` → `0.1.2-alpha.1`：[harness-0.1.2-upgrade.md](./harness-0.1.2-upgrade.md)
- `0.1.2-alpha.1` → `0.1.2-alpha.3`：[harness-0.1.2-alpha.3-upgrade.md](./harness-0.1.2-alpha.3-upgrade.md)

## 状态

升级已完成并验证：

```
npm ci（含 postinstall）  → 0；19 个补丁全部 clean apply (0 warn, 0 error)
npm run build             → ok (628kB main / 31kB preload)
npx vitest run            → 76 files / 569 tests 全绿，exit 0
tsc --noEmit（typecheck） → 0 错误
scripts/verify-harness-auth.mjs → 捕获令牌 → 401(无 cookie) → 303(令牌换 cookie) → 200(带 cookie) 全通过
会话分页冒烟验证 (session/page) → 创建会话 + session/page throughSeq: -1 正常响应 200，records / hasMore 结构完整
实际启动 Electron          → 正常启动；profiles/node_modules 桌面插件全部挂载；无 plugin-recovery UI
```

**唯一未完成的一步**（同前序 alpha 版本）：上游尚未发布到 npm registry，依赖指向仓库内本地打包的 tarball。上游正式发布后需要把 `package.json` 换回语义化版本并重新生成 lockfile。

## 本地打包

上游打包命令：

```bash
git clone --depth 1 --branch dsh-v0.1.2-alpha.4 \
  https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
corepack enable                      # packageManager 指定 pnpm@11.7.0
corepack pnpm install --frozen-lockfile
corepack pnpm run build:official     # release:pack 要求 official 客户端构建记录
corepack pnpm exec tsx scripts/release/pack.ts --family vendor --out dist/npm-vendor --concurrency 8
corepack pnpm exec tsx scripts/release/pack.ts --family dsh    --out dist/npm-dsh    --concurrency 8
```

产出 **9 个 vendor + 245 个 dsh** tarball，保存在 `packages/harness-0.1.2-alpha.4/`（含各 family 的 `publish-order.txt`）。旧目录 `packages/harness-0.1.2-alpha.3/` 已在同一提交删除。

## 核心架构变化与协议影响

### 1. 会话 Seq / LogOffset 编译期 Branded Types
上游在 `dsh-session` 中将会话序列号与日志偏移量引入了 TS 编译期 Branded Type（`SessionSeq(number)` / `SessionLogOffset(number)`）。
- **对 Wire 协议无破坏**：在 HTTP / JSON-RPC / WebSocket wire 传输与 JSONL 文件存储中，依然是标准的 JavaScript number，`session/page` 入参 `throughSeq` / `beforeSeq`、事件对象的 `event.seq` 均为普通数值。
- **对 API Controller 的影响**：在 TS 签名中，`create(meta, inheritedEventCount?: SessionLogOffset)` 增加了可选偏移量参数；`PersistenceBackend.appendBatch` 入参由 `(meta, events, isMaterialized)` 调整为 `(storage, events, isMaterialized)`。

### 2. 模型设置与候选模型实时搜索
`dsh-client-ui-settings-models` 在 alpha.4 中为候选模型列表增加了过滤能力，相关全选变量重命名为 `allVisibleCandidatesPicked` / `toggleVisibleCandidates`，桌面端已对齐该断言。

## 补丁变迁表（全部 19 个补丁）

| # | 补丁包名 | alpha.4 处置 | 变更说明 |
|---|---|---|---|
| 1 | `@deepseek-ai/cordis-plugin-loader` | 保留 (1.0.3) | Vendor 包版本保持 1.0.3，机械应用通过 |
| 2 | `@deepseek-ai/dsh` | 适配 (alpha.4) | 运行时依赖项对齐 |
| 3 | `@deepseek-ai/dsh-api-session-controller` | 适配 (alpha.4) | 补齐 `agent.d.ts` 的 `AgentHandle` 导入；保留 remote event 补丁 |
| 4 | `@deepseek-ai/dsh-client-modules` | 适配 (alpha.4) | 桌面端动态模块加载对齐 |
| 5 | `@deepseek-ai/dsh-client-ui-agent-preset` | 适配 (alpha.4) | 预设 UI 样式与挂载点对齐 |
| 6 | `@deepseek-ai/dsh-client-ui-chat` | 适配 (alpha.4) | Markdown 渲染与本地路径点击 seam 对齐 |
| 7 | `@deepseek-ai/dsh-client-ui-deliverables` | 适配 (alpha.4) | Bundle 行号漂移重新对齐，保留 localPathReference |
| 8 | `@deepseek-ai/dsh-client-ui-directory-picker-native` | 适配 (alpha.4) | 原生目录选择器钩子 |
| 9 | `@deepseek-ai/dsh-client-ui-layout` | 适配 (alpha.4) | 窗口与托盘布局适配 |
| 10 | `@deepseek-ai/dsh-client-ui-model-selection` | 适配 (alpha.4) | 适配 CSS 样式类（elevation stroke 与圆角），保留模型搜索框 |
| 11 | `@deepseek-ai/dsh-client-ui-settings-models` | 适配 (alpha.4) | 适配上游可见候选模型逻辑与行号对齐 |
| 12 | `@deepseek-ai/dsh-client-ui-sidebar` | 适配 (alpha.4) | 侧边栏布局与状态对齐 |
| 13 | `@deepseek-ai/dsh-client-ui-trajectory` | 适配 (alpha.4) | 轨迹流事件与错误处理对齐 |
| 14 | `@deepseek-ai/dsh-client-ui-workspace` | 适配 (alpha.4) | 适配 CSS module 样式（corner-shape、border），保留未读标记与定位菜单 |
| 15 | `@deepseek-ai/dsh-llm-deepseek` | 适配 (alpha.4) | DeepSeek Provider 错误格式化 |
| 16 | `@deepseek-ai/dsh-llm-pi-ai` | 适配 (alpha.4) | Pi AI Provider 集成适配 |
| 17 | `@deepseek-ai/dsh-session-persistence` | 适配 (alpha.4) | 永久删除能力（PersistenceCoordinator.delete）适配 SessionLogOffset |
| 18 | `@deepseek-ai/dsh-session-persistence-jsonl` | 适配 (alpha.4) | 永久删除存储清理（deleteStored）适配 alpha.4 方法签名 |
| 19 | `@deepseek-ai/dsh-workspace` | 适配 (alpha.4) | 工作区会话忘记（forgetSession）与清理逻辑对齐 |

## 验证结论

- **单元与集成测试**：76 个测试文件、569 个测试用例全部通过（0 失败）。
- **类型检查**：`npm run typecheck` 0 错误。
- **构建**：`npm run build` 成功输出 main 与 preload 构建产物。
- **端到端认证**：`scripts/verify-harness-auth.mjs` 4 阶段全通（令牌捕获、未鉴权 401、换取 cookie 303、带鉴权 200）。
- **实机与分页冒烟**：Electron 实机启动正常，插件加载无异常；`session/page` 接口在真实 `dsh web` 实例中成功分页获取数据。
