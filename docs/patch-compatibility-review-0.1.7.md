# 0.1.7-rc.1 补丁兼容性复核

范围：当前 baseline 的 25 个 patch-package 补丁，以及消费这些接缝的 Desktop 客户端插件。检查对象为实际安装的发布代码，不以补丁能应用作为运行正确的证明。

## 本轮发现并修复

1. **通用模型编辑器的未定义图标**：`ModelListEditor` 引用了已不存在的局部 `IconChevron` / `IconTrash`，会在有自定义模型行时抛错。改用当前 primitives 的 Regular 图标。新增通用编辑器展开、容量修改回归；保留搜索、视觉开关及推理配置。
2. **遗留模型向导的未定义状态**：`DeepSeekOnboardingDialog` 修改了一半，删掉 `onboardingReadiness(state)` 却仍读取 `readiness`。恢复原有状态推导并覆盖加载、缺密钥、已就绪及错误分支。当前 Desktop 已取消该向导的 slot 注册、使用自己的向导，因此这是潜伏代码问题，不能据此认定当前 Desktop 首次启动必然白屏。
3. **pi-ai 流式回放格式混用**：补全缺失 terminal content 时曾保存 Harness 的 `reasoning` / `tool-call`，而 `toPiReplayState` 要求原生 `thinking` / `toolCall`。改为保存原生 partial / toolCall，并保留签名；对外流式 block 仍为 Harness 格式。回归覆盖三个内容类型及回放签名。上游保证 terminal content 完整后，可删除这段补全逻辑。

前序已修复：模型选择器和模型配置页的旧图标导出、DeepSeek 容量编辑 helper；内置生图从旧 `settings.plugin.item` 迁到 `settings.plugins.tab`（后者属于自有插件，不是 patches 文件）。

## 全部补丁检查表

“未发现新增问题”仅表示本轮静态检查和相关源码回归范围内未发现，不表示全部平台、插件组合已验收。

| 包（省略 @deepseek-ai/；除特别说明外均为 0.1.7-rc.1） | 检查重点 | 结论 |
| --- | --- | --- |
| cordis-plugin-loader 1.0.5 | 超时、错误链、启动失败归属 | 未发现新增问题 |
| dsh | CLI 失败出口、宿主包依赖清单 | 未发现新增问题 |
| dsh-api-remotes | session.delete 编解码与服务映射 | 未发现新增问题 |
| dsh-api-session-controller | 文件访问、删除、预设迁移、远程事件 | 未发现新增问题 |
| dsh-app-boot | bundle 归属、禁用状态、启动审计 | 未发现新增问题 |
| dsh-client-file-upload | staged file 的 Agent 作用域 | 未发现新增问题 |
| dsh-client-modules | 客户端发现、combo 缓存、source map | 未发现新增问题 |
| dsh-client-ui-agent-preset | 导入导出、搜索、Modal 引用 | 未发现新增问题 |
| dsh-client-ui-attachment | 文件卡片回调、组件导出 | 未发现新增问题 |
| dsh-client-ui-chat | 上传文件打开链、错误提示 | 未发现新增问题 |
| dsh-client-ui-conversation | 输入区及 PPT slot 声明、props、图标 | 未发现新增接口缺失；布局改动仍由 PPT 组合测试覆盖 |
| dsh-client-ui-deliverables | 本地路径识别与文件打开 | 未发现新增问题 |
| dsh-client-ui-model-selection | 图标、搜索、推理等级 | 前序修复后未发现新增问题 |
| dsh-client-ui-settings-general | 设置入口、onboarding 条件 | 未发现新增问题 |
| dsh-client-ui-settings-models | 两类编辑器、向导状态、组件引用 | 本轮修复两项 |
| dsh-client-ui-sidebar | 品牌及平台间距接缝 | 未发现新增接口问题；不等于跨平台视觉验收 |
| dsh-client-ui-trajectory | provider 错误码展示 | 未发现新增问题 |
| dsh-client-ui-workspace | 导航接缝、未读、删除生命周期 | 未发现新增问题 |
| dsh-llm-deepseek | AUTH / QUOTA / FORBIDDEN 分类 | 未发现新增问题 |
| dsh-llm-pi-ai | 流式事件、回放、请求头 | 本轮修复内容格式混用 |
| dsh-plugin-manager | generation backend、commit/rollback 接口 | 未发现新增接口缺失；本轮不代表完成插件事务架构重写 |
| dsh-session-persistence | 可选删除接口 | 未发现新增问题 |
| dsh-session-persistence-jsonl | 删除租约及坏日志跳过 | 未发现新增问题 |
| dsh-workspace | 持久会话删除后的索引清理 | 未发现新增问题 |
| undici 8.11.0 | 新旧 Dispatcher 响应头及 trailers | 前序修复后未发现新增问题 |

## 防止同类遗漏

- `patch-runtime-compatibility.test.mjs` 从 patches 动态收集已修改 JS，检查未解析的局部标识符，覆盖未执行的条件分支；仅豁免宿主提供的 `global` / `setImmediate`。
- 同一测试核对所有被补丁修改的客户端对 primitives 的成员引用，不再只查两个包的图标。
- 同一测试核对四个维护中的 Desktop 客户端所注入的 slot 在当前安装 Harness 中确有声明。该检查不验证贡献项可见性、容器布局及生命周期。
- `model-settings-render.test.mjs` 执行两种模型编辑器及向导状态分支；`pi-ai-terminal-replay.test.mjs` 执行实际流转换及回放投影。

## 验收边界

干净补丁重放在独立临时项目中进行，安装 25 个补丁对应版本并通过 `npm ci --ignore-scripts` 后运行 `patch-package --error-on-fail`。该步骤验证补丁目标及重放，不等同于本仓库完整 postinstall（品牌资源、Electron 安装等）或安装包验收。

本轮未操作用户凭据、未保存模型设置、未发送付费模型请求。新增的通用编辑器修复仍需真实页面交互验收；pi-ai 修复仍需真实服务商的多轮推理/工具调用验收。Windows/macOS 最终安装包不在本轮已验证范围内。

本轮已执行：25 个补丁全部重放成功；51 个补丁目标文件与当前工作目录逐字节一致；完整回归 149 个文件 / 1251 项通过；`npm run typecheck`、`git diff --check` 通过。测试及重放均未修改真实 Profile。

`npm run build` 通过。该命令包含 PPT 资源构建及 Electron 编译，不包含签名或最终安装包验收。
