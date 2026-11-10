# Desktop Deep Link 主进程接缝

## 状态与边界

[路由器](../src/main/shell/deep-links.ts) 提供通用、可测试的 main-process 声明、冷启动内存队列、唯一目标注册及关闭接缝。**当前正式入口尚未启用 OS 事件接收**：没有安全目标时不能消费链接形成黑洞，也不能用共享 renderer 广播替代定向交付。仅声明 metadata 不会启用协议。

现有下游 enterprise 客户端使用页面级 bridge，Host 控制协议没有经过授权的指定插件收件箱；普通页面的所有插件共享 JS 环境，给某个 window 属性命名不构成保密隔离。本模块不声称完成该跨进程交付。SSO 参数校验、凭据保存、登录确认、UI/品牌均留在下游，OS scheme 的 installer 注册也留在 downstream 构建配置，不调用 setAsDefaultProtocolClient。

## 声明

下游可信构建 metadata 可声明顶层 dshDesktopDeepLinks 数组（最多 32 项），缺省为空：

下列 JSON 仅为声明示例，不代表已注册的 OS scheme：

~~~json
{
  "dshDesktopDeepLinks": [
    { "scheme": "sample-dev", "hostname": "callback", "pathname": "/receive", "target": "native-receiver" }
  ]
}
~~~

scheme 必须是小写自定义协议，HTTP/HTTPS/file/javascript/data 及平台内部 dsh/dsh-desktop 保留；hostname 和 pathname 精确匹配，无通配、前缀或 URL 指定 target。声明重复 route（即使 target 不同）失败关闭。路径不做点段、百分号或大小写归一化匹配，用户信息、端口、反斜杠、空白、控制字符被拒绝。query/fragment 原样交给唯一目标，由目标继续验证，平台不解释业务。

## 可信 native 组装流程

1. 使用完整 package metadata 构造 DesktopDeepLinks，读取路由只发生在可信主进程；不能从 renderer IPC 动态授权 target。
2. **先实现并审核安全目标适配**。下游 trusted native 组装处持有实例，目标真正 ready 后调用 registerTarget(target, receiver)。每个声明 target 仅能注册一个 handler，返回 disposer；目标重启/卸载前先 dispose，应用退出调用 close。Electron ready 不等于 Host、插件或目标 ready。
3. 只有可用目标适配存在后，才在真实 main 入口获得单实例锁后、whenReady 前接线：初始 process.argv 与 second-instance argv 调 acceptArgv；macOS open-url 调 accept，且仅对 queued/duplicate/full 等本平台已认领链接 preventDefault。不要拦截未知 URL。保留原窗口唤醒语义。此处是后续接线契约，不是当前已实现行为。
4. 跨进程必须有经过主进程授权、限定目标且与目标生命周期绑定的通道。不得把完整 URL 放入 webContents 广播、共享 preload、DOM 事件、启动注入、日志、磁盘或所有插件可读缓存。target 字符串只是路由键，不是权限凭证。无法满足时保持 OS 接收禁用并报告缺口。

## 队列和失败语义

- 每个 URL 最大 8192 字符；待交付最多 32 条，满时拒绝新条目，不覆盖旧条目；argv 每批最多检查前 256 个参数。
- 目标未注册时只在主进程内存等待；每次接收/排空惰性淘汰 60 秒前条目，close 立即清理。没有持久化、后台 TTL 定时清理或崩溃恢复；惰性过期条目可能留在内存直至下一次操作/退出，但不会再交付。
- 最近 128 个 URL 的 SHA-256 摘要用于 60 秒窗口内去重；有界缓存淘汰后可再次接收，非永久 replay protection。业务 ticket 的单次使用、有效期及幂等仍由目标验证。
- ready 目标依次处理，未 ready 的其他目标不阻塞选择。全局串行 await receiver；handler 必须有限完成，不应等用户交互，平台不伪称可取消正在执行的业务副作用。
- 每条最多尝试一次，失败只报告 target，不传原始异常/URL，不自动重试。close/dispose 不能撤销已经调用的 handler；关闭后拒绝所有接收和注册。

## 验证

[行为测试](../test/shell/deep-links.test.ts) 覆盖 ready 前排队、精确唯一目标、未知输入、队列上限、重复事件、过期、失败、dispose 和退出。执行：

~~~bash
npx --no-install vitest run test/shell/deep-links.test.ts
~~~

尚未验证/尚未实现：真实 Electron OS 冷启动事件接线、插件跨进程保密交付、macOS/Windows 安装后 scheme 注册及唤醒。模块测试不代表上述流程可用。
