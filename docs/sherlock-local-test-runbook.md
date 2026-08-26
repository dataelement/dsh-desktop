# Sherlock 本地测试构建手册

## 触发与边界

用户说“本地启动看看”“构建给我测试”“测试一下最新版本”或同义表达时，执行本手册。目标是把当前开发成果构建成正式 Sherlock 身份的本地应用并直接打开，供少量开发用户现场测试。

本流程必须跳过 Apple 公证，并且不得：

- 上传 Cloudflare R2 或修改任何公开更新源；
- 递增版本号、生成公开 DMG/ZIP 或清理线上历史版本；
- 推送源码、推送标签或触发正式发布自动化；
- 删除、重置或迁移用户现有的工作区、会话、模型配置和凭据。

只有用户明确要求“更新上传发布正式版”“发布 Sherlock 正式版”“发布大版本”或对外发布时，才改走 `docs/sherlock-formal-release-runbook.md`。

## 执行步骤

1. 检查当前分支和工作区，保留并避开与本次测试无关的用户改动。
2. 只运行本次修改直接涉及的聚焦测试和类型检查，不运行全功能测试。
3. 构建并启动本地应用：

```bash
./script/build_and_run.sh --verify
```

该命令会停止旧的 Sherlock/Sherlock Dev 进程；仅在工作区内置 Node 缺失时自动执行 `npm rebuild node`；以 `com.evanarts.sherlock` 身份构建 `dist-notarized/mac-arm64/Sherlock.app`；显式禁用 Apple 公证；检查应用主程序、内置 Node 和深度签名后启动应用。

4. 对最终产物运行完整的本地包检查：

```bash
npm run verify:package:mac -- \
  --app "dist-notarized/mac-arm64/Sherlock.app"
```

5. 读取真实 Sherlock 窗口，确认看到工作区、会话和输入框等完整主界面，不得把进程存在、HTTP 可访问或恢复页当作启动成功。确认原有用户数据仍可见，并让应用保持打开供用户测试。

## 失败处理

- 若工作区 Node 自动恢复失败，停止构建并报告具体路径；不得继续生成已知不完整的包。
- 若最终包缺少内置 Node，启动脚本必须拒绝打开该包。
- 若出现“Harness 暂时无法启动”，读取恢复页技术详情和 Harness 日志定位真实错误；不得删除用户数据来规避问题。
- 本地测试通过只证明当前机器上的构建可测试，不代表已完成 Apple 公证、公开发布或老版本自动升级验证。
