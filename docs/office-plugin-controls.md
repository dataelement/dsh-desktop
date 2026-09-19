# Office 办公统一开关

在「设置 → 插件 → 插件配置」中提供一个「Office 办公」入口，共用一个开关控制当前安装的 PPT、Word、Excel 能力。默认启用。标题为「Office 办公」，描述为「制作和编辑 Word、Excel、PPT。」。复用 DS 插件配置卡片的字号、颜色、间距和边框，右侧使用 DS Switch；正常状态显示标题、描述与开关。

## 用户行为

- 停用后，格式入口、模板与案例入口、专用 Skills、工具和自动注入的 Office 指令随插件一起退出后续执行。
- 当前运行的任务及其子任务继续完成。等待期间禁用开关，悬停提示「当前任务结束后生效」；随后提交的任务等待切换完成，再按有效设置执行。
- 重新启用后恢复格式入口和已保存的模式选择。开关操作保留未发送草稿、附件、历史消息、文件、个人模板及配置。
- 用户选择保存在当前 `DSH_HOME/desktop-office/settings.json`，重启和配置重载沿用。设置文件采用原子替换，保留最近 50 次显式变更记录。
- 保存或插件切换失败时恢复先前状态，页面展示重试入口。

## 实现

`dsh-desktop-office-controls` 管理 `dsh-ppt`、`dsh-ppt-composer`、`dsh-office` 的 Cordis Loader 生命周期。Word、Excel 共用 `dsh-office`；PPT 由 `dsh-ppt-composer` 接入 `dsh-ppt`。依赖消费者先停用，提供方先启用。

Host 在 `appReady` 后应用持久化设置，该时点涵盖启动时的用户配置扫描。后续 Include 重载在解析配置时带入当前关闭状态。工具执行保护与下一轮上下文清理使用同一份有效状态。

管理接口为 `GET/POST /dsh-desktop/office`，沿用 Connection 的登录、Host 和 Origin 校验；POST 接受一个布尔 `enabled` 字段。`GET /dsh-desktop/office?clients=1` 返回同一 Host 的客户端模块图。

插件配置页通过 `settings.plugin.control` 列表插槽接收具备独立生命周期接口的即时控制条目；已有 `settings.plugin.item` 继续按 Host settings namespace 分发表单。两者共用列表；`PluginToggleCard` 直接复用原生配置卡片 CSS 和 DS Switch，Office 客户端只提供状态和文案。

客户端通过 Loader 实时启停 Office 界面。关闭状态下打开的客户端，在重新启用时通过 `ClientModuleSystem.updateGraph()` 获取新增模块，再交由 Loader 创建入口。模块更新使用独立 bundle URL，保留已载入模块的状态。该接口通过现有 Harness 依赖补丁交付。

## 基线与集成范围

2026-09-15 迁移核对：目标分支为 `upstream/V0.9.1@f4f0fbde30e56d2f436ebfa06409b3b04136414c`，PR #432 在原工作树 `.worktrees/dsh-desktop-office-plugin-toggle` 继续维护。Harness 声明及安装版本均为 `0.1.5-rc.2`，版本分支与原基线的依赖和运行代码一致。版本分支已包含的灰度类型声明及测试修正直接采用其现有实现，Office 运行文件保留已验证内容。

当前 `V0.9.1` 已包含 PPT。Word、Excel 来自 [PR #424](https://github.com/dataelement/dsh-desktop/pull/424)，验证头为 `6343ae89c53c8d431164237bc758037cd8989f7c`。本改动按当前装配识别格式；Word/Excel 装配后自动纳入同一个开关。入口统一展示 Office 的三种格式说明。生图插件继续独立运行。

## 验证

| 层次 | 结果 |
| --- | --- |
| 干净依赖安装 | `npm ci --prefer-offline --no-audit --no-fund` 通过，依赖补丁全部应用 |
| 自动回归 | `V0.9.1` 迁移后 106 个文件、925 项通过，其中开关及客户端专项 14 项 |
| 三格式组合回归 | #424 与主线组合：开关、模式、业务 Skills、运行契约、PPT 激活及插件闭包共 43 项通过 |
| 类型与构建 | `npm run typecheck`、`npm run build` 通过 |
| 真实 Host | `V0.9.1` PPT 装配重新验证通过；此前 main 与 #424 组合均通过启停、真实 Loader 清单、登录/Origin/请求体校验、重启关闭状态及配置重载；组合版 Word/Excel 的可调用 Skills 随开关变化 |
| 浏览器交互 | Office 直接位于「插件配置」，复用 DS 原生卡片与 Switch；文案按产品要求精简；单入口单开关；三种格式和案例收起/恢复；草稿保留；关闭状态打开客户端后重新启用可恢复三种格式 |
| 原生应用与文档交付 | Electron 安装包、真实模型生成和 Word/Excel/WPS 编辑保存重开为 NOT_RUN |

Host 检查使用隔离的 `DSH_HOME`，创建空工作区和会话，调用方式：

```sh
node scripts/verify-office-controls.mjs
```

`--keep --leave-disabled` 保留隔离 Host 和关闭状态供界面验收；启动链接保存在测试目录的 `browser-url.txt`。以 `OFFICE_CONTROLS_HOME` 指定保留的测试目录可复验重启。测试会临时更改该目录的用户配置并恢复，使用专用验收目录。

PPT Skill 为模式内部使用，`userInvocable=false`；用户 Skills 列表检查 Word、Excel，PPT 通过 Loader 生命周期与格式入口验证。

`V0.9.1` 已包含灰度类型声明及两处测试断言修正，PR 相对该版本的差异集中于 Office 功能；发布工作流的 PR 目标分支列表加入 `V0.9.1`，迁移后继续运行 Windows 检查。历史三格式试用包基于此前组合提交，其制品证据独立记录。
