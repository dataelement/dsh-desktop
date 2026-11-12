# Linux Landlock ASAR 路径补丁

目标：`@deepseek-ai/node-addon-system@0.1.2`。兼容补丁为 `patches/@deepseek-ai+node-addon-system+0.1.2.patch`。

Electron 通过 app.asar 解析平台包 manifest，但 Landlock 使用 spawnSync，必须执行 app.asar.unpacked 下的实体 launcher。仅解包 ELF 不改变 manifest 解析结果。此补丁只在 Linux 把完整 app.asar 目录段映射到 app.asar.unpacked；不修改 macOS/Windows、开发目录、已解包路径和缺包 fallback，也不引入环境变量覆盖。缺少实体 payload 时 probe 继续返回 unusable，不降级绕过策略。现有公开接口不提供安装包路径适配点，因此在 launcherPath 的上游实现做局部修复。上游正式提供同等 ASAR 物理路径修复后删除补丁。

回归：`./node_modules/.bin/vitest run test/landlock-asar-layout.test.mjs`（绕过 npm pretest，不触发资源构建）。测试使用真实 ASAR manifest 和解包的可执行 shell fixture，在 Electron Node 模式里调用包的 launcherPath/probe 并实际启动子进程，覆盖成功、删除 payload 后 fail closed、目录边界及其他平台不变。跨平台测试仅覆写子进程的 process.platform 以验证路径分支，不证明 Linux 内核 Landlock 实际隔离。

原生 Linux 后续必须检查干净 npm ci postinstall 重放、真实平台 ELF、bwrap 不可用时 Landlock fallback、授权与拒绝操作及完整安装包。不得用本测试代替内核隔离验收。
