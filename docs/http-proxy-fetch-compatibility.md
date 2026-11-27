# HTTP 代理与 Fetch 版本一致性

Harness 0.2.2-rc.5 的 `@deepseek-ai/dsh-http-proxy` 使用 Undici 8.11.2；Node/Electron 的内置 fetch 可能来自 Undici 7。仅替换全局 dispatcher 会让旧 fetch 的 handler 进入新版代理实现，出现只读 `onResponseStart` 异常。

补丁 `@deepseek-ai+dsh-http-proxy+0.2.2-rc.5.patch` 在 `installProxyFromEnvironment` 安装代理策略时同时安装该包依赖的 fetch、Headers、Request、Response、FormData。五个入口使用同一份 Undici；不改 WebSocket、EventSource，也不修改代理地址、NO_PROXY 或证书校验。无代理模式同样统一 Fetch 接口。失败和 disposer 恢复先前的全局属性描述符，重复释放无副作用。

该阶段在插件加载前执行，适用于 Desktop Host 和 Web launcher，解析基准仍是代理包自己的依赖，不依赖工作区 cwd。补丁只涉及 HTTP 实现，插件加载失败仍保留原错误。已有进程需要重启；Node 的 `process.versions.undici` 仍表示内置版本，不能用它判断当前全局 fetch 的实现。

回归 `test/http-proxy-fetch.test.mjs` 在真实 Node 和 Electron-as-Node 子进程中验证：本地代理转发、预期的 401、Request/Response 与 multipart 表单、超时取消、loopback 绕过、直接模式和释放恢复。测试不使用企业凭据或外部业务服务。Xpie 的认证成功需要另行验收，401 只证明未认证 HTTP 请求到达服务器。

当 Harness 自身已统一其全局 fetch 与 dispatcher 时删除此补丁；升级 Undici 时重跑以上行为测试。保留旧 dispatcher header 兼容补丁，供明确持有旧 fetch 的既有调用方使用；本补丁不把它作为常规请求路径。
