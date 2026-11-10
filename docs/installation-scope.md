# 显式宿主插件安装作用域

## 声明与启动

Desktop 的运行安装根目录（Host argv[2]）的 package.json 可声明：

```json
{ "dshDesktopHostPlugins": ["@example/desktop-plugin"] }
```

该字段只接受裸包名数组；重复项合并，非法值在启动时失败。下游必须自行安装这些包，并在打包后的运行安装根目录保留这份元数据及对应 node_modules。开发仓库声明而打包时丢弃元数据不会生效。声明只授予解析可见性，不自动启用或激活插件，Profile/产品 patch 仍负责组合。Profile 自己的同名字段不被读取。Safe Mode 完全忽略该声明，保留上游核心安装锚点，不创建共享 profiles/node_modules。

## 最小兼容接口

审计 Harness 0.2.2-rc.1 的 collectInstallationScopePackages：它只遍历 installAnchor 的 dependencies、peerDependencies、optionalDependencies 闭包。切换 installAnchor 到应用根会改变核心归属；没有可添加第二安装声明源的现有公开入口，因此补充 RuntimeResolutionOptions.installationPlugins 与 runProfile 的 resolvedProfile.installationPlugins（运行时与 d.ts 一致）。格式为 `{ anchor: absoluteApplicationManifest, names: string[] }`。原有 dsh installAnchor 保持不变，附加包从显式应用 anchor 解析，其依赖仍沿包自身 manifest 遍历，动态 computeLatestResolution 保留声明。缺少显式声明的包不获得安装 fallback；声明包缺失时给出包名与声明 anchor，不伪装加载成功。

所有消费者复用同一 RuntimeResolution/PluginPackages：后端入口、client/preset 子路径遵守 exports；没有新增 NODE_PATH、cwd 或命名空间兜底。插件内部缺少 peer 或私有依赖仍保留 ERR_MODULE_NOT_FOUND。现存核心 Desktop optionalDependencies 兼容条目暂留，移除企业专名条目；新增下游不应再修改 dsh 元数据。

## 补丁与验收

对应 @deepseek-ai/dsh 与 dsh-app-boot 0.2.2-rc.1 的 patch-package 补丁。上游支持多安装声明源并覆盖解析刷新、client 与 preset 后，应删除此接口转接，迁移到上游公开接口。升级时重新审计闭包和调用链，不机械套用哈希 bundle 文件名。

回归：test/host/installation-plugins.test.ts 使用隔离临时目录和真实 Harness 子进程，验证显式包及 client/preset exports、未声明包隔离、刷新继承、Safe Mode 不纳入声明、无共享 node_modules，以及缺失 peer/普通依赖诊断。真实浏览器客户端激活、正式安装包和 Windows junction 尚需发布流程验证；子路径解析通过不等于 UI 已激活。
