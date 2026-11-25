# Workbench source provider contract

`dsh-desktop-workbenches/source-provider.mjs` is the minimal upstream seam for product-specific Workbench sources. A provider owns account credentials, tenant authorization, transport, labels and business behavior. The shared layer only registers providers and provides a common source card shape.

Providers implement `sourceId`, `list()`, `refresh()`, `open()`, `install()`, `remove()` and `availability()`. Cards use `createWorkbenchSourceCard()` for source labels, loading, error, empty and provider-owned actions. A product that needs to appear inside the shared Market registers a collection with `desktopWorkbenches.registerMarketCollection({ id, label, order, render })`. Installation, account refresh, favorites, sessions, workspaces, welcome cases and enterprise UI remain in the owning product layer and reuse existing Desktop contracts.

Products may explicitly replace a built-in tab with `registerMarketCollection({ id: 'favorites', replace: true, label, render })`. The built-in IDs `market`, `favorites`, and `mine` remain reserved without `replace: true`; `submit` is always reserved. Built-in replacements may omit `render` to retain the built-in panel while configuring a label, numeric `order`, or boolean `visible`. Default orders are 0, 10, and 20. Custom collections default to 30. `getMarketTabs()` returns the visible, ordered composition without duplicates. The first visible tab is the initial selection and the fallback after a selected contribution disappears. Keyboard navigation uses that same composition. Disposing a replacement restores the original tab and panel. Only one contribution may own a given ID; visibility is presentation, not authorization.


### 自定义集合的统计标签

`service.collectionLabels === true` 时，集合可提供 `renderLabel({ service, count })`，返回标签的 React 内容。`label` 仍是必填的静态后备文案。内置 `favorites` / `mine` 的 `count` 是未经过搜索和分类过滤的原生条目数量；其他集合为 `undefined`。扩展可在自己拥有的组件中订阅企业数量并组合显示，不能把企业数据塞入原生安装状态。卸载注册项后恢复原生标签和统计。
