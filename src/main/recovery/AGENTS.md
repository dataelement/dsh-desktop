# 恢复约束

继承 `src/main/AGENTS.md`。这里接收壳层交来的失败，不创建官方的强制恢复对话框。

- 不导入 `electron` 的文件负责可测试的记录和判断。需要原生对话框的恢复仍留在旧壳，这次不把两套 `startup-config-recovery` 合成一个带 Electron 的文件。
- `fatal-entry.ts` 把失败写到调用方传入的 `DSH_HOME/fatal-report.json`。不读取 `~/.dsh`。报告里的 `token` 查询参数要先抹掉。
- 读取报告时字段都可缺。损坏或半截 JSON 返回空，不把整个启动打成解析失败。
- 这里只保存致命失败，不编造操作事件。崩溃记录由壳写到应用日志目录，不在这个目录生成页面。
- 不导入 `shell/` 的窗口对象。壳可以导入本目录的 `fatal-entry`。
