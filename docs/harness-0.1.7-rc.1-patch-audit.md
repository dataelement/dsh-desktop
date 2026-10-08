# Harness 0.1.7-rc.1 补丁审计

审计基准：`v0.10.0` 固定的 0.1.7-rc.1 npm 包、当前 `patches/`、Desktop 插件和相关测试。逐项检查补丁原始侧、安装后的实现和相邻公开接口；`npm ci` 验证补丁可从干净依赖重放。这里的“保留”表示该行为在当前发布包中仍需要 Desktop 适配，不表示应长期维持同一种 patch 形态。安装包和真实 UI 的验收另算。

## 已由上游接缝覆盖，删除补丁

| 原补丁 | 0.1.7 提供的能力 | 本次处理 |
| --- | --- | --- |
| `dsh-client-ui-directory-picker-native` | 客户端原生读取 `globalThis.__DSH_DIRECTORY_PICKER__`，缺失时回退 `ctx.uiWorkspace.pickDirectory()`；原补丁仅增加对 Desktop 自定义全局名的读取 | preload 直接暴露上游约定的窄接口，删除补丁；保留后端原生 picker 组合 |

上次升级时已删除的 `dsh-client-ui-sidebar-documentpreview`、`dsh-client-ui-sidebar-right` 补丁不在本次 24 个现存补丁内。旧补丁中的裸包名解析兜底也已从 `cordis-plugin-loader` 补丁移走，由 Desktop 的 `build/host-module-fallback.mjs` 负责；这属于 Desktop 更换实现位置，不能算上游已修复。

## 当前仍需兼容的补丁

| 补丁包 | 当前必要行为 / 0.1.7 边界 | 后续方向 |
| --- | --- | --- |
| `cordis-plugin-loader` | 初始化超时、未完成条目和原始 import/apply 错误归因 | 保留；诊断能力适合上游化 |
| `dsh` | Desktop 包加入 Harness/Profile 依赖闭包，启动错误保留 cause | 保留；包闭包注入需另设计声明入口 |
| `dsh-app-boot` | Profile bundle 归属和启动失败诊断，不吞准备失败 | 保留；与 loader 诊断一并收敛 |
| `dsh-client-modules` | 客户端包解析基准、单模块合包缓存和 source map 大文件开销 | 保留；解析和缓存可向上游提交 |
| `dsh-api-remotes` | Desktop 会话删除的 Typert 客户端 schema | 随删除 API 暂留；见重设计项 |
| `dsh-api-session-controller` | 会话删除、旧预设恢复兜底、上传文件授权后的宿主路径和前端调用 | 保留；按三种职责拆分重设计 |
| `dsh-client-file-upload` | 以 attachment ID 找到当前 Agent 尚未发送的暂存文件 | 随文件打开能力暂留 |
| `dsh-plugin-manager` | 让 Profile generation 后端承接安装和卸载，并保留原始运行日志 | 保留；验证宿主接口生命周期 |
| `dsh-session-persistence`、`dsh-session-persistence-jsonl` | 删除持久化会话及遇到损坏日志时继续列举其他会话 | 保留；删除协议随会话 API 一并重设计 |
| `dsh-workspace` | 删除会话时解除 workspace、归档列表及缓存关联 | 保留；随删除协议一并重设计 |
| `dsh-llm-deepseek`、`dsh-llm-pi-ai` | 区分 AUTH、QUOTA、FORBIDDEN；Pi 流式完成块与请求归因 | 保留；错误分类与流式修复适合上游化 |
| `dsh-client-ui-trajectory` | QUOTA/FORBIDDEN 的中英文用户提示 | 保留；可改走公开 locale 扩展 |
| `dsh-client-ui-deliverables` | 对未出现在本轮工具产物中的本地路径提供打开入口，同时排除包名/邮箱等误识别 | 保留；需要上游路径解析接缝 |

## 需要重新设计的 Desktop 定制

这些能力在 0.1.7 中尚无等价实现。为保持现有功能，本次先保留补丁；下表是下一轮应改变的实现边界，不把“补丁可重放”误当作设计完成。

| 优先级 | 补丁包 | 问题与建议落点 |
| --- | --- | --- |
| 高 | `dsh-api-session-controller`、`dsh-api-remotes`、`dsh-session-persistence*`、`dsh-workspace`、`dsh-client-ui-workspace` | 会话删除横跨生成的 Remote schema、Agent 生命周期、磁盘和 UI。先定义含取消、活动会话与持久化失败语义的 host 删除契约，再选择上游 API 或 Desktop 自有路由；避免持续修改生成文件。 |
| 高 | `dsh-api-session-controller`、`dsh-client-file-upload`、`dsh-client-ui-chat`、`dsh-client-ui-attachment`、`dsh-client-ui-conversation` | 文件打开链同时负责授权、暂存文件、宿主绝对路径与 UI 点击。应将路径授权保留在 host，仅向窄桌面 IPC/服务暴露经过校验的操作；UI 补丁只留下必要 slot 或回调接缝。 |
| 中 | `dsh-client-ui-conversation`、`dsh-client-ui-sidebar`、`dsh-client-ui-workspace` | Workbench frame、模式按钮、侧栏快捷切换、未读状态和路由都修改编译后的 React 树。向上游争取语义明确的 slot/导航 API，展示与状态留在 Desktop 插件。此次修正了 PPT 两个 slot 运行时 `kind/scope` 与已发布类型不一致的问题。 |
| 中 | `dsh-client-ui-settings-models`、`dsh-client-ui-model-selection`、`dsh-client-ui-agent-preset` | 模型目录、provider 选择、reasoning 配置、预设搜索与导入 UI 大量写入上游编译 bundle。应把产品 UI 放入自有 client 插件，通过字段和 slot 接缝接入；预设导入应直接写新组合条目，避免“先写旧目录、重启再迁移”的双格式流程。 |
| 中 | `dsh-client-ui-settings-general`、`dsh-client-ui-sidebar`、`dsh-client-ui-conversation` | 部分布局补丁拼接 CSS module 压缩类名，设置页补丁还扩大了 onboarding 的激活条件。改用稳定标记、公开主题变量或专用 slot，并单独定义 onboarding 显示条件。 |
| 低 | `dsh` | 修改第三方 `package.json` 保证 Desktop 依赖闭包是安装接缝，容易随 Harness 依赖布局变化。后续考虑由宿主显式声明受控包清单并由打包/投影流程消费；在替代方案完成前保留现有补丁。 |

其余 UI 补丁的现状：`dsh-client-ui-agent-preset` 负责导入导出与搜索，`dsh-client-ui-attachment` 和 `dsh-client-ui-chat` 负责上传文件点击，`dsh-client-ui-conversation` 负责文件回调与 PPT/Workbench 出口，`dsh-client-ui-model-selection` 负责模型搜索，`dsh-client-ui-settings-models` 负责 provider、目录与模型能力设置，`dsh-client-ui-sidebar` 负责品牌布局与快捷切换，`dsh-client-ui-workspace` 负责导航、删除和未读。这些行为不能仅因 0.1.7 包可加载就删除。

## 验证边界

本次要求 `npm ci` 在移除补丁后重放剩余 24 个 patch，运行对应测试、完整测试、类型检查、构建和 `git diff --check`。源码和 Harness 子进程验证不等于正式安装包的 macOS/Windows UI 验收；上述重设计项需要分别验证实际 slot 挂载、会话删除故障路径及文件授权边界。
