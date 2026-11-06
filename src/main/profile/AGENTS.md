# Profile 约束

继承 `src/main/AGENTS.md`。这里保存 profile 目录里的数据和迁移，不创建窗口。

- 不导入 `electron`，不依赖窗口对象。
- `profiles/web` 到 `profiles/desktop` 是复制。旧目录留下，供旧版本继续读取。
- 迁移用 `profiles/.dsh-profile-rename.json` 记录进度。复制中断后下次启动丢掉半成品再复制。已经完成的复制不重复执行，也不覆盖已存在、且不是这次复制结果的 `profiles/desktop`。
- generation 登记在 `profiles/.generations`，不属于 profile 目录内部，改名时不搬动。启动投影只处理调用方传入的 profile 名。
- `desktop-storage.ts`、`profile-store.ts` 和 `generation-launch.ts` 从 `state/` 迁入。generation 迁移、插件开关和移除仍留在 `state/`，旧壳还在调用它们。
- `prepareGenerationsForLaunch` 的 profile 名缺省是 `web`，这是旧壳的行为。新壳传入 `desktop`。缺省的 `desktop` 目录用 `@deepseek-ai/dsh-base` 和 `@deepseek-ai/dsh-web-app` 初始化，不用 web 模板。
- 投影可以创建 `profiles/<profile>/node_modules` 里的 generation 链接。它不创建共享的 `profiles/node_modules`。pnpm 拥有的真实目录不会被投影替换；投影写进 manifest 的 generation 字段，仍由旧壳的 pnpm runner 在安装前临时拿掉。新壳还没有插件安装。
