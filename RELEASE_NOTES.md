# DSH Desktop Release Notes

本文件是发布说明的风格参考。CI 在生成 GitHub Release 正文时读取前 120 行作为 `<style-reference>`。手工维护，无需每次发布都更新。

写作约定（对齐 DeepSeek Harness 官方发布规范）：

- 顶部导航栏为 `[中文](#cn-<版本>) | [English](#en-<版本>)`。
- 随后是一两句概括本版本主要改动与重点修复的说明。
- 中文部分分类（首个分类带锚点 `<h3 id="cn-<版本>">`）：
  - `<h3 id="cn-<版本>">新增功能</h3>`
  - `### 体验优化`
  - `### 问题修复`
  - `### 其他变更`
- 中英文之间使用 `---` 分割线。
- 英文部分分类（首个分类带锚点 `<h3 id="en-<版本>">`）：
  - `<h3 id="en-<版本>">Features</h3>`
  - `### Improvements`
  - `### Bug Fixes`
  - `### Chores`
- 全面覆盖本次版本的所有实质改动点（包含功能特性、交互体验、缺陷修复、性能调优、平台系统适配等）。
- 每个改动点用清晰的列表条目（`- **模块名**：说明改动表现及解决的问题。`）阐述。
- 不逐条机械复述无意义的 Git commit，不放任何外部链接。

---

[中文](#cn-0.0.0) | [English](#en-0.0.0)

本版本汇总了自上个版本以来的主要改动，包括功能增强、体验优化与稳定性修复。

<h3 id="cn-0.0.0">新增功能</h3>

- **会话与工作区**：描述新增能力与改进，说清变化本身以及给用户带来的好处。
- **界面交互体验**：说明界面布局、菜单或主题适配的改动点。

### 体验优化

- **包体与构建体积**：优化打包产物体积，加快应用启动与加载速度。

### 问题修复

- **系统启动与进程管理**：修复特定平台（如 Windows 权限或软链接）下的启动异常。
- **插件兼容性与加载**：修复插件在特定运行时版本下导出缺失或依赖未解析的故障。

### 其他变更

- **依赖与基础环境**：更新基础依赖并完善多平台签名与发布链路。

---

This release summarizes key enhancements, optimizations, and bug fixes since the previous version.

<h3 id="en-0.0.0">Features</h3>

- **Sessions & Workspaces**: Describe new capabilities and improvements for users.
- **UI & Interaction**: Clarify layout, menu, and theme enhancements.

### Improvements

- **Bundle & Startup**: Optimize packaged footprint and streamline startup performance.

### Bug Fixes

- **Process Management**: Fix startup anomalies on specific platforms.
- **Plugin Compatibility**: Resolve missing export and dependency resolution issues.

### Chores

- **Tooling & Release**: Update dependencies and robustify multi-platform release pipelines.
