# dsh-desktop-workbenches

Desktop host plugin for the Awesome DSH Workbench market, local workbench state, navigation and the native conversation frame.

Market metadata comes exclusively from the published Awesome protocol v2 index. Runtime providers register their own component and runtime ID. A provider that wants to be recognized as the installed form of an Awesome entry must include the canonical GitHub URL in its registration descriptor's `repository` field.

The host does not bundle a separate catalog or third-party workbench packages. It installs, updates and uninstalls catalog entries on the user's request through Desktop's isolated-generation boundary (`desktopPnpm.installWorkbenchGeneration`) and records them in `market-installs.json`; see `docs/workbenches.md`.

## 两份文档与官网链接

开发和上架分成两份文档，内容不重复。**官网是唯一的公开链接**：页面和 README 链接到官网阅读页，给 Agent 的指令链接到同一文档的 Markdown 原文。Desktop 内附同一份文档的副本，只供离线阅读。

| 文档 | 官网阅读页（给人看） / Markdown（给 Agent） | 来源 | Desktop 离线副本 | 何时需要 |
|---|---|---|---|---|
| 工作台开发规范 | https://dshdesktop.com/workbench/docs/development/ ／ `development.md` | `docs/workbench-standard.zh.md` | `development-guide.zh.md`，`/api/desktop-workbenches/author-guide`（兼容别名 `/development-guide`） | 开发并在本机自测；只自己用时只需要这一份 |
| 工作台市场验收规范 | https://dshdesktop.com/workbench/docs/market-acceptance/ ／ `market-acceptance.md` | `docs/workbench-market-acceptance.zh.md` | `market-acceptance.zh.md`，`/api/desktop-workbenches/market-acceptance` | 想上架到工作台市场时 |

修改来源后：

```bash
node scripts/build-workbench-guide.mjs                          # 更新 Desktop 离线副本
node scripts/build-workbench-guide.mjs --site <官网仓库>/workbench  # 更新官网的两份文档和阅读页
```

两个命令都支持 `--check` / `--site-check` 检查是否一致。官网文档随官网部署发布；生成副本勿单独修改。收录 YAML 的字段以 GitHub 工作台市场仓库为准。
