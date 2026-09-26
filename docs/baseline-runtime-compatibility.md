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
