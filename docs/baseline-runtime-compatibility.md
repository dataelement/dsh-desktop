# 0.1.7 baseline 兼容修复

## 模型配置

目标：`@deepseek-ai/dsh-client-ui-settings-models@0.1.7-rc.1`。

保留已有模型搜索、行内视觉开关、服务商选择和推理等级配置补丁。修正补丁中 5 个已移除的图标导出；DeepSeek 高级选项通过当前 `capacityInput` 契约渲染容量字段，避免调用不存在的旧 `capacityField`。

验证：图标导出检查、编辑器展开及容量编辑行为测试、真实 Dev 模型页和高级选项展开。未保存用户模型配置。升级时重新核对上游组件和字段契约，不机械重放旧渲染代码。

## generation 宿主依赖校验

Harness 0.1.7 可以通过运行时 resolver 将宿主依赖解析到当前安装，而旧 `profiles/node_modules` 链接仍指向另一安装。Desktop 的两条 generation 安装入口现在传入当前 DSH 入口。校验只对约定的宿主单例核对该入口提供的精确解析结果，不将整个安装目录作为普通第三方依赖的允许范围。

回归覆盖：旧共享链接与当前宿主不同、当前宿主可用、普通第三方依赖逃逸仍被拒绝。实际 Dev 的 `dsh-antigravity@0.0.7` 已安装并显示模型。Windows 安装包尚未验收。

## Undici 8 与旧 Fetch 的 HTTP/2 响应头

目标：`undici@8.11.0`，补丁 `patches/undici+8.11.0.patch`。

`Dispatcher1Wrapper` 将 `controller.rawHeaders` 原样传给旧 handler；HTTP/2 的该值是对象，旧 Fetch 要求扁平数组，因而丢失 Content-Type / Content-Encoding，gzip 数据随后被当成 JSON。修复将对象转换为原有 `toRawHeaders` 格式；HTTP/1.1 已有数组不变。同样处理 upgrade 头与 trailers。

这是共享网络层兼容修复，影响使用旧 Dispatcher API 的调用者，不仅是 AntiGravity。不改变代理选路、认证、请求内容或压缩协商。上游 wrapper 正式兼容对象响应头后应删除补丁，并重跑同一回归。

验证：内置 Fetch 的 gzip JSON、对象/数组响应头、重复 Set-Cookie、分块 SSE、HTTP/1.1 数组保持原样、trailers；在 Electron Node 24.17.0 中通过 Harness 代理向 Google OAuth token 端点发送无凭据诊断请求，修复前得到 gzip 字节且无响应头，修复后能解析预期的 HTTP 400 JSON。该检查不代表真实账号认证或模型推理验收。

### Windows header clearance after rc.2

`ConversationHeader` now owns the `<header>` outside `conversation.session.header`.
The old preload selector (`[data-slot="conversation.session.header"] > header`)
therefore no longer reserves space for native caption controls. The conversation
patch adds only `data-dsh-conversation-header` to the resident header; preload
uses that marker to reserve the native caption height and keeps all header slots
in normal flow below it. This covers sessionless and active views without cloning
contributions or relying on generated class names. This is window chrome, so the
layout stays in preload rather than a business plugin. Remove the marker patch
when upstream exposes an equivalent stable header/Windows clearance contract.

Regression: `test/windows-titlebar-header.test.mjs` executes the installed rc.2
header in both session states and verifies slot ownership/count. Local Chromium
geometry checks cover narrow/wide, light/dark and blank/active layouts; they do
not replace final Windows installer checks (DPI, zoom, maximize and clicks).

## 插件 Harness 版本声明采用告警策略

目标：`dsh-app-boot` 和 `dsh-plugin-manager` 的 `0.1.7-rc.2` 补丁。
适用于所有插件的 Harness peer 版本范围声明，不设包名白名单，也不限于 rc.1 → rc.2。
版本范围不包含当前 Harness 时，安装检查、Profile 组合预检、运行时行预检及 manager 启用检查输出告警并继续尝试。
告警表示兼容性未经确认，不能当作实际加载成功；不修改第三方 manifest 或自动写入版本豁免。

Profile 组合仍从当前 Profile 和安装 anchor 解析；普通 Profile 与 Safe Mode 的依赖解析范围不变。
缺包、损坏的 manifest/YAML、非字符串 peer 字段及实际 import/apply/activation 错误仍保留原始诊断和恢复入口。
仅放宽版本声明门禁，不放宽 generation 依赖闭包与宿主单例校验。
安装告警进入安装输出和日志，启动告警按同一声明及运行时版本在每个进程中去重。

回归：`profile-boot-preflight.test.ts`、`plugin-startup-failure.test.ts`、`plugin-version-policy.test.mjs`。
覆盖旧声明正常运行、实际 API 失败、损坏输入、manager 安装不回滚及 manifest 不变。
当上游支持宿主选择同等告警策略时，改用公开配置并移除此策略补丁。

## CLI-only peer 校验

`@deepseek-ai/dsh@0.1.7-rc.2` 只提供 `bin.dsh = lib/bin.js`，没有可导入根入口。
generation 校验不能把 `require.resolve()` 失败直接当作缺包：对于没有 main/exports 的 CLI 包，检查包内实际存在的 bin 文件，再沿用宿主目录和单例校验。
不执行 CLI，不用 bin 掩盖损坏的 main/exports，不接受目录、缺失文件或越出包目录的 bin。
这只影响安装后依赖校验阶段，不改变 Profile 解析基准和插件加载协议；实际 import/激活仍由 Harness 验证。
回归位于 `test/generation-installer.test.ts`。旧 CI 安装包需重新构建后才能获得此修复。
