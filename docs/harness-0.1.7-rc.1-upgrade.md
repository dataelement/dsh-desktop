# Harness 0.1.7-rc.1 升级记录

`v0.10.0` 分支将仓库内的 Harness 依赖固定到 `0.1.7-rc.1`，并更新对应的 Cordis 依赖和可重放补丁。旧的 `dsh-agent-presets` 目录预设 API 已由组合条目和 `dsh-agent-preset-registry` 取代。

补丁逐项去留和重设计建议见 [0.1.7-rc.1 补丁审计](harness-0.1.7-rc.1-patch-audit.md)。

## 用户预设迁移

- Desktop 启动普通 `web` Profile 前，读取 `$DSH_HOME/.agent-presets/<id>/agent.cordis.yml`，将有效的插件列表写入 `profiles/web/cordis.patch.yml`。内置 ID 更新对应条目，其他 ID 插入新的预设条目。
- 首次写入前保留整个 `.agent-presets` 目录的备份 `.agent-presets.pre-0.1.7-backup`，并备份既有 `cordis.patch.yml`。原目录始终保留。
- 后续启动只追加尚未迁移的 ID，保留用户在新 Profile 中对已有预设所做的修改。无效 YAML 记录诊断，跳过该预设，不覆盖原件。
- `.dshpreset` 导入先预览并检查冲突，确认后原子写入旧目录；下次启动转换为新格式，需重启才能使用。0.1.7 的导出只包含插件列表和显示元数据。旧包的其他文件保留在旧目录，引用路径需单独核对。

## 兼容接缝

- 启动失败溯源、插件 generation 后端、Session 删除及损坏日志诊断、Safe Mode、客户端模块解析和工作区路由补丁已迁到新发布包。
- Desktop 菜单继续提供会话删除、打开目录和未读标记；预设设置页继续提供搜索、导入预览、冲突改名、导出和 Awesome Presets 入口。
- PPT 内置包按新的 Cordis peer 范围重打包，`artifacts.json` 与锁文件的完整性值同步更新。

## 验证边界

标准 `npm ci` 通过，`patch-package` 在干净依赖目录重放成功。完整测试（141 个文件、1323 个用例）、TypeScript 检查和 Electron 主进程/Preload 构建通过。临时 Web Profile 的真实 Harness 子进程能启动，迁移后的自定义预设出现在 registry API，客户端预设脚本能通过认证后的服务器读取。

以上仍不等于正式安装包验收。发布前需在 macOS 和 Windows 安装包中检查普通 Profile 与 Safe Mode、预设导入后的重启、客户端实际挂载，以及 Windows junction 和路径行为。
