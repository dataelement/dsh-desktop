# 测试用例模板

使用此模板编写标准化、可复现的测试用例。

---

## 模板结构

```markdown
### TC-[分类]-[编号]: [描述性标题]

**优先级**: P0/P1/P2/P3/P4
**类型**: 单元测试/集成测试/端到端/安全/性能
**预估时间**: [X] 分钟

**前置条件**:
- 条件 1（具体且可验证）
- 条件 2

**测试步骤**:
1. 步骤 1（具体命令或操作）
2. 步骤 2（明确的输入数据）
3. 步骤 3（验证操作）

**预期结果**:
✅ 具体结果及示例输出
✅ 可量化的验证标准

**通过/失败标准**:
- ✅ 通过：所有验证步骤均成功
- ❌ 失败：出现任何错误、数据缺失或偏差

**需关注的潜在缺陷**:
- 已知的边界场景或漏洞
- 相关安全隐患
```

---

## 示例：CLI 安装测试

```markdown
### TC-CLI-001: Install Skill from GitHub Repository

**Priority**: P0
**Type**: Integration
**Estimated Time**: 5 minutes

**Prerequisites**:
- CLI installed globally (`which ccpm` returns path)
- Internet connection active
- `~/.claude/skills/` directory exists or can be created
- No existing installation of `cli-demo-generator`

**Test Steps**:
1. Open terminal
2. Run: `ccpm install cli-demo-generator`
3. Observe success message
4. Run: `ls ~/.claude/skills/`
5. Verify directory exists
6. Run: `cat ~/.claude/skills/cli-demo-generator/package.json`
7. Verify valid JSON with name field

**Expected Result**:
✅ Terminal shows: "Successfully installed cli-demo-generator"
✅ Directory created: `~/.claude/skills/cli-demo-generator/`
✅ package.json exists with valid content
✅ No errors in terminal output

**Pass/Fail Criteria**:
- ✅ PASS: All 4 verification criteria met, exit code 0
- ❌ FAIL: Any error message, missing directory, or malformed package.json

**Potential Bugs to Watch For**:
- Path traversal vulnerability (test with `../../../etc/passwd`)
- Network timeout with no retry logic
- Incorrect permissions on `~/.claude` directory
- Race condition if multiple installs concurrent
```

---

## 示例：安全测试

```markdown
### TC-SEC-001: SQL Injection Protection - Login Form

**Priority**: P0
**Type**: Security
**Estimated Time**: 3 minutes

**Prerequisites**:
- Application running on http://localhost:8080
- Test user account exists: `test@example.com` / `password123`
- Database seeded with sample data

**Test Steps**:
1. Navigate to login page
2. Enter username: `admin' OR '1'='1`
3. Enter password: `anything`
4. Click "Login" button
5. Observe response

**Expected Result**:
✅ Login FAILS with error: "Invalid credentials"
✅ SQL injection attempt logged in security_events table
✅ No database data exposed in error message
✅ User NOT authenticated

**Pass/Fail Criteria**:
- ✅ PASS: Login fails, injection logged, no data leak
- ❌ FAIL: Login succeeds, no logging, or SQL error exposed

**Potential Bugs to Watch For**:
- Verbose error messages exposing schema
- Second-order SQL injection in profile fields
- NoSQL injection if using MongoDB
- Timing-based blind SQL injection
```

---

## 编写指南

### 编写清晰的前置条件
❌ **不好**："系统运行中"
✅ **好**："Docker 容器健康运行（`docker ps` 显示 5 个运行中），8080 端口可访问"

### 编写具体的测试步骤
❌ **不好**："测试登录"
✅ **好**："在邮箱字段输入 'test@example.com'，在密码字段输入 'Password123!'，点击'登录'按钮"

### 编写可度量的预期结果
❌ **不好**："功能正常"
✅ **好**："HTTP 200 响应，重定向到 /dashboard，设置 30 分钟过期的 session cookie"

### 时间预估
- 简单校验：1-2 分钟
- API 调用测试：2-3 分钟
- 端到端流程：5-10 分钟
- 安全审计：每条 3-5 分钟

---

## 分类代码

- **CLI**：命令行界面测试
- **WEB**：Web 界面测试
- **API**：后端 API 测试
- **DB**：数据库测试
- **SEC**：安全测试
- **PERF**：性能测试
- **INT**：集成测试
- **E2E**：端到端测试

---

## 优先级分配规则

标记为 P0 的情况：
- 阻塞核心功能
- 安全漏洞（OWASP Top 10）
- 数据丢失或损坏
- 系统崩溃

标记为 P1 的情况：
- 主要功能异常（有临时方案）
- 用户体验严重下降
- 性能下降超过 50%

标记为 P2 的情况：
- 次要功能问题
- 边界场景失败
- 非关键缺陷

P3/P4 用于界面外观或文档类问题。

---

**使用方式**：编写新测试用例时复制此模板，将所有方括号占位符替换为实际值。
