# Workbench source provider contract

`dsh-desktop-workbenches/source-provider.mjs` is the minimal upstream seam for product-specific Workbench sources. A provider owns account credentials, tenant authorization, transport, labels and business behavior. The shared layer only registers providers and provides a common source card shape.

Providers implement `sourceId`, `list()`, `refresh()`, `open()`, `install()`, `remove()` and `availability()`. Cards use `createWorkbenchSourceCard()` for source labels, loading, error, empty and provider-owned actions. A product that needs to appear inside the shared Market registers a collection with `desktopWorkbenches.registerMarketCollection({ id, label, order, render })`. Installation, account refresh, favorites, sessions, workspaces, welcome cases and enterprise UI remain in the owning product layer and reuse existing Desktop contracts.
