# Sherlock 项目约定

- 当用户说“更新上传发布正式版”或“发布 Sherlock 正式版”时，必须使用 `sherlock-release` 技能并完整执行 `docs/sherlock-formal-release-runbook.md`。
- 若用户未指定版本，默认把当前正式版本的补丁号加一，例如 `0.6.3` 升到 `0.6.4`；发布前仍须与 Cloudflare 线上版本比较，禁止复用或降低版本号。
- 该触发语授权：同步当前开发成果到正式构建、修改版本号、运行聚焦检查、打包和签名、发布到 Sherlock 的 Cloudflare R2、验证公开更新源、提交并推送发布相关源码到既有 Fork 发布分支。
- 不要强行合并 `dataelement/dsh-desktop` 的上游 `main`，不要覆盖或提交无关的用户改动，不要创建会触发未配置 GitHub Actions 的版本标签。
- 开发完成不要运行全功能测试；只运行发布手册列出的聚焦测试以及被本次改动直接影响的测试。
