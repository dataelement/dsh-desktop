# Desktop 适配基线兼容修复

目标 Harness 版本 0.2.2-rc.1。公共客户端已经贡献的 sidebar.primaryNavigation、desktop.mode.content 和 conversation.hero.brand.title 缺少对应 owner 声明/出口，表现为贡献项不挂载而非企业后端一定导入失败。补丁分别保存在 sidebar、layout、conversation 三个标准原子补丁，升级发现等价公开能力后删除对应 hunk，不能整体删除仍有独立用途的旧补丁。

- 主导航为 root/single，向贡献项提供当前面板、选择操作、展开侧栏和原生 renderAction；无贡献使用原面板列表。NavigationRow 沿用原 panelTitle 样式和 Tooltip.side API。声明与公开类型同批更新。
- 主内容包裹为 root/single，接收 work、columns、resizeHandle。work 是主区和右栏的同一份内容节点；包裹模式使用两列内部坐标，无贡献沿用外部三列坐标。原右栏拖动柄只随选定分支渲染一次，左侧栏拖动柄保留在外层。Web 未提供原生 present 能力时不注册桌面内容贡献。
- Hero 标题为 root/single，仅替换标题文本面；没有贡献保留原本地化 headline，徽标和输入内容不变。
- 恢复维修草稿与工具入口，全部走已有窄桥和公开插槽。仅空、未改动的编辑器可接纳草稿；跨异步 editor revision 由 insertText 校验，卸载后不插入或确认，既有文字/附件不会被覆盖，不自动提交。

回归保留原有行为断言。文件预览改为真实 slot action 调用；DOM 夹具补足样式节点和 renderSlot 的真实 fallback 语义。产品发布/闭包测试无显式配置时继续校验默认产品，有配置时使用公开产品身份、安装插件元数据及锁文件闭包，不把企业包硬写进第三方依赖。

相关行为测试：sidebar-primary-navigation、product-content-slots、repair-draft-ui、file-preview、workbench-patch-slots。AST提取的布局/标题函数测试覆盖实际渲染函数，不替代完整Host和真实Electron验收。
