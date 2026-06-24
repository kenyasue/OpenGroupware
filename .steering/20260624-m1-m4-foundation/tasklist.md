# Task List

## 🚨 Principle of Fully Completing Tasks

**Keep working until all tasks in this file are complete**

### Mandatory Rules
- **Make every task `[x]`**
- "Planned as a separate task due to time constraints" is forbidden
- "Postponed because the implementation is too complex" is forbidden
- Do not finish work while leaving incomplete tasks (`[ ]`)

### The Only Case Where Skipping a Task Is Permitted
Skipping is possible only when one of the following technical reasons applies:
- A change in the implementation approach made the feature itself unnecessary
- An architecture change replaced it with a different implementation method
- A change in dependencies made the task impossible to execute

When skipping, always state the reason clearly:
```markdown
- [x] ~~task name~~ (unnecessary due to a change in approach: specific technical reason)
```

### If a Task Is Too Large
- Split the task into smaller subtasks
- Add the split subtasks to this file
- Complete the subtasks one by one

---

## Phase 1: M1 - Project Foundation Setup (branch: feature/m1-setup)

- [x] Create branch `feature/m1-setup` from main
- [x] Update package.json: name, scripts (dev/build/lint/format/typecheck/test/test:e2e/migrate), dependencies (next, react, react-dom, better-sqlite3, bcrypt, react-markdown, remark-gfm, rehype-sanitize), devDependencies (tailwindcss, @types/better-sqlite3, @types/bcrypt, @playwright/test, tsx, eslint-config-next)
- [x] Run `npm install` and confirm dependencies install successfully
- [x] Configure Next.js: create next.config.mjs (Node.js runtime), update tsconfig.json for Next.js (@/* path alias, jsx preserve, next plugin types), create app/globals.css (Tailwind directives), create tailwind.config.ts, postcss.config.mjs
- [x] Create Next.js app structure: app/layout.tsx (root layout), app/page.tsx (home redirect), app/globals.css
- [x] Create directory structure: lib/, repositories/, services/, components/, tests/unit, tests/integration, tests/e2e, data/.gitkeep, backups/.gitkeep
- [x] Remove boilerplate: delete src/example.ts, src/example.test.ts
- [x] Update vitest.config.ts (include tests/**, exclude .next), create playwright.config.ts
- [x] Update eslint.config.js (add Next.js plugin/ignores for .next), update .prettierrc if needed
- [x] Create .env.example (SQLITE_PATH, SESSION_SECRET)
- [x] Create CI config .github/workflows/ci.yml (lint, typecheck, test, build)
- [x] Commit M1, merge feature/m1-setup to main, push

## Phase 2: M2 - DB Foundation (branch: feature/m2-db-foundation)

- [ ] Create branch `feature/m2-db-foundation` from main
- [ ] Implement `lib/db/sqlite.ts`: SqliteDatabase class (query/get/execute/transaction/close) + getDb() singleton (WAL, foreign_keys ON)
- [ ] Implement `lib/db/migrator.ts`: Migrator class (schema_migrations table, filename-order, skip applied, 1-file-1-tx, rollback)
- [ ] Create `lib/db/migrations/001_initial.sql`: all 16 tables + indexes
- [ ] Create `lib/types/`: all Entity types + enums (User, Project, ProjectMember, BoardThread, BoardComment, ChatMessage, TodoColumn, TodoItem, FileAsset, ProjectNote, Milestone, CalendarEvent, Meeting, MeetingMember, Notification, ActivityLog, SchemaMigration + union types)
- [ ] Create `lib/db/run-migrations.ts`: migration runner script
- [ ] Implement API `GET /api/admin/migrations` (migration status, admin-only)
- [ ] Create test helper `tests/helpers/db.ts` (temp SQLite DB factory)
- [ ] Write Unit test `tests/unit/lib/db/sqlite.test.ts`
- [ ] Write Unit test `tests/unit/lib/db/migrator.test.ts`
- [ ] Run `npm run migrate` to verify schema creation
- [ ] Commit M2, merge feature/m2-db-foundation to main, push

## Phase 3: M3 - Auth & User Management (branch: feature/m3-auth-user)

- [ ] Create branch `feature/m3-auth-user` from main
- [ ] Create custom error classes `lib/errors.ts` (ValidationError, ForbiddenError, NotFoundError)
- [ ] Implement `lib/auth/session.ts` (session cookie read/write) and `lib/auth/getCurrentUser.ts`
- [ ] Implement `lib/validators/userValidator.ts`
- [ ] Implement `repositories/UserRepository.ts`
- [ ] Implement `services/AuthService.ts` (register/login/logout/getCurrentUser/updateProfile, bcrypt)
- [ ] Implement API routes: register, login, logout, me, users/me
- [ ] Implement auth middleware/guard (protected routes redirect to login)
- [ ] Implement `app/login/page.tsx`, `app/profile/page.tsx`, update `app/layout.tsx`
- [ ] Write Unit test `tests/unit/repositories/UserRepository.test.ts`
- [ ] Write Unit test `tests/unit/services/AuthService.test.ts`
- [ ] Write E2E test `tests/e2e/auth.spec.ts`
- [ ] Commit M3, merge feature/m3-auth-user to main, push

## Phase 4: M4 - Project & Member Management (branch: feature/m4-project-member)

- [ ] Create branch `feature/m4-project-member` from main
- [ ] Implement `lib/validators/projectValidator.ts`
- [ ] Implement `repositories/ProjectRepository.ts`
- [ ] Implement `repositories/ProjectMemberRepository.ts`
- [ ] Implement `services/ProjectService.ts` (createProject/updateProject/addMember/removeMember/archiveProject/getDashboard skeleton, permission checks)
- [ ] Implement API routes: projects (list/create), projects/[projectId] (detail/edit/delete), members (list/add), members/[userId] (remove)
- [ ] Implement `app/dashboard/page.tsx` (project list skeleton)
- [ ] Implement `app/projects/[projectId]/page.tsx` (overview skeleton)
- [ ] Implement `app/projects/[projectId]/members/page.tsx`
- [ ] Implement `app/projects/[projectId]/settings/page.tsx`
- [ ] Implement layout components: components/layout/Header.tsx, Sidebar.tsx, ProjectNav.tsx
- [ ] Write Unit test `tests/unit/repositories/ProjectRepository.test.ts`
- [ ] Write Unit test `tests/unit/repositories/ProjectMemberRepository.test.ts`
- [ ] Write Unit test `tests/unit/services/ProjectService.test.ts`
- [ ] Write Integration test `tests/integration/project-member-permission.test.ts`
- [ ] Write E2E test `tests/e2e/project-management.spec.ts`
- [ ] Commit M4, merge feature/m4-project-member to main, push

## Phase 5: Quality Check and Fixes

- [ ] Confirm that all tests pass
  - [ ] `npm test`
- [ ] Confirm that there are no lint errors
  - [ ] `npm run lint`
- [ ] Confirm that there are no type errors
  - [ ] `npm run typecheck`
- [ ] Confirm that the build succeeds
  - [ ] `npm run build`

## Phase 6: Documentation Updates

- [ ] Update README.md (setup instructions, scripts)
- [ ] Post-implementation retrospective (record at the bottom of this file)

---

## Post-Implementation Retrospective

### Implementation Completion Date
{YYYY-MM-DD}

### Differences Between Plan and Actual

**Points that differed from the plan**:
- {Technical changes not anticipated at planning time}
- {Changes in the implementation approach and the reasons}

**Tasks that became newly necessary**:
- {Tasks added during implementation}
- {Why the addition was necessary}

**Tasks skipped for technical reasons** (only when applicable):
- {Task name}
  - Reason for skipping: {specific technical reason}
  - Alternative implementation: {what it was replaced with}

**⚠️ Note**: Do not list tasks skipped for reasons such as "time constraints" or "difficulty" here. Completing all tasks is the principle.

### Lessons Learned

**Technical insights**:
- {Technical knowledge gained through implementation}
- {New technologies or patterns used}

**Process improvements**:
- {What went well in task management}
- {How the steering files were leveraged}

### Improvement Suggestions for Next Time
- {Things to watch out for in the next feature addition}
- {More efficient implementation methods}
- {Improvements to task planning}
