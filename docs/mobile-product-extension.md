# 手机桥产品扩展

主进程产品运行时可通过 `mobileExtension()` 提供可选扩展。手机桥在每次 `start` 时读取一次，同一次运行复用这个实例，直到 `stop`。底座继续负责 LAN 配对、私有通道能力校验、Host cookie、RPC/mux、流清理及 Safe Mode 隔离。

扩展拥有产品账号校验、额外 RPC 参数验证、手机页面和逐连接会话投影。`attach` 收到仅限主进程的 transport，返回停止回调；调用方不能将 transport、cookie 或 channel token 暴露给 renderer。远程请求必须同时通过 loopback、桥的随机 capability 和产品 authorizeRemote；普通 `/api/rpc` 仍须配对。远程会话流在连接 Host、转发每帧前复核授权，并每秒检查空闲连接；校验返回 false 或抛出异常时关闭对应 SSE 和 Host WebSocket，清理定时器。`authorizeRemote` 应同步、无副作用，并校验请求所属账号与当前账号是否匹配。

`request` 只允许当前 Host origin；产品的 RPC 方法仍需自己验证 payload 和路径。`forward` 复用已有手机 RPC，`invoke` 复用当前 Harness envelope。`sessionProjection` 每条流创建独立状态，可请求 assistantStream 并裁剪手机帧。未配置扩展时行为不变；Safe Mode 不创建手机桥。

验证：真实 HTTP 覆盖双重授权、账号变化、普通配对不可绕过、Host cookie、跨源拒绝及销毁。另运行现有 bridge/tunnel、product runtime 和完整回归。
