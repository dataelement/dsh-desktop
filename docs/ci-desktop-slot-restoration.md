# Desktop 客户端扩展点恢复

2026-11-10 的 Actions run 42845679572 在 Windows 共享测试中发现客户端与补丁不同步：Desktop 向 sidebar.primaryNavigation 等位置注册贡献项，但安装后的 Harness 没有对应声明和出口；维修草稿与维修入口组件也在当前分支中缺失。

本次复用提交 616c08815d 中与这些失败相关的实现，目标版本均为 Harness 0.2.2-rc.1：

- ui-sidebar：补齐 sidebar.primaryNavigation 的 single/root 声明、类型、Props 与实际出口；无贡献项保留原生面板和 More 菜单，有贡献项仅挂载一次，保留 quickSwitcher 和工作区位置。
- ui-layout：补齐 desktop.mode.content 的 single/root 声明、类型和出口，传入工作区内容、列宽与右栏拖动手柄；无贡献项回退到原布局。
- ui-conversation：补齐 conversation.hero.brand.title 的 single/root 声明、类型和出口，无贡献项保留本地化标题。
- Desktop 插件：恢复维修草稿及维修/手机入口，沿用现有 preload 窄桥、插入版本校验、卸载保护和中英文文案。

现有扩展点无法承载这些导航与布局位置，因此恢复最小上游接缝；产品业务继续留在 Desktop 插件中，不通过 DOM 搬移上游组件。上游提供等价公开契约后，应迁移并删除相应补丁，确认无重复注册或挂载。

回归包含 sidebar-primary-navigation、product-content-slots、repair-draft-ui、patch-runtime-compatibility、workbench-patch-slots 和 patch-lock。它们验证默认回退、展开/折叠、长文案贡献项、导航回调、拖动手柄、插入过期及卸载；真实平台构建和界面验收仍需 Actions / 安装包验证，模拟测试不替代真实 UI 验收。
