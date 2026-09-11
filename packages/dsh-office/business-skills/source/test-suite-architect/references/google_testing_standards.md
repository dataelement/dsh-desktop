# Google Testing Standards Reference

Comprehensive guide to Google's testing best practices and standards.

---

## AAA Pattern (Arrange-Act-Assert)

Every test should follow this structure:

### 1. Arrange (Setup)
```markdown
**Prerequisites**:
- System in known state
- Test data prepared
- Dependencies mocked/configured
```

### 2. Act (Execute)
```markdown
**Test Steps**:
1. Perform action
2. Trigger behavior
3. Execute operation
```

### 3. Assert (Verify)
```markdown
**Expected Result**:
✅ Verification criteria
✅ Observable outcomes
✅ System state validation
```

---

## Test Case Design Principles

### 1. Test Case ID Convention
```
TC-[CATEGORY]-[NUMBER]

Examples:
- TC-CLI-001 (CLI tests)
- TC-WEB-042 (Web tests)
- TC-API-103 (API tests)
- TC-SEC-007 (Security tests)
```

### 2. Priority Classification

**P0 (Blocker)** - Must fix before release
- Prevents core functionality
- Security vulnerabilities (SQL injection, XSS)
- Data corruption/loss
- System crashes

**P1 (Critical)** - Fix within 2 weeks
- Major feature broken with workaround
- Significant UX degradation
- Performance issues

**P2 (High)** - Fix within 4 weeks
- Minor feature issues
- Edge cases
- Non-critical bugs

**P3 (Medium)** - Fix when possible
- Cosmetic issues
- Rare edge cases
- Nice-to-have improvements

**P4 (Low)** - Optional
- Documentation typos
- Minor UI alignment

### 3. Test Types

**Unit Tests**:
- Test individual functions/methods
- No external dependencies
- Fast execution (<100ms)
- Coverage: ≥80% statements, 75% branches

**Integration Tests**:
- Test component interactions
- Real dependencies (database, APIs)
- Moderate execution time
- Coverage: Critical user journeys

**E2E Tests**:
- Test complete user workflows
- Real browser/environment
- Slow execution
- Coverage: Happy paths + critical failures

**Security Tests**:
- OWASP Top 10 coverage
- Input validation
- Authentication/authorization
- Data protection

---

## Coverage Thresholds

### Code Coverage Targets
- ✅ **Statements**: ≥80%
- ✅ **Branches**: ≥75%
- ✅ **Functions**: ≥85%
- ✅ **Lines**: ≥80%

### Test Distribution (Recommended)
- Unit Tests: 70%
- Integration Tests: 20%
- E2E Tests: 10%

---

## Test Isolation

### Mandatory Principles

1. **No Shared State**
   ```typescript
   ❌ BAD: Tests share global variables
   ✅ GOOD: Each test has independent data
   ```

2. **Fresh Data Per Test**
   ```typescript
   beforeEach(() => {
     database.seed(freshData);
   });
   ```

3. **Cleanup After Tests**
   ```typescript
   afterEach(() => {
     database.cleanup();
     mockServer.reset();
   });
   ```

---

## Fail-Fast Validation

### Critical Security Pattern

```typescript
// ❌ BAD: Fallback to mock data
if (error) {
  return getMockData(); // WRONG - hides issues
}

// ✅ GOOD: Fail immediately
if (error || !data) {
  throw new Error(error?.message || 'Operation failed');
}
```

### Input Validation
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

## Test Documentation Standards

### Test Case Template
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

## Quality Gates

### Release Criteria

| Gate | Threshold | Blocker |
|------|-----------|---------|
| Test Execution | 100% | Yes |
| Pass Rate | ≥80% | Yes |
| P0 Bugs | 0 | Yes |
| P1 Bugs | ≤5 | Yes |
| Code Coverage | ≥80% | Yes |
| Security | 90% OWASP | Yes |

### Daily Checkpoints

**Morning Standup**:
- Yesterday's progress
- Today's plan
- Blockers

**End-of-Day**:
- Tests executed
- Pass rate
- Bugs filed
- Tomorrow's plan

### Weekly Review

**Friday Report**:
- Week summary
- Baseline comparison
- Quality gates status
- Next week plan

---

## Best Practices Summary

### DO:
- ✅ Write reproducible test cases
- ✅ Update tracking after EACH test
- ✅ File bugs immediately on failure
- ✅ Follow AAA pattern
- ✅ Maintain test isolation
- ✅ Document environment details

### DON'T:
- ❌ Skip test documentation
- ❌ Batch CSV updates
- ❌ Ignore security tests
- ❌ Use production data in tests
- ❌ Skip cleanup
- ❌ Hard-code test data

---

**References**:
- [Google Testing Blog](https://testing.googleblog.com/)
- [Google SWE Book - Testing](https://abseil.io/resources/swe-book)
- [Test Pyramid Concept](https://martinfowler.com/bliki/TestPyramid.html)
