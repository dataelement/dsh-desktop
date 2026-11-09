<h1 align="center">
  <img src="docs/images/readme-logo-black-rounded.svg" width="64" alt="DSH Desktop Logo" valign="middle" />
  DSH Desktop
</h1>

<p align="center">
  <strong>DSH Desktop by Dataelem</strong>（DSH 客户端）是 Dataelem 团队基于 DeepSeek Harness 框架打造的桌面 Agent 应用，提供开源版与<a href="https://www.dshdesktop.com/zh/enterprise/">企业版</a>。<br />
  官方网站：<a href="https://www.dshdesktop.com/">www.dshdesktop.com</a>
</p>

<p align="center">
  <a href="README.md">简体中文</a> · <a href="README.en.md">English</a> · <a href="README.ja.md">日本語</a> · <a href="README.ru.md">Русский</a> · <a href="README.es.md">Español</a> · <a href="README.pt.md">Português</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-171513.svg" /></a>
  <img alt="macOS" src="https://img.shields.io/badge/macOS-Apple%20Silicon%20%7C%20Intel-171513.svg" />
  <img alt="Windows" src="https://img.shields.io/badge/Windows-x64-171513.svg" />
</p>

![DSH Desktop 的 Preset、模型提供方、手机控制与可编辑 PPT 生成功能](docs/images/dsh-desktop-hero-v021.png)

基于 DeepSeek Harness，增强主流模型适配、Word / Excel / PPT 模板、启动异常恢复与工作台，提供开箱即用的桌面体验。

## 下载安装

请前往[官方网站](https://www.dshdesktop.com/zh/)下载 DSH Desktop。

DSH Desktop 会自动检查更新。新版本会先进行灰度测试，确认稳定后再向所有用户全量推送。

## 加入社区

<p align="center">
  使用微信扫描下方二维码，加入 DSH Desktop 微信交流群。<br />
  <img src="docs/images/wechat-group-20260815.png" width="220" alt="DSH Desktop 微信群二维码" /><br />
  也可以加入 <a href="https://discord.gg/7Xgf3qe3Qp">DSH Desktop Discord 社区</a>。
</p>

## DSH Desktop 带来了什么

DeepSeek Harness 提供 Agent Runtime、Web UI 和基础模型接入能力。DSH Desktop 复用这些基础，重点增强以下体验：

- **主流模型适配**：优化模型提供方配置与首次接入，补充模型搜索、图片输入及推理能力配置，并改善第三方模型兼容性。
- **Office 三件套模板**：提供 Word 原生套版、Excel 案例工作簿及 PPT 可编辑模板，结合业务技能生成 DOCX、XLSX、PPTX；桌面端随附 Python 和 Office 处理依赖。
- **启动异常与插件故障恢复**：结合启动和前端诊断定位问题，提供引导恢复、安全模式及修复 Agent 入口，尽量保留用户会话与配置。
- **工作台**：集中浏览、安装和打开工作台应用，支持市场安装与本地导入，并复用 Harness 会话交互。
- **Agent Preset 迁移**：通过 [`.dshpreset` 包](docs/preset-packages.md)导入导出自定义 Preset，安装前检查冲突并提示信任风险。
- **手机连接**：扫码配对后，通过局域网或可选公网隧道在手机上继续会话。
- **原生桌面体验**：自动管理 Harness 启停，集成系统目录选择、原生菜单与窗口；应用升级保留用户数据，并提供自动更新检查。

## Office 三件套

提供 Word、Excel、PPT 三种制作模式。选择模板并提供材料，即可让 Agent 按模板制作可继续编辑的文件。

- **Word**：沿用原生模板的版式与样式，适合通知、纪要、报告等文档，输出 DOCX。
- **Excel**：基于案例工作簿整理数据、制作分析与图表，输出 XLSX。
- **PPT**：内置 **16 套模板、192 种版式**，输出可编辑 PPTX，也支持导入个人模板。内置模板预览使用英文，生成内容支持中文和英文；预览语言不决定输出语言。

桌面端随附 Python 和 Office 处理依赖，无需另行安装这些运行环境。PPT 模板模式的自动提示词仅在当前会话启用该模式时生效。

## 工作台

工作台把面向具体业务的操作界面与 Agent 会话结合起来，让常用任务不再只有聊天入口。

你可以在工作台市场浏览、收藏和安装应用，也可以导入本地开发的工作台。打开后，在业务界面中操作，并结合关联的 Agent 会话完成任务；安装或更新后，按界面提示重启即可加载。移除工作台不会删除已有会话和项目文件。

## 手机连接

从 `Harness` 菜单选择“连接手机…”，再扫描配对二维码。

- WiFi 下扫码即可连接。
- 互联网隧道需要再输入电脑上显示的 6 位连接密码。默认是 5 分钟、只存在内存里的临时密码；只有在「连接手机」窗口勾选同意后，才会在本机生成长效密码。

Harness 本身始终运行在随机的 `127.0.0.1` 端口。手机访问由独立的配对 Bridge 提供。Cloudflare Quick Tunnel 是常态长连接路径；免费 Pinggy 是 Cloudflare 不可用时（如中国大陆）的备用通道，大约 60 分钟后失效。桌面端断开连接后，手机会话随即失效。

Cloudflare 启动失败时会尝试 Pinggy。若已显示 Cloudflare 配对链接，但手机无法打开，可点击“**扫码打不开？换一条线路**”切换到 Pinggy。

## 安全模式与故障恢复

如果第三方插件导致启动或页面渲染异常，DSH Desktop 会结合 Runtime 与前端证据定位相关插件，并打开引导式恢复界面。

从 `Harness` 菜单选择“以安全模式重启…”，可暂时屏蔽第三方插件，同时保留 Agent、会话、模型配置和工作区。你可以在管理界面停用问题插件，再重启正常模式验证；停用不会删除插件和用户数据，之后可以重新启用。

恢复页面会检查插件是否有兼容更新；有可用版本时，可升级对应插件，安全模式还支持批量升级。需要帮助时，鼠标悬停“**微信群**”即可显示二维码，点击 **Discord** 则会打开社区链接。

当正常界面无法进入时，也可以通过 `--safe-mode` 启动。例如 macOS：

```sh
open -a "DSH Desktop" --args --safe-mode
```

## 本地数据与安全边界

- 会话与配置保存在本机用户数据目录，应用升级不会覆盖这些数据。
- 内置侧栏浏览器与应用权限隔离；普通外链交由系统浏览器打开。
- 手机通过扫码配对连接；互联网连接还需要输入电脑上显示的连接密码。
- Agent 的文件与命令操作受权限控制，请谨慎批准敏感操作，并只安装可信插件。

## 平台支持

| 平台 | 分发形式 | 状态 |
| --- | --- | --- |
| macOS Apple Silicon | 已签名并通过公证的 DMG/ZIP | 支持 |
| macOS Intel | 已签名并通过公证的 DMG/ZIP | 支持 |
| Windows x64 | 已完成代码签名的 NSIS 安装包 | 支持 |
| Windows ARM64 | — | 当前不支持 |
| Linux x64 | 由源码在本地构建的未签名 deb/AppImage | 支持本地构建，见 [Linux 移植指南](docs/linux-port.md) |

Harness 包含目标平台原生依赖，因此每一种正式安装包都在对应操作系统与架构上构建。Linux 安装包暂不由发布流程产出，请在将要运行该应用的 Linux 机器上自行构建。

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

## 了解企业版

企业版由 BISHENG 桌面客户端与 BISHENG 企业平台服务端组成。客户端基于 DSH Desktop，员工通过企业账号结合本地文件使用获准的模型、知识、工具和技能；服务端集中配置资源与权限，管理积分和用量。企业版的 BISHENG 客户端与服务端均已开源，可通过下方仓库获取源码。

[企业管理平台开源仓库](https://github.com/dataelement/bisheng) · [企业版客户端仓库](https://github.com/dataelement/bisheng-desktop) · [企业版介绍](https://www.dshdesktop.com/zh/enterprise/)
