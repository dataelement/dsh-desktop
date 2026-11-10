# Settings shell navigation 扩展

目标版本为 Harness @deepseek-ai/dsh-client-ui-settings-general 与 @deepseek-ai/dsh-client-ui-settings 的 0.2.2-rc.1。运行时补丁与公共类型补丁分别保存在对应的 patch-package 原子补丁中；同文件原有 sidebar footer 与 onboarding 修复保留。

## 问题与边界

账号 launcher 已经有打开设置的能力，但无法通过公开 props 直达注册的 section；section 已经有 close，却无法把自有键盘循环交回壳的导航或关闭按钮。消费者不应查找壳的压缩类名、翻译文字或 DOM 来模拟点击和转移焦点。

本扩展只增加回调，不增加 slot、不移动现有 slot，也不重复挂载贡献项。settings.launcher 仍为 root scope single；settings.section 仍为 root scope list，按已注册 id 选择一项。section 在原内容列中渲染；容器尺寸与顺序保持现有约定。

## 公共契约

settings.launcher 的 SettingsLauncherOwnerProps 增加 openSettingsSection(id: string): void。只有当前 SettingsRoot 渲染得到的 rows 中已注册的 id 才会调用 actions.openSection(id)，同时打开设置并选择页面；未知 id 被忽略，不打开面板、不切换页面、不抛错。ledger 变化后的下一次渲染提供新的回调，消费者不应跨卸载或长期缓存旧 props。原 openSettings、openOnboarding 与 settingsOpen 保持现有语义。

settings.section 的 SettingsSectionOwnerProps 增加可选 focusShell(direction: 'previous' | 'next'): void：previous 对当前选中导航按钮调用 focus()；next 对壳的 Close 按钮调用 focus()。SettingsPanel 用 activeNavRef 与 closeButtonRef 持有实际元素，无 DOM 查询。尚未挂载或已卸载的 ref 为 null 时不操作；非法方向不操作。回调本身不 preventDefault、不切换页面，也不关闭设置；消费者自行判断键盘边界与事件处理时机。

既有 close: () => void 继续直接转发面板 onClose，关闭按钮也使用同一回调。不增加另一份 close 接口。

## 消费者回退与生命周期

新代码可检测 typeof openSettingsSection === 'function' 后调用；在旧壳缺少此能力时回退到原 openSettings()，让用户从导航选择目标页面，不模拟导航按钮点击。目标 section 尚未注册时，精确导航被忽略，消费者可按产品需要保留普通设置入口。

focusShell 是可选能力。缺失时保留普通 Tab 与现有 modal 焦点管理，不使用 DOM 选择器补偿。具备此能力时，消费者可以在其自有控件的首尾边界调用 focusShell?.('previous') 或 focusShell?.('next')；仅在确实转交焦点时接管默认键盘事件。原 close() 可照常用于离开设置的操作。

回调由当前渲染实例提供，消费者不应在贡献项卸载后保存或调用它；React 解绑 ref 后回调不会重新定位其他面板。本扩展没有新增 timer、全局事件或订阅，也不改变现有 modal 的 Escape、遮罩及关闭按钮生命周期。

## 验证与移除条件

行为测试见 [settings-shell-navigation.test.mjs](../test/settings-shell-navigation.test.mjs)：执行实际安装 bundle 的 module factory 与 apply，从真实 sidebar.settings slot 注册拿到 SettingsRoot，再执行其 SettingsPanel 函数组件；通过真实 renderSlot 调用捕获 launcher 与 section props。验证已注册/未知/卸载后 id、空 ledger、当前或回退选中行的真实 ref.focus 调用、Close ref、ref 解绑以及原 onClose 转发。测试禁用组件阶段的 document.querySelector，避免把 DOM 定位误认为公开能力。

运行命令：

```bash
node node_modules/vitest/vitest.mjs run test/settings-shell-navigation.test.mjs
```

VM 行为覆盖不等于浏览器焦点与真实 Harness 激活验收。桌面和 Web 集成时仍需验证实际插件贡献项、窄窗口、键盘边界、旧壳回退与卸载；本次不宣称已完成真实 UI 验收。

上游提供等价的 launcher 精确 section 导航及 section 焦点交还契约后，先迁移消费者并验证行为和类型，再删除本次新增 hunk。两个原子补丁包含已有独立修复，不能因本扩展被上游接纳而整体删除；保留仍未被上游覆盖的 footer/onboarding 等 hunk。升级时重新确认实际发布 API 与回调语义，避免重复注入或依赖压缩内部实现。
