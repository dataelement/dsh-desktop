# Host 入口约束

继承根目录规则。这个目录是 Harness 子进程入口，不是 Electron 主进程。

- 不得导入 `electron`、`src/main` 或 `src/preload`。
- `DSH_HOME` 只使用父进程传入的环境变量。不调用会落到 `~/.dsh` 的默认解析。
- 对版本敏感的上游调用集中到 `upstream-api.ts`。插件操作事件的订阅和卸载、会话文件地址的解析在这个文件。
- 启动失败通过 IPC 的 `fatal` 带回消息和诊断，不在这里弹窗。
- 普通 profile 不注册旧壳的 `@deepseek-ai/*` host fallback。插件先按自己的路径解析；缺少宿主 peer 和缺少普通依赖都保留原始 `ERR_MODULE_NOT_FOUND`。Safe Mode 仍由上游安装锚点解析核心包，不创建 `profiles/node_modules`。
