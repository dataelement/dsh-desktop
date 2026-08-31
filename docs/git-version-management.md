# Sherlock 本地 Git 与版本管理规范

## 目标

保证每个 session 的开发成果都有可追溯提交，并在正式构建前确认所有准备发布的本地分支都已进入 `main`，避免“开发环境已经修改、正式版仍缺少功能”。本地 `main` 是日常集成权威，不会自动同步上游。

## 日常修改

1. 每个 session 使用独立的 `codex/<主题>` 分支或 worktree。
2. 修改完成后只运行本次改动直接影响的聚焦测试。
3. 只暂存本次修改的文件，禁止使用 `git add -A` 混入其他 session 或用户文件。
4. 测试通过后必须提交，提交信息必须包含中文并清楚说明修改，例如：

   ```bash
   git commit -m "修复：确保正式版加载最新内置 PPT Skill"
   ```

5. 多 session 功能按 `docs/sherlock-multi-session-integration-runbook.md` 交接、预检、集成和用户接受后，才以 fast-forward 推进本地 `main`。不要删除已合并的临时分支或 worktree；保留它们供验收和恢复检查。

## 上游同步

日常集成禁止自动 `pull`、`fetch` 后合并、rebase、push 或重写历史。本地 `main` 与上游的差异必须在独立的 `codex/upstream-sync/<YYYYMMDD>` 分支中审阅、验证和决定；该审阅不与功能集成、用户接受或正式发布混在同一个任务或提交中。

## 三个独立门槛

- 集成：交接卡、只读 preflight、lease 和集成分支记录完整功能历史。
- 接受：用户接受精确 integration tip；它只记录 acceptance，不推进 `main`。
- 正式发布：仅从干净本地 `main` 运行正式发布手册；签名、公证、Cloudflare 和更新器仍为独立门槛。

首次使用或重新克隆仓库后执行：

```bash
npm run git:policy:install
```

该命令启用仓库内 `.githooks/commit-msg`，没有中文说明的提交会被拒绝。

## 大版本标签

- `1.0.0`、`2.0.0` 等大版本必须在对应正式构建提交上创建本地注释标签，格式固定为大写 `V`：

  ```bash
  git tag -a V1.0.0 -m "Sherlock V1.0.0"
  ```

- 补丁版和普通小版本不强制创建标签。
- 标签默认只保存在本地。没有用户明确授权时，禁止执行 `git push --tags` 或单独推送版本标签。

## 正式构建门禁

正式构建前执行：

```bash
npm run git:formal:verify
```

以下任一情况都会阻止正式构建：

- 当前不在 `main`；
- 存在尚未提交的受 Git 跟踪文件；
- 其他 session 的 worktree 仍有尚未提交的修改；
- 其他本地分支存在尚未合并到 `main` 的提交；
- 当前版本是 `Vx.0.0` 大版本，但当前提交缺少对应的本地注释标签。

`./script/build_and_run.sh --formal` 会在读取签名身份、打包或上传公证文件之前自动执行同一检查。
