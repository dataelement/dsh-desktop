# Desktop 产品生命周期接缝

底座负责 Profile、Host 和窗口生命周期；产品在自己的入口模块中注册一次 `registerDesktopProduct(factory)`，再加载底座应用入口。默认产品不注册时保持原行为。此接口只供安装包中的可信主进程代码使用，不接受网页指定模块或配置执行任意代码。

## 产品插件选择

桌面产品补丁只按安装包明确声明的 `dshDesktopHostPlugins` 决定企业插件是否挂载；依赖包能否从父目录偶然解析，不是产品选择依据。`writeDesktopProductPatch` 接收安装元数据，普通上游产品默认不加载企业插件，Safe Mode 始终不挂载企业业务插件。这也避免嵌套 checkout 或第三方包提升改变启动组合。

## 启动和重启

底座完成应用身份配置、取得单实例锁、创建窗口及准备 Profile 后，在每次 Host 启动前等待 `startDesktopProduct({ userDataPath, dshHome, safeMode, version })`。工厂只初始化一次，并发启动共用结果；失败后允许重试。产品必须释放工厂拒绝前创建的部分资源。Safe Mode 标志由底座明确传入，产品自行选择不启动可选业务服务。

Host 的基础环境来自登录 shell 的既有合并规则。底座在创建每次 Host 时现场读取 `readDesktopProductEnvironment()`，叠加产品覆盖值，不缓存产品凭据、不修改全局 `process.env`、不打印环境内容。固定 Host 路径和 Profile 的底座参数继续由底座决定。这覆盖后端激活阶段，使用现有 Profile 解析基准，不新增依赖 fallback 或修改客户端 bootstrap 顺序。

初始化成功后，`attachDesktopProductWindow` 将明确拥有的主窗口与 `checkForUpdates`、`showLogs`、`restartInSafeMode` 三项窄能力交给产品。产品必须验证其 IPC 的窗口、主 frame 和页面来源，不得从任意发送者推断授权窗口。此调用可能在 Host 重试时重复，产品负责幂等。

## 退出和失败

Host 重启复用产品服务；应用退出在关闭 Host 后等待 `disposeDesktopProduct()`。退出开始后不得再向调用者暴露产品环境或挂载窗口，即使异步初始化刚完成，也只释放晚到资源。初始化错误回到已有启动失败/恢复路径，清理错误沿既有退出步骤报告，不记录凭据或把失败伪装成成功。

行为回归见 `test/shell/product-runtime.test.ts`：并发、失败重试、无产品、动态环境、窗口挂载、初始化中退出及清理错误。此测试不证明企业业务或真实 Electron UI 已完成验收；产品仍需用独立 Profile 验证自己的启动、IPC 和界面。
