# dsh-desktop-workbenches

Desktop host plugin for the Awesome DSH Workbench market, local workbench state, navigation and the native conversation frame.

Market metadata comes exclusively from the published Awesome protocol v2 index. Runtime providers register their component without a caller-supplied ID. Local packages may omit `repository`: the host derives `local:<npm package name>` from the actual client package, including `local:@scope/name`. Local development, installation, and use require no GitHub account, URL, or repository creation. Version or directory changes preserve identity; package renames create a new identity. Existing valid repository attribution keeps `owner/repo`. Later market publication does not automatically migrate local sessions or overwrite local identity; migration must be explicit. Registration failures appear in Workbench management with package, stage, and reason and emit console warnings; successful reload clears the matching diagnostic. A provider that wants to be recognized as the installed form of an Awesome entry must include the canonical GitHub URL in its registration descriptor's `repository` field.

The host does not bundle a separate catalog or third-party workbench packages. It installs, updates and uninstalls catalog entries on the user's request through Desktop's isolated-generation boundary (`desktopPnpm.installWorkbenchGeneration`) and records them in `market-installs.json`; see `docs/workbenches.md`.

## 两份文档与官网链接

开发和上架分成两份文档，内容不重复。**官网是唯一的公开链接**：页面和 README 链接到官网阅读页，给 Agent 的指令链接到同一文档的 Markdown 原文。Agent 必须实际获取在线 Markdown 并记录地址与文档版本。Desktop 内附随应用版本打包的快照，不保证最新，仅在在线获取失败时备用；使用时报告失败原因、离线来源及版本，不得静默替代官网规范。若在线规范与运行版本不一致，说明能力差异和受阻步骤，不以旧副本覆盖在线规范。

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
