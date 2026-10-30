# Harness 0.2.1-rc.2 兼容升级

本文保留依赖升级阶段的审计和验收记录。后续稳定性工作见
[0.12.1 稳定性修复清单](0.12.1-stability-fix-checklist.md)：新增 settings 写入校验，
当前补丁总数为 31；该阶段的变更和验收结果另列于清单中。

## 基线与范围

Desktop 版本保持 `0.12.1`，Harness 从 `0.2.1-rc.1` 升至 npm 发布的
`0.2.1-rc.2`。上游 tag 为 `dsh-v0.2.1-rc.2`，提交
`687f282e8625c6b8d11ff58211a90524be2e4317`。

根 manifest、Office 精确 peer 和锁文件同步升级。锁文件中 303 个 Harness 包
全部固定 rc.2；其余宿主插件已有的 `^0.2.1-rc.1` 区间接受 rc.2，继续保留。
Cordis、Electron、LibreOffice Kit 和其他第三方依赖保持原锁定版本。
六份 README 与开发指南同步当前基线，rc.1 升级记录保留为历史。

上游主要新增 DeepSeek Search/Fetch API 选择开关与临时 1017 模型徽标。
`dsh-web-deepseek-api`、`dsh-client-ui-deepseek-model-label-1017` 随官方 bundle
进入传递闭包，不提升为 Desktop 直接依赖。默认仍使用 Messages 搜索和 HTTP 抓取。

本次覆盖 Profile 组合、后端加载、客户端发现、HTML 引导和客户端激活。
普通 Profile 仍从 Profile 入口解析插件，明确的宿主 peer fallback 与 Safe Mode
安装资源 anchor 均沿用原规则。中立 launch-root 不承担依赖解析；原始 cause、阶段
诊断和恢复入口继续由原宿主实现保留。本次没有改动加载器或启动协议。

## 补丁审计

分别提取旧版原始发布包、当前已打补丁文件和新版原始发布包，逐项比较 25 个
Harness 补丁涉及的全部 65 个文件。23 个包的目标文件在归一版本号后完全一致；
另外两个包只有构建标识变化：

| 包 | rc.2 原始文件差异 | 处理 |
| --- | --- | --- |
| dsh-client-modules | lib/index.js 中 release commit 从 ed75efe 变为 332895e | 保留 rc.2 标识及全部宿主解析、隔离补丁 |
| dsh-client-ui-sidebar | lib/client.js 中版本与 commit 标识更新 | 保留 rc.2 标识及全部导航、布局补丁 |
| 其余 23 个 Harness 补丁包 | 目标文件无功能变化 | 保留原补丁行为，迁移到 rc.2 文件名 |
| cordis-plugin-loader 1.0.6、libreoffice-kit 0.1.5、pi-ai 1.3.0、node-pty 1.2.0-beta.15、undici 8.11.2 | 锁定版本未变 | 保留五个补丁 |

没有发现可删除的功能 hunk。具体职责、回归入口和移除条件沿用
[rc.1 审计清单](harness-0.2.1-rc.1-upgrade.md)。`dsh` manifest 补丁中的
Harness 版本同步 rc.2。安装后再次比较所有 65 个目标文件，除版本/构建标识外，
与旧版已打补丁文件完全一致；最终仍为 30 个 patch。

## 验证结果

2026-10-19，macOS arm64：

- 干净 `npm ci --no-audit --no-fund` 完成：30/30 补丁、品牌资源与 Electron
  postinstall 全部成功。
- `npm run typecheck`、`npm run build`、`git diff --check` 通过。
- 完整 `npm test`：214 文件、2159 用例全部通过，包含真实子进程启动、普通及
  本地链接插件、缺少宿主 peer、Safe Mode、客户端 bootstrap 执行注册和包闭包回归。
- `node scripts/verify-target.mjs darwin arm64` 通过：Electron 43.0.0 / Node
  24.17.0 可以加载 Harness 原生 loader。
- `node scripts/probe-electron-node-runtime.mjs` 通过：临时 Profile、Electron
  Node 模式启动、认证 cookie 与 HTML 200。
- 使用独立开发 Profile 启动实际 Electron 应用，确认专用 userData、DSH_HOME
  和中立 launch-root。macOS UtilityProcess 就绪，原生 renderer 已挂载主界面、
  Standard mode、PPT/Word/Excel 入口；设置显示 `0.2.1-rc.2`。
- 对该独立 Profile 验证 session/list：未认证 401，认证后 200。
- 使用 tabbit 检查真实浏览器，完成主界面、设置与插件页加载；新版 Web Search API
  开关默认关闭，开启并保存后显示 Search/Fetch 地址与结果数，刷新后仍保留；
  再关闭保存恢复 Messages 默认配置。截图已检查，操作期间无 pageerror。

变动测试为 `release.test.ts` 和 `session-delete-patch.test.ts`。前者同步基线，
新增整个 Harness 闭包版本一致性及新增官方包不被直接提升的断言；后者同步补丁
文件版本，保留原删除行为验证。完整回归首次仅因六份 README 版本过期失败，
同步文档后重跑全套成功。

未完成 Windows 原生验证、签名安装包/安装升级、真实模型及 Search/Fetch API
请求、第三方市场插件组合与全部 slot 的视觉组合验收。当前安装应用未被替换，
真实用户 Profile 未修改，也未提交、推送或发布。

## Inspector 限制

rc.2 的 `dsh-experimental-inspector` 仍拒绝 `globalThis.fetch` 访问器。
此前定位到的 Billion Context fetch guard 冲突不会因本次依赖升级自动消失；
本次未加入该问题的独立修复或改动用户插件配置。
