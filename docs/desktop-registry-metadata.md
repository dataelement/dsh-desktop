# 桌面插件元数据查询

桌面端仍使用内置 pnpm 安装包。插件市场预览及 Plugin Manager 的安装前兼容性查询，通过 `view` 请求包的名称、版本、描述、`dsh`、`engines`、peerDependencies 或完整性字段。

pnpm 10.34.5 的 `view` / `info` / `show` / `v` 原本转交系统 npm 执行。正式安装包只携带 Electron Node 模式及 pnpm，因此用户没有 npm 或 GUI 的 PATH 找不到 npm 时，会报 `spawnSync npm ENOENT`。

## 实现边界

- `packages/dsh-desktop-market-installer/registry-view.mjs` 是桌面查询行为的权威源码，直接请求 registry 元数据，保留精确版本、dist-tag、semver 范围及插件身份校验。它不安装包、不启动 npm，也不依赖新增的运行时包。
- `patches/pnpm+10.34.5.patch` 只提供版本固定的适配接缝：runner 设置 `DSH_DESKTOP_REGISTRY_VIEW` 时，四个元数据命令调用上述模块，并传入 pnpm 自己的配置读取、HTTP、认证和 semver 能力。未设置该变量时保持 pnpm 原行为。
- runner 使用自身目录的模块路径覆盖该变量，不采用 Profile 或调用者提供的模块路径。暂存 runner 时同步复制查询模块。安装、删除及其他 pnpm 命令保持原路径。
- 元数据查询不再暂时移除和恢复 generation projection：只读预览不改写 Profile manifest，避免无用的磁盘写入及与安装操作竞争。
- 使用 pnpm 自身的有效配置：Profile/用户 `.npmrc`、环境变量及显式 registry 参数，包含 scope registry、认证、代理、CA/客户端证书和 TLS 策略。网络层沿用 pnpm 的跨主机重定向凭据隔离，不打印凭据或 registry 响应正文。
- 这是命名 registry 包的元数据查询接缝，不实现 npm 的全部交互式 `view` 功能。file/git/tarball 规格不在其范围内；这些规格仍由原有安装流程处理。
- 单次请求无重试，超时不超过 20 秒；调用者的进程取消/超时继续约束整个查询。失败返回非零退出码，不回退系统 npm，也不把查询失败当作插件不存在。
- HTTP 5xx 使用 Plugin Manager 已识别的 `ERR_PNPM_FETCH_5xx` 错误码，让其按现有配置尝试备用 registry；404 和版本不存在保留原有分类，401/403 不触发备用仓库查询。错误信息不包含响应正文或认证信息。

这里需要补丁，是因为 pnpm 没有公开的内置 view 配置/网络扩展接口；不通过隐藏的方法替换实现。升级 pnpm 时重新核对补丁传入的内部能力。上游提供等价的原生元数据查询或公开适配接口后，应移除此补丁并切换实现。

## 回归与分发

`test/registry-view.test.mjs` 使用真实 pnpm 和暂存 runner，在没有 npm/node 的 PATH 中连接本地 registry，覆盖字段、精确版本/标签/范围、scope 认证、参数优先级、代理、重定向凭据隔离、错误及超时；同时走实际 Plugin Manager 查询循环和分类器，验证首选 registry 返回 500/503 后备用仓库成功，以及 401/403 时停止查询。`test/pnpm-runner.test.js` 和 `test/market-installer.test.js` 保留安装/锁恢复/shim 回归。

`scripts/verify/verify-packaged-harness.cjs` 的 afterPack 检查额外从实际 ASAR 和打包 Electron 执行 registry 查询，PATH 指向临时空目录。通过此检查只证明包内查询链路可运行，不代表真实市场页面、所有企业网络或 Windows/UOS 安装后流程均完成验收。
