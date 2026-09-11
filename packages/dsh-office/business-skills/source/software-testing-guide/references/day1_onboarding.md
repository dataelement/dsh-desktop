# 首日入职清单

**目的**：为新加入软件测试项目的 QA 工程师提供 5 小时入职指南。

**时间**：5 小时（含休息）

---

## 第 1 小时：环境搭建（60 分钟）

### 1.1 克隆仓库并安装依赖
```bash
git clone <repository-url>
cd <project-dir>
pnpm install  # or npm install
```

### 1.2 启动本地数据库（如使用 Supabase/PostgreSQL）
```bash
npx supabase start  # Wait 2-3 minutes for all containers
docker ps | grep supabase  # Verify 8-11 containers running
```

### 1.3 配置环境变量
```bash
cp .env.example .env
# Edit .env with local development URLs
```

### 1.4 执行数据库迁移
```bash
# Apply all migrations in order
for file in database/migrations/*.sql; do
  docker exec -i <db-container-name> psql -U postgres -d postgres < "$file"
done
```

### 1.5 验证数据库已有初始数据
```bash
docker exec <db-container-name> psql -U postgres -d postgres -c "SELECT COUNT(*) FROM <main-table>;"
# Should return expected row count
```

### 1.6 启动开发服务器
```bash
pnpm dev
# Verify: http://localhost:8080 (or configured port)
```

**检查点**：✅ 环境运行正常，数据库有初始数据，网站可正常加载。

---

## 第 2 小时：文档学习（60 分钟）

### 2.1 阅读快速入门指南（30 分钟）
- 了解项目范围（总测试用例数、时间线）
- 识别测试分类（CLI、Web、API、安全）
- 记住质量门禁（通过率目标、P0 缺陷策略）
- 熟悉执行计划（第 1-5 周安排）

### 2.2 学习测试策略（30 分钟）
- 理解 AAA 模式（准备-执行-断言）
- 学习缺陷分级（P0-P4 严重级别）
- 掌握测试用例格式（TC-XXX-YYY 编号规则）
- 了解 OWASP 安全覆盖率目标

**检查点**：✅ 测试策略已理解，测试用例格式已掌握。

---

## 第 3 小时：测试数据准备（60 分钟）

### 3.1 创建测试用户（20 分钟）
**通过界面**（如有注册页面）：
1. 访问 `/auth` 或 `/signup`
2. 创建 5 个普通测试用户
3. 创建 1 个管理员用户
4. 创建 1 个版主用户

**通过 SQL**（分配角色）：
```sql
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'admin@test.com';
```

### 3.2 安装 CLI 进行测试（20 分钟）
```bash
# Global installation (for testing `ccpm` command directly)
cd packages/cli
pnpm link --global

# Verify
ccpm --version
ccpm --help
```

### 3.3 配置浏览器开发者工具（20 分钟）
- 安装 React Developer Tools 扩展
- 设置网络限速预设（慢速 3G、快速 3G、快速 4G）
- 配置响应式设计模式（手机、平板、桌面视口）
- 测试视口切换

**检查点**：✅ 测试用户已创建，CLI 已安装，开发者工具已配置。

---

## 第 4 小时：执行第一条测试用例（60 分钟）

### 4.1 打开测试执行追踪表（5 分钟）
- 文件：`tests/docs/templates/TEST-EXECUTION-TRACKING.csv`
- 用 Google Sheets、Excel 或 LibreOffice Calc 打开
- 找到第一条测试用例：`TC-CLI-001` 或对应编号

### 4.2 阅读完整的测试用例文档（10 分钟）
- 在文档中定位测试用例（如 `02-CLI-TEST-CASES.md`）
- 阅读：前置条件、测试步骤、预期结果、通过/失败标准

### 4.3 执行 TC-001（20 分钟）
**示例（CLI 安装命令）**：
```bash
# Step 1: Clear previous installations
rm -rf ~/.claude/skills/<skill-name>

# Step 2: Run install command
ccpm install <skill-name>

# Step 3: Verify installation
ls ~/.claude/skills/<skill-name>
cat ~/.claude/skills/<skill-name>/package.json
```

### 4.4 记录测试结果（15 分钟）
更新 `TEST-EXECUTION-TRACKING.csv`：
| 字段 | 值 |
|-------|-------|
| **状态** | 已完成 |
| **结果** | ✅ 通过 或 ❌ 失败 |
| **缺陷 ID** | （通过则留空） |
| **执行日期** | 2025-11-XX |
| **执行人** | [你的名字] |
| **备注** | 简要描述（如"Skill 安装耗时 3.2 秒，所有文件存在"） |

**如果测试失败**：
1. 打开 `BUG-TRACKING-TEMPLATE.csv`
2. 创建新缺陷条目（缺陷 ID：BUG-001、BUG-002 等）
3. 填写：标题、严重级别（P0-P4）、复现步骤、环境信息
4. 在追踪 CSV 中关联缺陷与测试用例

### 4.5 庆祝一下！（10 分钟）
✅ 第一条测试用例执行成功！

**检查点**：✅ 第一条测试用例已执行并记录。

---

## 第 5 小时：团队入职与规划（60 分钟）

### 5.1 认识团队（20 分钟）
**安排与以下人员会面**：
- QA 负责人（你的直属上级）
- QA 工程师（同事）
- 技术负责人（解答技术问题）
- DevOps 负责人（处理基础设施问题）

**会议议程**：
1. 自我介绍
2. 项目概述和目标
3. 你的角色和职责
4. 问答和疑难解答

### 5.2 评审第一周计划（20 分钟）
**与 QA 负责人一起**：评审每周执行计划。

**示例 第一周：CLI 测试（93 条测试用例）**
| 天 | 测试用例 | 时长 | 交付物 |
|-----|------------|-------|--------------|
| 周一 | TC-CLI-001 到 TC-CLI-015 | 5 小时 | 15 条测试已执行 |
| 周二 | TC-CLI-016 到 TC-CLI-030 | 5.5 小时 | 15 条测试已执行 |
| 周三 | TC-CLI-031 到 TC-CLI-045 | 5.5 小时 | 15 条测试已执行 |
| 周四 | TC-CLI-046 到 TC-CLI-060 | 5.5 小时 | 15 条测试已执行 |
| 周五 | TC-CLI-061 到 TC-CLI-093 | 6.5 小时 | 33 条测试 + 周报 |

**讨论**：
- 今天搭建环境时有遇到阻塞吗？
- 对工具和文档有信心了吗？
- 需要调整什么吗？

### 5.3 收藏关键资源（10 分钟）
**创建浏览器书签文件夹**："项目 QA 资源"

**必备链接**：
- 本地网站（http://localhost:8080 或配置的端口）
- 数据库管理界面（Supabase Studio、phpMyAdmin 等）
- GitHub 仓库
- 测试用例文档
- 追踪表格

### 5.4 最后答疑（10 分钟）
**常见问题**：

**问：如果第一天就发现了 P0 严重缺陷怎么办？**
答：立即通知 QA 负责人。记录到缺陷追踪表中。P0 缺陷阻塞发版，必须在 24 小时内修复。

**问：如果一天内无法完成所有测试用例怎么办？**
答：优先执行 P0 测试。当天下班前通知 QA 负责人。计划可以调整。

**问：可以不按顺序执行测试吗？**
答：可以，但请按优先级顺序（P0 → P1 → P2 → P3）。更新追踪表。

**问：如果测试用例描述不清楚怎么办？**
答：在团队 Slack/聊天群中提问。在追踪表中记录问题，以便后续改进。

**检查点**：✅ 团队已认识，第一周计划已评审，所有问题已解答。

---

## 首日完成检查清单

下班前确认所有准备工作已完成：

### 环境
- [ ] 仓库已克隆，依赖已安装
- [ ] 数据库运行中（Docker 容器或托管实例）
- [ ] `.env` 文件已配置正确的 URL/密钥
- [ ] 数据库迁移已执行，初始数据已导入
- [ ] 开发服务器运行中，网站可正常加载

### 工具
- [ ] CLI 已安装（如适用）— 全局和/或本地
- [ ] 浏览器开发者工具已配置并安装扩展
- [ ] 网络限速预设已添加
- [ ] 响应式设计模式已测试

### 测试数据
- [ ] 已创建普通测试用户（5+ 个）
- [ ] 已创建管理员用户并分配角色
- [ ] 已创建版主用户并分配角色（如适用）

### 文档
- [ ] 快速入门指南已阅读（了解范围和时间线）
- [ ] 测试策略已学习（了解 AAA 模式和质量门禁）
- [ ] 第一条测试用例已成功执行
- [ ] 测试结果已记录到追踪表

### 团队
- [ ] 团队介绍已完成
- [ ] 第一周计划已与 QA 负责人评审
- [ ] 关键资源已收藏
- [ ] 沟通渠道已加入（Slack、Teams 等）

---

## 下一步：第一周测试开始

**周一早上启动**：
1. 参加团队站会（15 分钟）
2. 回顾首日搭建是否有遗留问题
3. 开始第一周测试执行（按计划进行）

**每日节奏**：
- **上午**：团队站会（15 分钟）
- **上午工作**：测试执行（9:15 - 12:00）
- **午餐**：休息（12:00 - 13:00）
- **下午工作**：测试执行（13:00 - 17:00）
- **收尾**：更新追踪表、提交缺陷、状态汇报（17:00 - 17:30）

**每周交付物**：周五下班前 — 提交每周进度报告给 QA 负责人。

---

## 首日常见问题排查

### 问题 1：数据库容器无法启动
**症状**：数据库服务启动失败或容器显示"unhealthy"

**解决方案**：
1. 重启数据库服务（Docker Desktop、systemd 等）
2. 查看日志：`docker logs <container-name>`
3. 检查端口是否被占用：`lsof -i :<port-number>`
4. 清理旧容器（⚠️ 谨慎操作）：`docker system prune`

### 问题 2：网站显示"无法获取数据"
**症状**：首页可加载但数据区域为空

**解决方案**：
1. 验证数据库有初始数据：`SELECT COUNT(*) FROM <table>;`
2. 检查 API 连接（开发者工具的网络面板）
3. 确认 `.env` 文件中数据库 URL 正确
4. 重启开发服务器

### 问题 3：安装后 CLI 命令找不到
**症状**：安装后执行命令提示 `<command>: command not found`

**解决方案**：
1. 检查安装路径：`which <command>` 或 `pnpm bin -g`
2. 添加到 PATH：`export PATH="$(pnpm bin -g):$PATH"`
3. 永久生效：添加到 `~/.bashrc` 或 `~/.zshrc`
4. 重新加载 shell：`source ~/.bashrc`

### 问题 4：测试用户角色未生效
**症状**：管理员用户无法访问管理功能

**解决方案**：
1. 验证角色是否已写入：`SELECT * FROM user_roles WHERE user_id = '<user-id>';`
2. 退出并重新登录（角色可能缓存在会话中）
3. 清除浏览器 Cookie 和本地存储（F12 → Application 面板）

---

## 恭喜！🎉

你已完成首日入职。现在可以开始执行完整的测试计划了。

**有问题或遇到阻塞？**
- Slack/Teams：#qa-team 频道
- 邮件：qa-lead@company.com
- 升级处理：技术负责人（针对严重缺陷）

**周一见，开始第一周测试！** 🚀
