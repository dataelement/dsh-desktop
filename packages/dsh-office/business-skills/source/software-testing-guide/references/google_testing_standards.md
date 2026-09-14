# Google 测试标准参考

Google 测试最佳实践和标准的综合指南。

---

## AAA 模式（准备-执行-断言）

每个测试都应遵循此结构：

### 1. 准备（Arrange / Setup）
```markdown
**前置条件**:
- 系统处于已知状态
- 测试数据已准备
- 依赖已 Mock/配置
```

### 2. 执行（Act / Execute）
```markdown
**测试步骤**:
1. 执行操作
2. 触发行为
3. 完成操作
```

### 3. 断言（Assert / Verify）
```markdown
**预期结果**:
✅ 验证标准
✅ 可观测的结果
✅ 系统状态校验
```

---

## 测试用例设计原则

### 1. 测试用例 ID 命名规范
```
TC-[分类]-[编号]

示例:
- TC-CLI-001（CLI 测试）
- TC-WEB-042（Web 测试）
- TC-API-103（API 测试）
- TC-SEC-007（安全测试）
```

### 2. 优先级分类

**P0（阻塞）** - 发版前必须修复
- 核心功能不可用
- 安全漏洞（SQL 注入、XSS）
- 数据损坏/丢失
- 系统崩溃

**P1（严重）** - 2 周内修复
- 主要功能异常但有临时方案
- 用户体验严重下降
- 性能问题

**P2（高）** - 4 周内修复
- 次要功能问题
- 边界场景
- 非关键缺陷

**P3（中）** - 有空修复
- 外观问题
- 罕见边界场景
- 锦上添花的改进

**P4（低）** - 可选修复
- 文档错别字
- 细微的界面对齐问题

### 3. 测试类型

**单元测试**：
- 测试单个函数/方法
- 无外部依赖
- 快速执行（<100ms）
- 覆盖率：≥80% 语句、75% 分支

**集成测试**：
- 测试组件间交互
- 使用真实依赖（数据库、API）
- 中等执行时间
- 覆盖率：关键用户旅程

**端到端测试**：
- 测试完整的用户工作流
- 真实浏览器/环境
- 执行较慢
- 覆盖率：正常流程 + 关键失败场景

**安全测试**：
- OWASP Top 10 覆盖
- 输入校验
- 认证/授权
- 数据保护

---

## 覆盖率阈值

### 代码覆盖率目标
- ✅ **语句覆盖**：≥80%
- ✅ **分支覆盖**：≥75%
- ✅ **函数覆盖**：≥85%
- ✅ **行覆盖**：≥80%

### 测试分布（推荐比例）
- 单元测试：70%
- 集成测试：20%
- 端到端测试：10%

---

## 测试隔离

### 必须遵守的原则

1. **禁止共享状态**
   ```typescript
   ❌ 不好: Tests share global variables
   ✅ 好: Each test has independent data
   ```

2. **每个测试使用全新数据**
   ```typescript
   beforeEach(() => {
     database.seed(freshData);
   });
   ```

3. **测试后清理**
   ```typescript
   afterEach(() => {
     database.cleanup();
     mockServer.reset();
   });
   ```

---

## 快速失败校验

### 关键安全模式

```typescript
// ❌ 不好: Fallback to mock data
if (error) {
  return getMockData(); // WRONG - hides issues
}

// ✅ 好: Fail immediately
if (error || !data) {
  throw new Error(error?.message || 'Operation failed');
}
```

### 输入校验
```typescript
// Validate BEFORE any operations
function processSkillName(input: string): void {
  // Security checks first
  if (input.includes('..')) {
    throw new ValidationError('Path traversal detected');
  }

  if (input.startsWith('/')) {
    throw new ValidationError('Absolute paths not allowed');
  }

  // Then business logic
  return performOperation(input);
}
```

---

## 测试文档标准

### 测试用例模板
```markdown
### TC-XXX-YYY: Descriptive Title

**Priority**: P0/P1/P2/P3/P4
**Type**: Unit/Integration/E2E/Security
**Estimated Time**: X minutes

**Prerequisites**:
- Specific, verifiable conditions

**Test Steps**:
1. Exact command or action
2. Specific input data
3. Verification step

**Expected Result**:
✅ Measurable outcome
✅ Specific verification criteria

**Pass/Fail Criteria**:
- ✅ PASS: All verification steps succeed
- ❌ FAIL: Any error or deviation

**Potential Bugs**:
- Known edge cases
- Security concerns
```

---

## 质量门禁

### 发版标准

| 门禁 | 阈值 | 是否阻塞 |
|------|-----------|---------|
| 测试执行率 | 100% | 是 |
| 通过率 | ≥80% | 是 |
| P0 缺陷 | 0 | 是 |
| P1 缺陷 | ≤5 | 是 |
| 代码覆盖率 | ≥80% | 是 |
| 安全覆盖率 | 90% OWASP | 是 |

### 每日检查点

**早会**：
- 昨日进展
- 今日计划
- 阻塞项

**下班前**：
- 已执行测试数
- 通过率
- 已提缺陷数
- 次日计划

### 每周评审

**周五报告**：
- 本周总结
- 基线对比
- 质量门禁状态
- 下周计划

---

## 最佳实践摘要

### 应该做的：
- ✅ 编写可复现的测试用例
- ✅ 每执行一条就更新追踪表
- ✅ 失败时立即提交缺陷
- ✅ 遵循 AAA 模式
- ✅ 保持测试隔离
- ✅ 记录环境详情

### 不应该做的：
- ❌ 跳过测试文档编写
- ❌ 批量更新 CSV
- ❌ 忽略安全测试
- ❌ 在测试中使用生产数据
- ❌ 跳过清理步骤
- ❌ 硬编码测试数据

---

**参考资料**：
- [Google Testing Blog](https://testing.googleblog.com/)
- [Google SWE Book - Testing](https://abseil.io/resources/swe-book)
- [Test Pyramid Concept](https://martinfowler.com/bliki/TestPyramid.html)
