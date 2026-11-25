# 工作台集合的默认内容组合

`desktopWorkbenches.registerMarketCollection` 的 `render` 接收 `{ service, renderDefault, search }`。覆盖内置集合时，可调用 `renderDefault()` 保留宿主卡片及安装、更新、启停和卸载操作，再组合产品内容。它只渲染当前集合的默认卡片与分页，不创建重复 tabpanel，也不递归调用产品 render。

可选 `controls: false` 取消宿主搜索、分类、排序和刷新控件，由集合提供自己的控件。此时默认卡片不应用宿主保留的搜索词和分类条件，并使用默认排序；切回带控件的集合或取消注册后，原控件状态仍保留。省略时保留现有行为。取消注册恢复默认内容和控件。数据、权限、持久化仍由注册方拥有。

验证：`npx vitest run test/workbench-client.test.mjs`。覆盖默认卡片组合、控件开关、清理恢复和旧集合行为。

集合可使用 `search: true` 在 `controls: false` 时独立保留顶部搜索框。`render` 的 `search` 是原始搜索词，集合自行筛选其数据；切换集合保留同一个搜索词。`service.collectionSearch === true` 表示宿主支持此接口，旧宿主上的扩展应保留本地搜索作为回退。取消注册恢复默认行为，不改变分类、排序和刷新的控制开关。
