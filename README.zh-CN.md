# DSH Desktop — 非官方 Linux 版本

[English](README.md) | 简体中文

[dataelement/dsh-desktop](https://github.com/dataelement/dsh-desktop)
官方只提供 Windows 和 macOS 安装包，本仓库提供社区维护的 Linux amd64
`.deb` 安装包。

本仓库**不包含应用源码**。GitHub Actions 每 3 小时检查一次上游，发现新的
release tag（`vX.Y.Z`）就直接用未经修改的上游源码构建，并在这里发布为
`linux-vX.Y.Z`。

## 安装

从 [Releases](../../releases) 下载最新的 `.deb`，然后执行：

```bash
sudo apt install ./dsh-desktop-<版本号>-linux-amd64.deb
```

用每个 release 附带的 `SHA256SUMS` 校验下载文件：

```bash
sha256sum -c SHA256SUMS
```

## 说明

- 只添加了打包相关的元数据（版本号、图标、`.desktop` 启动项），应用代码与上游 tag 完全一致。
- 预发布 tag（如 `v0.10.0-beta`）会发布为 GitHub prerelease。
- 应用本身的 bug 请反馈给上游；打包相关的问题请在本仓库提 issue。
- 本项目不是 DataElement 官方发布。

## 手动构建

Actions → **Build unofficial Linux DEB** → Run workflow。可以指定上游 tag，
勾选 "force" 可强制重新构建。
