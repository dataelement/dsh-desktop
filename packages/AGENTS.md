# 宿主插件与分发包约束

继承根目录规则。先区分宿主维护的 `dsh-desktop-*`、`ppt-runtime/` 源码与第三方 tgz，不能把 `packages/` 当作普通前端 workspace。

实现宿主插件前阅读 [Patch 与 Plugin 规范](../docs/patch-plugin-contract.md)，遵守其中的扩展选型、slot 所有权、生命周期及组合验证要求。

自有包与第三方分发包的来源、生成和 Git 跟踪规则见 [源码与构建产物规范](../docs/source-build-contract.md)。本仓库自有包的生成物不能作为另一份维护入口。

## 包与加载契约

- 包入口、`exports`、`dsh.client`、peerDependencies 与真实加载器保持一致。新增运行时 import/require 要检查安装后的包闭包，不能依赖开发仓库偶然可解析的依赖。
- 现有 `client.js` 使用 `window.__ModuleLoader__.load`，server 入口使用包自身约定的模块格式。保留这些协议；未建立编译与打包链路前不能直接改成 TS/TSX。
- JS 模块新增复杂公开接口时补充 JSDoc/声明和边界校验；现有 `.d.ts` / `.d.mts` 与实现同步。声明文件存在不代表 JS 实现已被类型检查。
- 不直接修改第三方 tgz 内容，也不绕过来源说明重新打包。依赖升级同步包版本、锁文件和相关补丁，记录来源及兼容验证。

## 客户端 UI

- 扩展优先用 Harness slots、现有 UI primitives 和 locale 服务，注册/销毁遵循 Cordis 生命周期；避免复制上游组件实现。
- React 新组件沿用函数组件方式。现有客户端以普通 JS 加载，`React.createElement` 可直接执行；若引入 JSX，需先建立对应编译和发布链路，不能只改语法。
- 展示组件通过 props 接收数据、回调输出操作；网络请求集中在插件服务/请求函数，包含错误和取消处理，不散落在展示组件中。不要另建通用 HTTP 框架。
- 宿主插件的语义色只使用 `--dsw-alias-*`。不新增 `--ds-*` 或硬编码十六进制色；`dsh-desktop-enterprise` 现有的 `--ds-*` 与 `#2468f2` 等为待迁移存量，修改该插件时优先换回 `--dsw-alias-*`。
- 深浅主题依赖 token 自动切换，不新增 `body[data-ds-dark-theme]` 一类手写主题分支；上游确实缺少对应 token 时补最小接缝并说明原因。
- 不自建第三套主题 token 体系。样式用 `document.createElement('style')` 注入，以 `id` 或 `data-plugin-css` 做幂等 guard；选择器使用插件命名空间前缀，不覆盖上游或其他插件的变量。
- 插件文案一律通过 `ctx.locale.register(NS, { zh, en })` 注册、`ctx.locale.bind(NS)` 读取；新代码禁止用 `navigator.language` + 组件内 `copy` 对象内联文案。`dsh-desktop-enterprise` 的内联 `copy` 为待迁移存量。
- 中英文 key 必须同批维护，缺一即视为未完成；文案与展示逻辑分离，不把整句文案写死在组件分支里。不额外引入状态管理/i18n 库。
- `__ModuleLoader__` 下的大插件按职责拆成独立函数或同包内子文件，再由 `client.js` 组装；单文件加载协议不能成为继续堆叠无关逻辑的理由。
- 插件默认自包含。跨插件只允许复用仓库已有的极小共享原语（如上游 UI primitives）；不得互相 import 对方的 client 实现，也不要为此新建组件库。
- 动画和过渡需尊重 `prefers-reduced-motion`。
- Hooks 按 React 生命周期使用；订阅与异步结果处理卸载/过期响应。不要通过删除依赖掩盖 effect 重复触发问题。
- UI 需覆盖 loading/error/empty/disabled、键盘及焦点、深浅主题。弹层需焦点陷阱、`aria-modal`、Esc 关闭、遮罩点击，busy 时禁止关闭。状态切换不能只改颜色，需配文案或 `aria-live`。
- 长会话和插件热重载下验证重复渲染、订阅清理及绘制成本；不能凭静态截图判断性能。

## 编译与模板型包

`ppt-runtime/` 及类似包不是 slot 替换型宿主插件：它们有模板源、编译 CSS、hash class、预览图和生成产物。

- 模板原始输入（`.page`、`.pptd`、design 说明、上游参考）是权威维护入口；编译后的 `lib/client.js`、hash class、预览图和 tgz 按 [源码与构建产物规范](../docs/source-build-contract.md) 处理，不与源码双轨维护。
- 改模板或样式从源重新生成，不要只改会被下次构建覆盖的产物或压缩 class 名。
- 宿主侧对接仍走公开 slot 与 locale；不要把编译产物当第二套可手改的前端。

## 插件安装与 generation

- 安装、registry、Profile projection 和实际运行时加载分别验证。成功响应需与已经完成的阶段一致，不能把 pnpm 退出 0 当作插件已生效。
- 保持 generation 不可变；安装在 staging 完成校验后发布。切换 Profile 链接/manifest 失败须回滚并保留旧可用状态。
- 成功安装的新 generation 应通过现有 publication 流程对活动 Profile 可见；旧 generation 的清理遵循冷启动和引用检查，不能删除运行中仍引用的目录。
- peer 校验从目标插件及其 manifest 出发，兼容 exports、可选 peer 和宿主共享依赖；不要以仓库根目录的 `require.resolve` 代替真实插件上下文。
- Windows symlink/junction、占用文件及 pnpm 路径规范化需平台验证；fixture 的临时根目录必要时先 `realpath`，不要假设短路径与实际路径字符串相同。
- 第三方 market 仅按其真实协议集成，不假设它识别宿主自定义返回字段。
