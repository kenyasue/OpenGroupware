# Requirements

## Overview

Implement milestones M1-M4 of the Simple Groupware project: project foundation setup (Next.js 15), DB foundation (SQL wrapper + Migration), authentication & user management, and project & member management. Each milestone is developed on a separate branch and merged to main. Unit tests and E2E tests are mandatory.

## Background

The repository is currently a spec-driven-development boilerplate (vitest/eslint/prettier/husky configured, but no Next.js, no react, no SQLite). It must be transformed into the foundation of the Simple Groupware: a Next.js 15 + TypeScript + SQLite(better-sqlite3) application following the layered architecture (UI → Service → Repository → Data) defined in `docs/architecture.md`. M1-M4 establish the base that all subsequent milestones (M5+) depend on.

## Features to Implement

### 1. M1: Project Foundation Setup
- Next.js 15 (App Router, TypeScript) project configuration
- Tailwind CSS setup
- tsconfig with `@/*` path alias, strict mode
- next.config, .env.example
- Directory structure: app/, lib/, repositories/, services/, components/, tests/, data/, backups/
- ESLint (with Next.js plugin), Prettier, Husky, lint-staged, Vitest, Playwright setup
- CI config (GitHub Actions)
- package.json scripts: lint, format, typecheck, test, test:e2e, migrate, dev, build
- Dependencies: next, react, react-dom, better-sqlite3, bcrypt, react-markdown, remark-gfm, rehype-sanitize, tailwindcss, @types/better-sqlite3
- Remove boilerplate src/example.ts and src/example.test.ts

### 2. M2: DB Foundation (SQL Wrapper + Migration)
- `lib/db/sqlite.ts`: SqliteDatabase class (query/get/execute/transaction/close) + getDb() singleton (WAL, foreign_keys ON)
- `lib/db/migrator.ts`: Migrator class (filename-order execution, skip applied, 1-file-1-transaction, rollback on failure)
- `lib/db/migrations/001_initial.sql`: all 16 tables + indexes
- `lib/types/`: all Entity type definitions + enums
- `lib/db/run-migrations.ts`: migration runner script
- API: `GET /api/admin/migrations` (admin-only migration status)
- Unit tests: sqlite.test.ts, migrator.test.ts

### 3. M3: Authentication & User Management
- UserRepository (findById/findByEmail/create/update)
- AuthService (register/login/logout/getCurrentUser/updateProfile) with bcrypt password hashing
- Role management (system_admin/project_admin/member/guest), account enable/disable
- lib/auth/ (session.ts, getCurrentUser.ts)
- lib/validators/userValidator.ts
- API: register, login, logout, me, users/me
- Login page, profile page, root layout
- Auth middleware (redirect unauthenticated to login)
- Unit tests: UserRepository, AuthService; E2E test: auth.spec.ts

### 4. M4: Project & Member Management
- ProjectRepository, ProjectMemberRepository
- ProjectService (createProject/updateProject/addMember/removeMember/archiveProject/getDashboard) with permission checks
- projectValidator.ts
- API: projects CRUD, members CRUD
- Dashboard (project list), project overview, members page, settings page
- Layout components (Header, Sidebar, ProjectNav)
- Unit tests: ProjectRepository, ProjectMemberRepository, ProjectService; Integration test: project-member-permission; E2E test: project-management.spec.ts

## Acceptance Criteria

### M1
- [ ] `npm run dev` starts the Next.js dev server
- [ ] `npm run lint`, `npm run typecheck`, `npm run build` succeed
- [ ] Directory structure matches repository-structure.md

### M2
- [ ] `npm run migrate` creates the initial schema
- [ ] Migrations run in filename order and skip applied ones
- [ ] Failed migration rolls back
- [ ] Unit tests pass

### M3
- [ ] User registration, login, logout work
- [ ] Password is hashed with bcrypt
- [ ] Profile & avatar editable
- [ ] Inactive accounts cannot log in
- [ ] Unauthenticated access to protected screens is blocked
- [ ] Unit & E2E tests pass

### M4
- [ ] Project create/edit/delete/archive work
- [ ] Member add/remove/role work
- [ ] Non-members get 403
- [ ] Unit, Integration & E2E tests pass

## Success Metrics

- All Unit tests pass (`npm test`)
- All E2E tests pass (`npm run test:e2e`)
- Lint and typecheck clean
- Each milestone merged to main on its own branch

## Out of Scope

The following will not be implemented in this phase:
- M5-M15 (notifications, board, chat, SSE, todo, files, calendar, milestones, meetings, search, dashboard completion, backup)
- E2E tests for features beyond M3/M4 scope (board, chat, etc.)
- Full project dashboard content (only skeleton in M4; full content in M13)

## Reference Documents

- `docs/product-requirements.md` - Product Requirements Document
- `docs/functional-design.md` - Functional design document
- `docs/architecture.md` - Architecture design document
- `docs/repository-structure.md` - Repository structure document
- `docs/development-guidelines.md` - Development guidelines
- `docs/milestones.md` - Milestone & task definitions
