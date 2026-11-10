# Desktop 产品身份配置

壳入口在读取用户数据、申请单例锁及启动 Host 之前，从应用安装目录的 package.json 读取身份。身份解析位于 [product-identity.ts](../src/main/shell/product-identity.ts)，不根据插件是否安装、包名、可执行路径或 electron-builder 的品牌字段猜测产品。

## 显式元数据契约

应用 package.json 顶层可声明以下完整对象（BISHENG 既有路径的兼容示例）：

```json
{
  "dshDesktopIdentity": {
    "productName": "BISHENG",
    "userDataDirectory": "bisheng",
    "developmentUserDataDirectory": "bisheng-dev"
  }
}
```

对象缺省时保持原有 DSH 默认值：正式版应用名 DSH Desktop、userData 为 appData/dsh-desktop；未打包启动与顶层 dshDesktopChannel=development 的开发包使用 DSH Desktop Dev、appData/dsh-desktop-dev。显示名变更不会推导或改写数据目录。

对象存在时三个字段全部必填。目录必须是便于跨平台使用的单级目录名（英文字母或数字开头，其后可有字母、数字、点、下划线或短横线，最长 128 字符），不接受绝对路径、路径分隔符、末尾点及 Windows 保留设备名。显示名拒绝控制字符和路径分隔符。开发和正式目录不得相同（含大小写等价）；非法显式配置直接报错，不静默回退到另一份用户数据。读取元数据失败同样不回退。

开发时 DSH_DEV_PROFILE 可覆盖开发目录名，用于并行 worktree；不得与本产品正式目录相同。正式包忽略此覆盖。端口仍遵循原有 DSH_DEV_HARNESS_PORT / DSH_DEV_MOBILE_PORT 规则。

## 下游迁移要求

- 下游源码 package.json 顶层增加该对象，供未打包开发运行读取。
- 下游构建必须把同一对象保留在最终应用 package.json 顶层；若使用 electron-builder extraMetadata，则在 build.extraMetadata 中加入相同的 dshDesktopIdentity。仅设置 build.productName、build.appId 或 extraMetadata.productName 不再影响数据目录。
- 对 BISHENG 必须显式配置 bisheng / bisheng-dev，才能继续访问已有会话和设置。底座不扫描旧目录，不复制或移动用户数据；未配置时只会使用默认 DSH 路径，不能把缺少旧会话误认为数据被删除。
- BISHENG_DEV_USER_DATA 不再读取。开发启动脚本应迁移为 DSH_DEV_PROFILE=<独立单级目录名>；原来指定绝对目录的脚本需要自行调整，不能直接照搬绝对路径。
- 下游当前仅声明 build.productName=BISHENG 与 build.extraMetadata.productName=BISHENG，尚未提供新对象。必须先完成上述配置再分发基于此变更的版本。本次未修改下游。

配置身份不会自动更改 electron-builder appId、协议、图标、签名、发布地址或菜单业务文案，这些仍由各自配置负责。也不改变插件安装作用域或 Safe Mode 的 Profile 语义。

## 验证范围

[身份行为测试](../test/shell/product-identity.test.ts)覆盖默认路径、显式旧路径、开发通道、通用隔离变量、品牌推测失效、改名不迁移目录、非法输入与目录冲突；[菜单接线测试](../test/shell/enterprise-menu.test.ts)检查壳使用解析结果。单元测试不能代替下游安装包升级验收：正式发布前需检查最终 package.json，并用隔离临时 appData 验证实际 Electron 的 userData、单例锁与 DSH_HOME，确认未创建错误产品目录。不得直接启动共享真实用户 Profile 来验收。
