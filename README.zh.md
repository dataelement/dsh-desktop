<h1 align="center">
  <img src="docs/images/readme-logo-black-v020.png" width="64" alt="DSH Desktop Logo" valign="middle" />
  DSH Desktop
</h1>

<p align="center">
  为 <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a> 打造的本地优先、跨平台桌面应用。
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ru.md">Русский</a> · <a href="README.es.md">Español</a> · <a href="README.pt.md">Português</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-171513.svg" /></a>
  <img alt="macOS" src="https://img.shields.io/badge/macOS-Apple%20Silicon%20%7C%20Intel-171513.svg" />
  <img alt="Windows" src="https://img.shields.io/badge/Windows-x64-171513.svg" />
</p>

![DSH Desktop 的 Preset、模型提供方与手机控制能力](docs/images/dsh-desktop-hero-v020.png)

<p align="center"><strong>使用 DeepSeek 官方模型或主流第三方模型，管理可移植的 Agent Preset，并在手机上继续 Harness 会话。</strong></p>

DSH Desktop 把本地 DeepSeek Harness 封装为可安装的桌面应用。它会自动启动 Harness，把 Profile、插件、工作区、模型配置和会话保存在应用安装目录之外，并在本地 Runtime 就绪后直接进入完整 Harness 界面。

> [!IMPORTANT]
> DSH Desktop 当前处于早期预览阶段，基于仍在快速迭代的 `@deepseek-ai/dsh@0.1.1-rc.2`。macOS 正式包已完成代码签名并通过 Apple 公证；Windows x64 安装包也已完成代码签名。随着下载量、安装量和发行者信誉逐步积累，Windows 安全提示会逐渐减少，但不会立即消失。

## 下载安装

请前往 [DSH Desktop 官网](https://www.dshdesktop.com/#download)下载 macOS 和 Windows 安装包。

安装版会在启动后及每六小时检查更新。发现新版本时，DSH Desktop 会先询问用户；同意后才开始下载，只有选择“重新启动并安装”后才会进入安装。你也可以从应用菜单手动检查，或跳过当前版本而不影响后续版本提示。

## 加入社区

<p align="center">
  使用微信扫描下方二维码，加入 DSH Desktop 微信交流群。<br />
  <img src="docs/images/wechat-group-20260815.png" width="220" alt="DSH Desktop 微信群二维码" /><br />
  也可以加入 <a href="https://discord.gg/he2gAKCpj">DSH Desktop Discord 社区</a>。
</p>

## DSH Desktop 带来了什么

DeepSeek Harness 已经提供 Agent Runtime 与 Web UI。DSH Desktop 在此基础上补齐真正的桌面宿主能力：

- 自动启动和停止 Harness，不需要另开 CLI 或浏览器标签页
- 通过系统原生目录选择器添加和管理项目工作区
- 支持 DeepSeek 官方模型与主流第三方模型提供方
- 将完整的自定义 Agent Preset 导入或导出为便携的 [`.dshpreset` 压缩包](docs/preset-packages.md)，安装前检查命名冲突并提示信任风险
- 应用升级时保留 Profile、插件、工作区、会话和模型配置
- 识别 Harness 启动或前端插件故障，把诊断写入 `harness.log` 并提供引导恢复入口
- 提供不破坏用户数据的安全模式，临时屏蔽第三方插件
- 让已配对的手机通过局域网或可选的临时公网隧道继续会话
- 在应用内检查桌面更新，并由用户决定是否下载和安装
- 针对 macOS 和 Windows 优化原生菜单、标题栏、窗口焦点、主题和品牌体验

## 手机连接

从 `Harness` 菜单选择“连接手机…”，再扫描配对二维码。手机获得会话访问权限前，桌面端必须明确批准连接。

Harness 本身始终运行在随机的 `127.0.0.1` 端口。手机访问由独立的配对 Bridge 提供：可以只在局域网内使用，也可以在你选择远程访问时启用临时 Cloudflare Quick Tunnel。桌面端断开连接后，手机会话随即失效。

## 安全模式与故障恢复

如果第三方插件导致启动或页面渲染异常，DSH Desktop 会结合 Runtime 与前端证据定位相关插件，并打开引导式恢复界面。

从 `Harness` 菜单选择“以安全模式重启…”，应用会使用只包含官方核心 Bundle 的隔离 Profile 启动。正常 Profile 中的第三方插件会被屏蔽，但 Agent、会话、模型配置和工作区仍然可用。你可以从页面顶部的安全模式提示卸载选中的问题插件，或恢复正常启动。

当正常界面无法进入时，也可以通过 `--safe-mode` 启动。例如 macOS：

```sh
open -a "DSH Desktop" --args --safe-mode
```

## 插件兼容性

DSH Desktop 通过 `dsh-market` 提供社区插件市场。需要注意：

- 部分社区插件是 CLI-only 插件（例如终端 TUI 类插件），它们只针对命令行场景设计，在 DSH Desktop 的 Web Profile 中既无法运行，也可能与官方核心 Bundle 的 loader 条目 id 冲突，导致 Harness 启动失败。
- `dsh-market` 1.10.1+ 会在安装前检测 loader 条目 id 冲突，并自动移除冲突的插件，因此请保持 `dsh-market` 为最新版本（DSH Desktop 的安装器默认会拉取 `latest`）。
- 如果已经因为安装了不兼容的插件（例如 `dsh-tui`）而无法启动 Harness，请使用上面的安全模式重启，然后在安全模式提示中卸载问题插件；之后再回到正常启动。

## 本地数据与安全边界

- Harness Web UI 只运行在随机回环端口。
- Renderer 不具备 Node.js 权限，并启用 Context Isolation 与 Sandbox。
- WebView、不可信站内跳转和非预期权限请求会被阻止。
- 外部网页链接交给系统浏览器打开。
- Profile 与会话保存在 Electron 的用户级应用数据目录，不在安装目录内。
- 手机访问需要短时配对 Token 和桌面端明确批准。

## 平台支持

| 平台 | 分发形式 | 状态 |
| --- | --- | --- |
| macOS Apple Silicon | 已签名并通过公证的 DMG/ZIP | 支持 |
| macOS Intel | 已签名并通过公证的 DMG/ZIP | 支持 |
| Windows x64 | 已完成代码签名的 NSIS 安装包 | 支持 |
| Windows ARM64 | — | 当前不支持 |
| Linux | — | 当前不支持 |

Harness 包含目标平台原生依赖，因此每一种正式安装包都在对应操作系统与架构上构建。

## 开发与架构

欢迎参与贡献。工程说明已拆分为独立文档：

- [开发指南](docs/development.md) — 本地环境、验证、补丁维护与原生平台打包
- [运行架构](docs/architecture.md) — 启动流程、持久化数据、安全边界、故障恢复、手机连接与更新
- [发布手册](docs/release-runbook.md) — 签名与正式发布控制
- [Preset 包格式](docs/preset-packages.md) — 可移植 Agent Preset 契约

提交修改前请运行 `npm test`、`npm run typecheck` 和 `npm run build`，并实际操作受影响的应用流程。请勿在 Issue、日志、截图或测试数据中提交真实 API Key。

## 友情链接

[dsh-market](https://github.com/dsh-market/dsh-market) 是 DeepSeek Harness 社区插件市场，可在 Harness 界面中浏览和搜索插件、查看截图、安装或更新包、启停插件以及切换主题。

## 许可证

DSH Desktop 采用 [MIT License](LICENSE) 开源。

DeepSeek Harness 及其依赖仍遵循各自的上游许可证与商标规则。DSH Desktop 是独立的社区桌面应用。
