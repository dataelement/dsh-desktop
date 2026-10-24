# Harness 0.2.0-rc.2 升级记录

仓库内所有 `@deepseek-ai/dsh-*` 依赖从 `0.1.7-rc.2` 固定到 `0.2.0-rc.2`。上游 `@deepseek-ai/dsh` 的依赖集只新增了 `dsh-experimental-schedule-bundle`，Cordis 系包版本不变。仓库内插件和 PPT 运行时的 dsh peer 区间追加 `^0.2.0-rc.1`。

## 补丁处理

- 13 个 dsh 补丁（另有 `cordis-plugin-loader`、`undici` 两个）可原样重放，只改文件名。
- 11 个补丁上下文失效，采用三方合并迁移：以旧版原始包为基准，把旧补丁的改动合入新版原始包，再用 `patch-package` 重新生成。`@deepseek-ai/dsh` 补丁要修改 `package.json`，需用 `--exclude '^$'` 覆盖默认排除规则。
- 需要人工处理的冲突：
  - `dsh-client-ui-agent-preset`：上游移除了 `AgentPresetSection` 的 `useDeveloperTools`，导入/导出/搜索逻辑照旧追加。
  - `dsh-client-ui-chat`：上游让 Desktop 默认使用 `standard` 记录视图，`openUploadedAttachment` 提供者接在新的构造之后。
  - `dsh-client-ui-settings-models`：上游在编辑器提交时新增 `onSubmitCredential`，同步写入 Desktop 的 `footerProps`。
  - `dsh-client-ui-workspace` 类型：采用上游新的 `forkSession(sessionId, onCreated?) => Promise<SessionId>` 签名，保留 Desktop 的 `deleteSession` 及注册接口。
- 删除 `dsh-client-ui-model-selection` 补丁及其测试：上游 0.2.0 已原生提供模型搜索（超过 4 个模型时显示，按名称排序，带清除按钮）。与旧补丁的区别：搜索不再匹配服务商名称，模型少于 5 个时不显示搜索框。

## 验证边界

已执行：全新 `npm ci` 重放 26 个补丁、`npm run typecheck`、`npm run ppt:build` 后完整 `vitest`（170 个文件、1539 个用例）、`npm run build`、`scripts/verify-harness-auth.mjs`。macOS 开发构建使用临时 userData 启动：Harness 就绪，客户端完成挂载，Agent 预设页的导入、Awesome preset 和搜索可用，模型选择器可以打开。

未执行：Windows 验证、安装包打包与安装、Safe Mode 真机启动、自定义预设导出、超过 4 个模型时的搜索交互，以及市场插件在 0.2.0 下的兼容性（启动时多个已安装市场插件报告 peer 区间不含 0.2.0-rc.2 的兼容性警告，但未阻止启动）。
