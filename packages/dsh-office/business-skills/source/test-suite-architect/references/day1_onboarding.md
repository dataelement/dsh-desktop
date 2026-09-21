# Day 1 Onboarding Checklist

**Purpose**: Complete 5-hour onboarding guide for new QA engineers joining a software testing project.

**Time**: 5 hours (with breaks)

---

## Hour 1: Environment Setup (60 min)

### 1.1 Clone Repository & Install Dependencies
```bash
git clone <repository-url>
cd <project-dir>
pnpm install  # or npm install
```

### 1.2 Start Local Database (if using Supabase/PostgreSQL)
```bash
npx supabase start  # Wait 2-3 minutes for all containers
docker ps | grep supabase  # Verify 8-11 containers running
```

### 1.3 Configure Environment Variables
```bash
cp .env.example .env
# Edit .env with local development URLs
```

### 1.4 Apply Database Migrations
```bash
# Apply all migrations in order
for file in database/migrations/*.sql; do
  docker exec -i <db-container-name> psql -U postgres -d postgres < "$file"
done
```

### 1.5 Verify Database Seeded
```bash
docker exec <db-container-name> psql -U postgres -d postgres -c "SELECT COUNT(*) FROM <main-table>;"
# Should return expected row count
```

### 1.6 Start Development Server
```bash
pnpm dev
# Verify: http://localhost:8080 (or configured port)
```

**Checkpoint**: ✅ Environment running, database seeded, website loads correctly.

---

## Hour 2: Documentation Review (60 min)

### 2.1 Read Quick Start Guide (30 min)
- Understand project scope (total test cases, timeline)
- Identify test categories (CLI, Web, API, Security)
- Memorize quality gates (pass rate target, P0 bug policy)
- Review execution schedule (Week 1-5 plan)

### 2.2 Review Test Strategy (30 min)
- Understand AAA pattern (Arrange-Act-Assert)
- Learn bug classification (P0-P4 severity levels)
- Study test case format (TC-XXX-YYY numbering)
- Review OWASP security coverage target

**Checkpoint**: ✅ Strategy understood, test case format memorized.

---

## Hour 3: Test Data Setup (60 min)

### 3.1 Create Test Users (20 min)
**Via UI** (if auth page available):
1. Navigate to `/auth` or `/signup`
2. Create 5 regular test users
3. Create 1 admin user
4. Create 1 moderator user

**Via SQL** (assign roles):
```sql
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'admin@test.com';
```

### 3.2 Install CLI for Testing (20 min)
```bash
# Global installation (for testing `ccpm` command directly)
cd packages/cli
pnpm link --global

# Verify
ccpm --version
ccpm --help
```

### 3.3 Configure Browser DevTools (20 min)
- Install React Developer Tools extension
- Set up network throttling presets (Slow 3G, Fast 3G, Fast 4G)
- Configure responsive design mode (Mobile, Tablet, Desktop viewports)
- Test viewport switching

**Checkpoint**: ✅ Test users created, CLI installed, DevTools configured.

---

## Hour 4: Execute First Test Case (60 min)

### 4.1 Open Test Execution Tracking Spreadsheet (5 min)
- File: `tests/docs/templates/TEST-EXECUTION-TRACKING.csv`
- Open in Google Sheets, Excel, or LibreOffice Calc
- Find first test case: `TC-CLI-001` or equivalent

### 4.2 Read Full Test Case Documentation (10 min)
- Locate test case in documentation (e.g., `02-CLI-TEST-CASES.md`)
- Read: Prerequisites, Test Steps, Expected Result, Pass/Fail Criteria

### 4.3 Execute TC-001 (20 min)
**Example (CLI install command)**:
```bash
# Step 1: Clear previous installations
rm -rf ~/.claude/skills/<skill-name>

# Step 2: Run install command
ccpm install <skill-name>

# Step 3: Verify installation
ls ~/.claude/skills/<skill-name>
cat ~/.claude/skills/<skill-name>/package.json
```

### 4.4 Document Test Results (15 min)
Update `TEST-EXECUTION-TRACKING.csv`:
| Field | Value |
|-------|-------|
| **Status** | Completed |
| **Result** | ✅ PASS or ❌ FAIL |
| **Bug ID** | (leave blank if passed) |
| **Execution Date** | 2025-11-XX |
| **Executed By** | [Your Name] |
| **Notes** | Brief description (e.g., "Skill installed in 3.2s, all files present") |

**If test failed**:
1. Open `BUG-TRACKING-TEMPLATE.csv`
2. Create new bug entry (Bug ID: BUG-001, BUG-002, etc.)
3. Fill in: Title, Severity (P0-P4), Steps to Reproduce, Environment
4. Link bug to test case in tracking CSV

### 4.5 Celebrate! (10 min)
✅ First test executed successfully!

**Checkpoint**: ✅ First test case executed and documented.

---

## Hour 5: Team Onboarding & Planning (60 min)

### 5.1 Meet the Team (20 min)
**Scheduled meeting with**:
- QA Lead (your manager)
- QA Engineers (peers)
- Engineering Lead (answers technical questions)
- DevOps Lead (handles infrastructure)

**Agenda**:
1. Introductions
2. Project overview and goals
3. Your role and responsibilities
4. Q&A and troubleshooting

### 5.2 Review Week 1 Plan (20 min)
**With QA Lead**: Review weekly execution schedule.

**Example Week 1: CLI Testing (93 test cases)**
| Day | Test Cases | Hours | Deliverables |
|-----|------------|-------|--------------|
| Monday | TC-CLI-001 to TC-CLI-015 | 5h | 15 test cases executed |
| Tuesday | TC-CLI-016 to TC-CLI-030 | 5.5h | 15 test cases executed |
| Wednesday | TC-CLI-031 to TC-CLI-045 | 5.5h | 15 test cases executed |
| Thursday | TC-CLI-046 to TC-CLI-060 | 5.5h | 15 test cases executed |
| Friday | TC-CLI-061 to TC-CLI-093 | 6.5h | 33 test cases + weekly report |

**Discuss**:
- Any blockers from today's setup?
- Confident with tools and documentation?
- Adjustments needed?

### 5.3 Bookmark Critical Resources (10 min)
**Create browser bookmarks folder**: "Project QA Resources"

**Essential links**:
- Local website (http://localhost:8080 or configured port)
- Database admin UI (Supabase Studio, phpMyAdmin, etc.)
- GitHub repository
- Test case documents
- Tracking spreadsheets

### 5.4 Final Q&A (10 min)
**Common questions**:

**Q: What if I find a critical bug (P0) on Day 1?**
A: Immediately notify QA Lead. Document in bug tracker. P0 bugs block release and must be fixed within 24 hours.

**Q: What if I can't complete all test cases in a day?**
A: Prioritize P0 tests first. Update QA Lead by end of day. Schedule can be adjusted.

**Q: Can I run tests in a different order?**
A: Yes, but follow priority order (P0 → P1 → P2 → P3). Update tracking spreadsheet.

**Q: What if a test case is unclear?**
A: Ask in team Slack/chat. Document question in tracking spreadsheet for future improvement.

**Checkpoint**: ✅ Team met, Week 1 plan reviewed, all questions answered.

---

## Day 1 Completion Checklist

Before leaving for the day, verify all setup complete:

### Environment
- [ ] Repository cloned and dependencies installed
- [ ] Database running (Docker containers or hosted instance)
- [ ] `.env` file configured with correct URLs/keys
- [ ] Database migrations applied and data seeded
- [ ] Development server running and website loads

### Tools
- [ ] CLI installed (if applicable) - global and/or local
- [ ] Browser DevTools configured with extensions
- [ ] Network throttling presets added
- [ ] Responsive design mode tested

### Test Data
- [ ] Regular test users created (5+ users)
- [ ] Admin user created with role assigned
- [ ] Moderator user created with role assigned (if applicable)

### Documentation
- [ ] Quick Start Guide read (understand scope, timeline)
- [ ] Test Strategy reviewed (understand AAA pattern, quality gates)
- [ ] First test case executed successfully
- [ ] Test results documented in tracking spreadsheet

### Team
- [ ] Team introductions completed
- [ ] Week 1 plan reviewed with QA Lead
- [ ] Critical resources bookmarked
- [ ] Communication channels joined (Slack, Teams, etc.)

---

## Next Steps: Week 1 Testing Begins

**Monday Morning Kickoff**:
1. Join team standup (15 min)
2. Review any blockers from Day 1 setup
3. Begin Week 1 test execution (follow documented schedule)

**Daily Routine**:
- **Morning**: Team standup (15 min)
- **Morning session**: Test execution (9:15 AM - 12:00 PM)
- **Lunch**: Break (12:00 PM - 1:00 PM)
- **Afternoon session**: Test execution (1:00 PM - 5:00 PM)
- **End of day**: Update tracking, file bugs, status report (5:00 PM - 5:30 PM)

**Weekly Deliverable**: Friday EOD - Submit weekly progress report to QA Lead.

---

## Troubleshooting Common Day 1 Issues

### Issue 1: Database Containers Won't Start
**Symptoms**: Database service fails or containers show "unhealthy"

**Fixes**:
1. Restart database service (Docker Desktop, systemd, etc.)
2. Check logs: `docker logs <container-name>`
3. Verify ports not in use: `lsof -i :<port-number>`
4. Prune old containers (⚠️ caution): `docker system prune`

### Issue 2: Website Shows "Failed to Fetch Data"
**Symptoms**: Homepage loads but data sections are empty

**Fixes**:
1. Verify database has seeded data: `SELECT COUNT(*) FROM <table>;`
2. Check API connection (network tab in DevTools)
3. Verify `.env` file has correct database URL
4. Restart dev server

### Issue 3: CLI Command Not Found After Installation
**Symptoms**: `<command>: command not found` after installation

**Fixes**:
1. Check installation path: `which <command>` or `pnpm bin -g`
2. Add to PATH: `export PATH="$(pnpm bin -g):$PATH"`
3. Make permanent: Add to `~/.bashrc` or `~/.zshrc`
4. Reload shell: `source ~/.bashrc`

### Issue 4: Test Users Not Showing Roles
**Symptoms**: Admin user can't access admin-only features

**Fixes**:
1. Verify role insert: `SELECT * FROM user_roles WHERE user_id = '<user-id>';`
2. Sign out and sign in again (roles cached in session)
3. Clear browser cookies and local storage (F12 → Application tab)

---

## Congratulations! 🎉

You've completed Day 1 onboarding. You're now ready to execute the full test plan.

**Questions or Blockers?**
- Slack/Teams: #qa-team channel
- Email: qa-lead@company.com
- Escalation: Engineering Lead (for critical bugs)

**See you Monday for Week 1 testing!** 🚀
