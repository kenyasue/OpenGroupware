# Design Document

## Architecture Overview

Layered architecture (UI → Service → Repository → Data) per `docs/architecture.md`. Next.js 15 App Router with Node.js Runtime only (no Edge Runtime). SQLite via better-sqlite3 accessed exclusively through a custom SQL wrapper. No Prisma.

```
app/ (UI: Route Handlers / Server Components / SSE)
  ↓
services/ (business logic, permission checks, transactions)
  ↓
repositories/ (SQL, parameter binding, logical-delete filter)
  ↓
lib/db/ (SQLite connection, SQL wrapper, Migration)
```

## Component Design

### 1. SQL Wrapper: `lib/db/sqlite.ts`

**Responsibilities**:
- SQLite connection management (singleton getDb(), WAL, foreign_keys ON)
- query<T> (multi-row), get<T> (single-row), execute (insert/update/delete), transaction<T>, close
- Error handling

**Implementation highlights**:
- dbPath = process.env.SQLITE_PATH ?? "./data/app.db"
- SqlParams = Record<string, unknown> | unknown[]
- All repositories use this wrapper; direct better-sqlite3 access forbidden

### 2. Migrator: `lib/db/migrator.ts`

**Responsibilities**:
- Create schema_migrations table
- Read .sql files from migrations dir in filename order
- Skip already-applied files (tracked in schema_migrations)
- Execute each file in a transaction; rollback on failure

### 3. Initial Schema: `lib/db/migrations/001_initial.sql`

16 tables: users, projects, project_members, board_threads, board_comments, chat_messages, todo_columns, todo_items, file_assets, project_notes, milestones, calendar_events, meetings, meeting_members, notifications, activity_logs + indexes.

### 4. Entity Types: `lib/types/`

PascalCase type files for each entity + union types (UserRole, UserStatus, ProjectStatus, ProjectMemberRole, etc.).

### 5. UserRepository

findById, findByEmail, create (with passwordHash), update (name/avatarUrl/role/status).

### 6. AuthService

register (hash password, create user), login (verify hash, issue session), logout, getCurrentUser, updateProfile. Uses bcrypt.

### 7. Session: `lib/auth/session.ts`, `lib/auth/getCurrentUser.ts`

Cookie-based session. getCurrentUser resolves the user from the request cookie.

### 8. ProjectRepository / ProjectMemberRepository

Project: findById, findByOwner, findByUser (via join), create, update, delete.
ProjectMember: findByProject, findByUser, add, remove, isMember, getRole.

### 9. ProjectService

createProject (owner becomes admin member), updateProject, addMember (permission check + notification hook later), removeMember, archiveProject, getDashboard skeleton.

## Data Flow

### Login
1. POST /api/auth/login → AuthService.login(email, password)
2. AuthService → UserRepository.findByEmail → verify bcrypt hash
3. Issue session cookie → return user

### Project creation
1. POST /api/projects → ProjectService.createProject(actorId, input)
2. ProjectService → permission (any authenticated user) → ProjectRepository.create
3. ProjectMemberRepository.add(projectId, ownerId, 'admin')
4. Return project

## Error Handling Strategy

### Custom Error Classes
- ValidationError (400) - field, value
- ForbiddenError (403)
- NotFoundError (404) - resource, id
- (409 for unique constraint - handled via SQLite error code)

### Error Handling Patterns
Route Handlers catch errors and map to HTTP status. Expected errors use custom classes; unexpected errors propagate + log.

## Test Strategy

### Unit Tests (Vitest)
- lib/db/sqlite.test.ts (query/get/execute/transaction, WAL, foreign keys)
- lib/db/migrator.test.ts (order, skip applied, rollback)
- repositories/UserRepository.test.ts
- services/AuthService.test.ts
- repositories/ProjectRepository.test.ts
- repositories/ProjectMemberRepository.test.ts
- services/ProjectService.test.ts

Tests use a temp SQLite file (in-memory or tmpdir) to avoid touching real data/.

### Integration Tests (Vitest)
- project-member-permission.test.ts (non-member cannot access project data)

### E2E Tests (Playwright)
- auth.spec.ts (login, logout, protected screen)
- project-management.spec.ts (create, edit, member add/remove, archive)

## Dependent Libraries

```json
{
  "dependencies": {
    "next": "15",
    "react": "19",
    "react-dom": "19",
    "better-sqlite3": "^11",
    "bcrypt": "^5",
    "react-markdown": "^9",
    "remark-gfm": "^4",
    "rehype-sanitize": "^6"
  },
  "devDependencies": {
    "tailwindcss": "^3",
    "@types/better-sqlite3": "^7",
    "@types/bcrypt": "^5",
    "@playwright/test": "^1",
    "tsx": "^4"
  }
}
```

## Directory Structure

```
app/
  api/auth/{register,login,logout,me}/route.ts
  api/users/me/route.ts
  api/projects/route.ts
  api/projects/[projectId]/route.ts
  api/projects/[projectId]/members/route.ts
  api/projects/[projectId]/members/[userId]/route.ts
  api/admin/migrations/route.ts
  login/page.tsx
  profile/page.tsx
  dashboard/page.tsx
  projects/[projectId]/{page,members,settings}.tsx
  layout.tsx, globals.css
lib/
  db/{sqlite.ts, migrator.ts, run-migrations.ts, migrations/001_initial.sql}
  auth/{session.ts, getCurrentUser.ts}
  types/*.ts
  validators/{userValidator.ts, projectValidator.ts}
repositories/{UserRepository,ProjectRepository,ProjectMemberRepository}.ts
services/{AuthService,ProjectService}.ts
components/layout/{Header,Sidebar,ProjectNav}.tsx
tests/unit/..., tests/integration/..., tests/e2e/...
```

## Implementation Order

1. M1 (branch feature/m1-setup): Next.js setup, deps, config, dir structure, remove boilerplate → merge to main
2. M2 (branch feature/m2-db-foundation): SQL wrapper, migrator, schema, types, migration API, unit tests → merge to main
3. M3 (branch feature/m3-auth-user): UserRepository, AuthService, session, validators, auth API, login/profile pages, unit + e2e → merge to main
4. M4 (branch feature/m4-project-member): Project/Member repos, ProjectService, project API, dashboard/members/settings pages, unit + integration + e2e → merge to main

## Security Considerations

- Passwords hashed with bcrypt (never plaintext)
- All SQL parameter-bound (no string concatenation)
- Auth required on all protected routes (except /api/auth/register, /api/auth/login)
- Project access requires isMember check
- Admin features require role='system_admin'
- .env not committed; secrets via environment

## Performance Considerations

- SQLite WAL mode for read/write concurrency
- Pagination on list endpoints
- Singleton DB connection

## Future Extensibility

- Repository pattern allows adding tables without changing wrapper
- SseEvent type extensible (M8)
- NotificationService/ActivityLogService hooks prepared for M5 (ProjectService.addMember will call notification in M5)
