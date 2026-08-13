![DSH Desktop 模型提供方接入界面](docs/images/model-provider-onboarding.png)

<p align="center">
  <img src="build/icon.png" width="144" alt="DSH Desktop logo" />
</p>

<h1 align="center">DSH Desktop</h1>

<p align="center">
  A local-first, cross-platform desktop shell for
  <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a>.
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh.md">简体中文</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-171513.svg" /></a>
  <img alt="macOS" src="https://img.shields.io/badge/macOS-Apple%20Silicon%20%7C%20Intel-171513.svg" />
  <img alt="Windows" src="https://img.shields.io/badge/Windows-x64-171513.svg" />
</p>

DSH Desktop 把 DeepSeek Harness 的本地 Web 体验封装为桌面应用：选择一个工作区，应用会启动本地 Harness、管理随机回环端口、持久化 Profile/插件/会话，并在 Harness 就绪后直接进入完整界面。

> [!IMPORTANT]
> DSH Desktop 当前处于早期预览阶段，并依赖仍在快速迭代的 `@deepseek-ai/dsh@0.1.0-rc.6`。当前构建尚未代码签名或 Apple 公证，不建议直接用于生产环境。

## 下载安装

| 平台 | 安装包 | 下载 |
| --- | --- | --- |
| macOS Apple Silicon | DMG 安装包 | [下载 Apple 芯片版](https://github.com/dataelement/dsh-desktop/releases/latest/download/dsh-desktop-mac-arm64.dmg) |
| macOS Intel | DMG 安装包 | [下载 Intel 芯片版](https://github.com/dataelement/dsh-desktop/releases/latest/download/dsh-desktop-mac-x64.dmg) |
| Windows x64 | EXE 安装版 | [下载 Windows 安装版](https://github.com/dataelement/dsh-desktop/releases/latest/download/dsh-desktop-windows-x64-setup.exe) |
| Windows x64 | EXE 便携版 | [下载 Windows 便携版](https://github.com/dataelement/dsh-desktop/releases/latest/download/dsh-desktop-windows-x64-portable.exe) |

所有当前及历史版本可以在 [GitHub Releases 页面](https://github.com/dataelement/dsh-desktop/releases)查看。

## 为什么做这个项目

DeepSeek Harness 本身提供完整的 Agent Runtime 与 Web UI。DSH Desktop 不重新实现 Harness，而是补上桌面产品所需的宿主能力：

- 无需手动运行 CLI 或管理本地端口
- 使用系统目录选择器打开工作区，并记住最近使用的目录
- 统一管理 Harness 子进程、启动检测、日志与退出
- 把 Profile、插件和会话保存在应用安装目录之外，升级应用不丢数据
- 提供 macOS 与 Windows 安装包构建入口

## 功能

- 启动后直接进入 Harness，不设置额外首页
- 首次启动选择工作区，后续自动恢复最近工作区
- Harness 启动失败时支持重试、切换工作区、查看日志或退出
- Workspace 菜单支持打开工作区、最近工作区与重启 Harness
- 退出桌面应用时优雅终止 Harness 子进程
- 每次启动仅监听随机的 `127.0.0.1` 端口
- Renderer 关闭 Node.js 权限，启用 `contextIsolation`、sandbox 与导航限制
- 在桌面窗口与 Harness 侧栏统一使用 DSH 品牌 Logo
- 正式 DSH 应用图标，支持 macOS ICNS 与 Windows ICO

## 模型提供方

首次配置时可选择模型提供方并直接填写 API Key。DSH Desktop 复用 Harness 的真实 Settings/Credentials API：Key 只写入凭据存储，对应 Provider 路由会自动创建，并继承其内置模型目录，无需手工填写模型 ID。

当前首启列表包括：

| 类型 | Provider |
| --- | --- |
| 模型厂商 | DeepSeek、OpenAI、Anthropic、Google Gemini、xAI、Moonshot/Kimi、MiniMax、智谱 GLM、Mistral AI |
| 模型聚合平台 | OpenRouter |
| 推理服务平台 | Groq、Together AI |

更多内置或自定义 Provider 可以在 Harness 的“设置 → 模型”中添加。

## 快速开始

### 环境要求

- Node.js 22 或更新版本
- npm
- macOS Apple Silicon/Intel，或 Windows x64

### 本地开发

```bash
git clone https://github.com/dataelement/dsh-desktop.git
cd dsh-desktop
npm install
npm run dev
```

`npm install` 会运行 `patch-package`，重放 DSH Desktop 对 Harness 首次模型配置和侧栏品牌的定制，安装品牌静态资源，然后安装 Electron Runtime。

### 质量检查

```bash
npm test
npm run typecheck
npm run build
```

### 打包

```bash
# 在当前 Mac 架构上生成未签名 DMG 与 ZIP
npm run package:mac

# 分别在对应架构的 Mac/CI Runner 上执行
npm run package:mac:arm64
npm run package:mac:x64

# 在 Windows x64 机器/Runner 上生成 NSIS 与 Portable
npm run package:win
```

Harness 包含架构相关原生模块。macOS ARM64、macOS Intel 与 Windows x64 应在对应平台上重新安装依赖并构建。架构专用脚本会在打包前检查当前 `platform/arch`，避免生成看似成功、实际缺少原生依赖的安装包。

## 运行架构

```text
DSH Desktop (Electron Main)
├── 原生工作区选择与最近工作区
├── Harness 子进程生命周期
├── 随机回环端口与启动检测
├── 原生日志/错误恢复入口
└── 安全 BrowserWindow
     └── http://127.0.0.1:<random>  DeepSeek Harness Web UI

Electron userData
├── desktop-settings.json
├── logs/harness.log
└── harness/
    ├── profiles/
    ├── sessions/
    └── 插件与用户数据
```

Harness 运行在独立的 Electron Node 子进程中。Cordis HMR 所需的 `--expose-internals` 只授予该子进程，不会授予 Web Renderer。

## 项目结构

```text
src/main/             Electron 主进程、窗口与 Harness 生命周期
src/shared/           共享运行时类型
patches/              对固定 DSH 版本的可复现界面定制
scripts/              品牌资源安装与目标平台打包检查
test/                 设置、运行时、安全和 Provider 覆盖测试
build/                应用图标资源
```

## 当前验证状态

- macOS Apple Silicon：开发运行、真实 Harness 启动、DMG/ZIP 打包与挂载已验证
- macOS Intel：打包配置与平台检查已提供，需要在 Intel Mac/Runner 上完成运行验证
- Windows x64：NSIS/Portable 配置与平台检查已提供，需要在 Windows/Runner 上完成运行验证
- Windows ARM64：当前不支持
- 代码签名、Apple 公证与自动更新：尚未接入

## 上游版本与补丁

项目当前固定依赖 `@deepseek-ai/dsh@0.1.0-rc.6`。首启 Provider 列表由 [`patch-package`](https://github.com/ds300/patch-package) 固化在 [`patches/`](patches/) 中，而不是依赖未跟踪的 `node_modules` 修改。

升级 DSH 时必须：

1. 核对上游 Settings/Credentials 与 Provider Directory 契约；
2. 重新应用或重写首启界面定制；
3. 重新生成补丁；
4. 完成真实 Harness 启动与 Provider 配置回归。

## 贡献

欢迎提交 Issue 与 Pull Request。提交前请至少运行：

```bash
npm test
npm run typecheck
npm run build
```

请勿在 Issue、日志、截图或测试数据中提交真实 API Key。

## 许可证

本项目采用 [MIT License](LICENSE) 开源。

DeepSeek Harness 及其依赖仍遵循各自的上游许可证与商标规则。DSH Desktop 是独立的社区桌面封装项目。
