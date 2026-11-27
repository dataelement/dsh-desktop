# 产品更新源配置

安装包顶层 package.json 可以声明 dshDesktopUpdates。主进程使用 app.getAppPath() 读取当前安装包的元数据，不依赖启动目录；解析、目录计算和 policy 验证通过显式参数接收配置，不依赖 Electron。

```json
{
  "dshDesktopUpdates": {
    "updatesBaseUrl": "https://updates.example/product/",
    "strategy": "feed"
  }
}
```

- updatesBaseUrl 是 HTTPS 目录根地址，结尾缺少 / 时自动补齐。子路径保留，不允许凭据、query 或 fragment。
- strategy 可选，默认 policy。policy 保留既有服务端决策、分批投放和手动检查语义；可选 policyUrl 指定完整 HTTPS 检查端点，省略则使用既有上游检查端点。自建 policy 服务需显式指定 policyUrl。
- feed 直接调用 electron-updater 的 generic provider 检查 latest/，由 electron-updater 读取、解析并选择平台对应的 latest 元数据。feed 不调用 policy 服务，不发送 installationId，也不实现独立元数据解析器。feed 不接受 policyUrl。

仅完全缺少 dshDesktopUpdates 时使用默认配置。显式配置缺少 updatesBaseUrl、URL 或策略非法、安装包元数据不可读时，更新检查失败并展示既有错误状态，不回退上游。

所有策略都从 updatesBaseUrl 下的 versions.json 获取历史记录，归档目录为 archive/<version>/。历史条目沿用 version、tag、archiveUrl 字段，但读取时将 archiveUrl 重建为当前根地址；复制旧索引不会将历史安装请求导向旧产品源。索引版本不得包含路径分隔符。policy 返回的 feedUrl 必须精确等于当前源的 archive/<version>/，并继续执行已有版本、预发布和平台规则。

feed 保留更新状态、跳过版本、手动检查、下载同意和历史版本精确匹配流程。feed 没有 policy 的服务端分批投放；版本可用性以 electron-updater 的检查事件为准。发布者仍需提供正确的签名、平台元数据、资源路径及历史归档。

验证边界：本变更只增加源码和少量行为单测，不运行完整回归或安装更新验收。安装包内元数据保留、macOS/Windows 原生下载与签名、实际更新重启应由下游发布验证。
