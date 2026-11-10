# Plugin Manager verified install 契约（rc.1）

目标包：`@deepseek-ai/dsh-plugin-manager@0.2.2-rc.1`。实现由现有 patch-package 补丁维护；企业目录、凭据、制品下载和 Web package backend 保留在下游。

## 公开边界

- `manager.verifiedInstallContract === 1` 表示管理器支持 verified 安装选项与失败封闭语义，不表示当前 Profile 配有可信 backend，也不表示安装/激活成功。该属性只读，供下游避免运行时字符串修改。
- `installBundle(spec, { expectedName, expectedVersion, npmIntegrity, replace })` 沿用现有契约。任一 verified 字段存在时，backend 必须声明 `supportsVerifiedInstall === true`，并且不得以 `undefined` 拒绝后退到普通 pnpm 安装。
- `ProfileBundlePackageBackend` 负责制品校验和可恢复的包投影；管理器复核已安装 manifest 的名称和版本，保护管理包，并保留正常 application/stage 结果。仅退出码 0 不是激活证明。
- backend 的 `signal` 同时响应用户取消和 manager 生命周期结束；安装事务（包括取消检查、rollback、restoreFiles）纳入 `packageOperations`，卸载管理器时等待回滚和恢复结算；在进入激活/reload 前释放，避免自重载等待自己的死锁。backend 应响应取消，并在返回 mutation 后允许管理器回滚。
- 版本标识不是跨进程 Remote 新 API；原有 Remote 安装选项/schema 不变。本次也不公开未经独立审阅的 `managedBundleSourceContract`。

## 验证及移除条件

`test/plugin-manager-verified-install.test.mjs` 覆盖只读能力、拒绝不支持 backend、identity/version 校验、替换保护、请求取消、生命周期取消、任务清理和失败封闭。generation/switch 测试继续验证现有底座。

上游提供等价版本化能力与 backend 生命周期保证后，删除对应补丁并将行为测试切换到上游实现。真实 Desktop/Web 激活、Windows 文件占用、整个应用升级仍需产品端验收，不能由此契约测试替代。
