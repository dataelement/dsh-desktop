# 工作台市场验收规范

版本：2026-09-21 · 以官网版本为准，DSH Desktop 内附同一份文档供离线阅读。

官方地址：https://dshdesktop.com/workbench/docs/market-acceptance/

Markdown 原文（供 Agent 读取）：https://dshdesktop.com/workbench/docs/market-acceptance.md

本文只适用于**想把工作台上架到工作台市场**的情况。只在本地开发、自己使用的工作台，满足《工作台开发规范》（https://dshdesktop.com/workbench/docs/development/ ）并在本机自测通过即可，不需要阅读本文，也不需要公开代码或上传任何资料。

上架流程与 DSH 插件市场相同：作者把代码放到自己的公开 GitHub 仓库，再向 [awesome-dsh-workbench](https://github.com/dataelement/awesome-dsh-workbench) 提交一个收录 PR。简介、截图等资料只在这一步才需要准备。收录 YAML 与客户端索引的字段以该仓库的 `catalog/README.md` 和 `schema/` 为准，本文只说明作者要满足什么、审核看什么，不重新定义字段。

规则分三级：**必须**（不满足就不能收录或安装）、**建议**、**可选**。

## 1. 上架前提

- **必须**满足《工作台开发规范》的全部“必须”项，并通过其中的本地自测清单。
- **必须**在真实的 DSH Desktop 上安装并实际打开验证过；记录验证过的 Desktop 版本、操作系统和架构。未验证的平台不声明兼容。

## 2. 上架流程

1. **公开仓库**：把代码提交到作者自己的公开 GitHub 仓库。
2. **准备安装来源**：发布 npm 包，或上传 GitHub Release 安装包，或确保仓库源码可以直接安装（见第 4 节）。
3. **准备上架资料**：名称、分类、中英文简介、截图（见第 5 节）。
4. **提交收录 PR**：向 awesome-dsh-workbench 新增一个 `data/workbenches/<owner>__<repo>.yml`。提交 PR 就是进入审核，进度以 GitHub 上的 PR 为准，本机不保存投稿状态。
5. **审核**：自动检查 + 首次人工阅读（见第 6 节）。根据意见修改，确认最新提交的检查通过。
6. **上架**：PR 合并、市场目录更新后，工作台出现在工作台市场中，用户可以直接安装。

只创建了 PR 时称为“已提交”；合并后称为“已合并，等待目录更新”；在市场中能看到条目后才称为“已上架”。

## 3. 仓库与代码要求

与 DSH 插件市场的收录要求一致：

- **必须**是作者自己的公开 GitHub 仓库，并有许可证。私有仓库不能进入公共市场，但可以继续在本机或团队内部使用。
- **必须**声明 `dsh.bundle`；只有 `dsh.client` 的包不可安装，不会被收录。
- **必须**包含真实可用的代码，不收占位、只有 README 或抢注名称的仓库；持续维护，长期失效或归档的条目会被复查处理。
- 不收只有依赖列表的聚合包；不能是 DSH 本身的副本。
- 依赖**必须**指向原作者的仓库或其发布的 npm 包，不能把别人的插件重新上传到自己名下再依赖。
- 不得包含混淆代码、窃取凭证或在安装时执行意外行为的代码。

工作台市场的额外要求：

- v1 只支持**仓库根目录放一个工作台**，暂不支持 monorepo 子目录。
- `package.json` 是安装契约：完整 SemVer 版本、指回本仓库的 `repository`、`dsh.bundle.patch`、包含 `dsh-desktop-workbenches` 的 `dsh.client.inject`，以及真实存在的 `exports["./client"]`。工作台不声明自定义 id；市场以该 GitHub 仓库的 `owner/repository` 作为唯一身份。
- 工作台只能通过宿主提供的工作台接口创建或恢复绑定会话；原生新建或打开普通会话后必须允许宿主退出工作台，不得用覆盖层、独立路由或自行恢复状态把用户拉回工作台。
- 进入工作台时宿主会自动收起左侧会话栏，用户仍可手动展开；工作台不得依赖侧栏保持展开，也不得用自己的覆盖层替代宿主侧栏。绑定会话应由宿主在标题前显示对应工作台图标，工作台必须提供可辨识且适合小尺寸显示的图标。
- 新建业务项目需要本地目录时，必须由用户通过宿主目录选择器确认位置；不得静默在默认路径创建文件夹。取消选择不得留下目录、空项目、工作区、会话或绑定，恢复项目只能复用用户此前确认过的位置。

## 4. 包与安装来源

市场按 **npm → GitHub Release 安装包 → GitHub 源码** 的顺序选择来源，安装时锁定到具体版本或 commit，校验失败就报错，不会自动换来源。

| 来源 | 作者要做什么 |
|---|---|
| npm 包（建议） | 发布真实版本；`package.json` 的 `name` 与 npm 包名一致，`repository` **必须**指回收录的仓库，否则市场不会采用 npm 来源 |
| GitHub Release 安装包 | 上传 `pnpm pack` 生成的 `.tgz` 或 `.tar.gz`，在收录 YAML 的 `tarball` 中填写地址。使用 `releases/latest/download/<固定文件名>` 时文件名不要带版本号；否则固定 tag |
| GitHub 源码 | 默认分支包含可直接安装的入口、构建产物和 bundle patch |

- 打包后**必须**不超过 8 MiB。
- 包内**不得**包含 `.env`、token、密钥、客户数据、数据库、本机绝对路径或无权公开的素材。
- **建议**发布已构建的包。从源码安装只下载源码，不会运行 `build`；需要 `prepare` 等构建脚本时，用户必须单独授权，体验更差。
- 不要依赖需要本机工具链的原生模块（node-gyp、Python、Rust 等），除非只通过预构建包分发。
- 官方 `@deepseek-ai/*` 包写在 `peerDependencies`，版本范围显式包含预发布分支，例如 `">=0.1.5-rc.2 <0.2.0-0"`。

## 5. 上架资料

资料写在收录 YAML 里，格式以 awesome-dsh-workbench 的 `catalog/README.md` 为准：

```yaml
url: https://github.com/owner/repo
name: 项目助手
category: productivity
description:
  zh: 帮助整理项目资料、跟进任务并生成工作报告。
  en: Organize project materials, track tasks, and generate work reports.
screenshots:
  - https://raw.githubusercontent.com/owner/repo/main/docs/images/overview.webp
# 可选：没有 npm 时指定 Release 安装包
# tarball: https://github.com/owner/repo/releases/latest/download/my-workbench.tgz
```

| 资料 | 级别 | 要求 |
|---|---|---|
| `url` | 必须 | 仓库主页，与文件名 `<owner>__<repo>.yml` 一致 |
| `name` | 必须 | 市场展示名称，一行 |
| `category` | 必须 | 市场仓库 `data/categories.json` 中的分类之一 |
| `description.zh`、`description.en` | 必须 | 中英文都要，各一行；**必须**属实，会对照代码核对，不写夸大或营销用语 |
| `screenshots` | 必须 | 1–5 张，第一张为封面 |
| `tarball` | 可选 | 只在需要指定 Release 安装包时填写 |

截图要求：

- 图片放在作者自己的仓库里，填写完整 HTTPS 地址（`raw.githubusercontent.com` 或 `github.com/.../blob/...`），不接受相对路径、其他仓库或第三方图床。
- PNG、JPEG 或 WebP，单张不超过 2 MiB；建议横向 16:9、宽度至少 1280px。
- **必须**是真实产品画面，与可安装的版本相符，拥有使用权，不含凭证、个人信息或客户数据。

不要在 YAML 里填写版本、npm 包名、校验值或作者 ID，这些由自动探测得到；不要修改市场仓库中生成的文件；只改自己的条目。

PR 描述写明：工作台用途、本机验收结果、验证过的 Desktop 版本和平台、安装来源，以及需要注意的外部依赖、网络访问和数据位置。

### 与 DSH 插件市场的不同之处

| 项目 | DSH 插件市场 | 工作台市场 |
|---|---|---|
| 收录仓库 | `awesome-dsh-plugin` | `dataelement/awesome-dsh-workbench` |
| 文件 | `data/plugins/<owner>__<repo>.yml` | `data/workbenches/<owner>__<repo>.yml` |
| 分类 | 23 个插件分类 | 7 个工作台分类 |
| 简介 | `en` 必填，`zh` 可选 | `zh` 和 `en` 都必填 |
| 截图 | 作者仓库的 `screenshots.json`，1–8 张 | 写在收录 YAML 中，1–5 张 |
| monorepo | 支持子包 | v1 暂不支持 |
| 额外检查 | — | `package.json` 安装契约、客户端入口、包体积 |

## 6. 审核与验收

**自动检查**（PR 上运行）：

- YAML 格式、字段、分类、文件名、重复条目和改动范围。
- 仓库可以访问、未归档、有真实代码、`package.json` 满足安装契约、有许可证。
- 按安装来源下载实际的包，核对包名、版本、工作台 id、入口、bundle patch 和体积。
- 截图可以访问，格式、大小和数量符合要求。

检查因网络或配额没有完成时，结果是“未完成”，不能算作通过；合并前以最新提交的检查结果为准。

**首次人工阅读**：维护者对照代码核对描述是否属实、是否重复、有无明显异常行为、是否符合《工作台开发规范》的运行规则。这不是完整的安全审计。

**验收清单**（作者提交前自查，审核者据此核对）：

- [ ] 已通过本地自测，并记录了验证过的 Desktop 版本和平台。
- [ ] 公开仓库，有许可证；代码真实可用，没有密钥或用户数据。
- [ ] 至少有一个可用的安装来源；npm 包的 `repository` 指回该仓库；打包不超过 8 MiB。
- [ ] 新建项目需要本地目录时由用户选择位置；取消不产生目录、空项目、工作区、会话或绑定，工作台不会在默认位置静默创建文件夹。
- [ ] 进入工作台后会话栏自动收起且紧凑布局无裁切；用户可重新展开，绑定会话显示正确的工作台图标，普通会话不显示。
- [ ] 收录 YAML 字段完整，中英文简介属实，截图是真实产品画面。
- [ ] PR 只新增自己的一个 YAML 文件，描述写明验收结果和平台。

## 7. 上架之后

- **更新版本**：源码 PR 合并或只修改 `package.json` 版本号不等于市场版本发布。npm 来源必须发布新的 npm 版本；GitHub Release 来源必须创建新 Release，并上传收录条目约定的安装包文件名。使用 `releases/latest/download/<固定文件名>` 时通常不需要再提收录 PR，但必须验证固定地址、包内版本和完整性；固定地址或文件名变化时才提 PR 修改 `tarball`。源码安装来源更新提交后可由市场重新发现。每个版本仍由作者自己测试和验收。
- **修改资料**：修改名称、分类、简介、截图地址或仓库地址时，提 PR 修改 YAML。
- **用户侧**：安装和更新都由用户在 Desktop 市场中点击触发，重启 Harness 后生效，不会静默升级；卸载只移除包和入口，保留会话、项目文件、笔记和收藏。
- **下架**：由市场仓库处理索引。条目不在索引中后，市场不再展示，也不能新装；已安装的用户可以继续使用。

## 参考

- DSH 插件市场收录规则：[awesome-dsh-plugin contributing.md](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)、[dsh-market](https://github.com/dsh-market/dsh-market)。
- 工作台市场收录格式：[awesome-dsh-workbench](https://github.com/dataelement/awesome-dsh-workbench) 的 `catalog/README.md` 与 `schema/`。
- 开发阶段的规则：《工作台开发规范》：https://dshdesktop.com/workbench/docs/development/ 。
