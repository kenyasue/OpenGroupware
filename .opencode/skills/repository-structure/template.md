# Repository Structure Document

## Project Structure

```
project-root/
├── src/                   # Source code
│   ├── [layer1]/          # [Description]
│   ├── [layer2]/          # [Description]
│   └── [layer3]/          # [Description]
├── tests/                 # Test code
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── e2e/               # E2E tests
├── docs/                  # Project documentation
├── config/                # Configuration files
└── scripts/               # Build/deploy scripts
```

## Directory Details

### src/ (Source Code Directory)

#### [Directory 1]

**Role**: [Description]

**Files placed here**:
- [File pattern 1]: [Description]
- [File pattern 2]: [Description]

**Naming conventions**:
- [Rule 1]
- [Rule 2]

**Dependencies**:
- May depend on: [Directory name]
- Must not depend on: [Directory name]

**Example**:
```
[Directory name]/
├── [example-file1].ts
└── [example-file2].ts
```

#### [Directory 2]

**Role**: [Description]

**Files placed here**:
- [File pattern 1]: [Description]

**Naming conventions**:
- [Rule 1]

**Dependencies**:
- May depend on: [Directory name]
- Must not depend on: [Directory name]

### tests/ (Test Directory)

#### unit/

**Role**: Placement of unit tests

**Structure**:
```
tests/unit/
└── src/                    # Same structure as the src directory
    └── [layer]/
        └── [filename].test.ts
```

**Naming conventions**:
- Pattern: `[name of file under test].test.ts`
- Example: `TaskService.ts` → `TaskService.test.ts`

#### integration/

**Role**: Placement of integration tests

**Structure**:
```
tests/integration/
└── [feature]/              # Split into directories by feature
    └── [scenario].test.ts
```

#### e2e/

**Role**: Placement of E2E tests

**Structure**:
```
tests/e2e/
└── [user-scenario]/        # By user scenario
    └── [flow].test.ts
```

### docs/ (Documentation Directory)

**Documents placed here**:
- `product-requirements.md`: Product Requirements Document
- `functional-design.md`: Functional design document
- `architecture.md`: Architecture design document
- `repository-structure.md`: Repository structure document (this document)
- `development-guidelines.md`: Development guidelines
- `glossary.md`: Glossary

### config/ (Configuration File Directory - when applicable)

**Files placed here**:
- Configuration files
- Constant definition files

**Example**:
```
config/
├── default.ts
└── constants.ts
```

### scripts/ (Script Directory - when applicable)

**Files placed here**:
- Build scripts
- Development helper scripts

## File Placement Rules

### Source Files

| File type | Location | Naming convention | Example |
|------------|--------|---------|-----|
| [Type 1] | [Directory] | [Rule] | [Example] |
| [Type 2] | [Directory] | [Rule] | [Example] |

### Test Files

| Test type | Location | Naming convention | Example |
|-----------|--------|---------|-----|
| Unit test | tests/unit/ | [target].test.ts | TaskService.test.ts |
| Integration test | tests/integration/ | [feature].test.ts | task-crud.test.ts |
| E2E test | tests/e2e/ | [scenario].test.ts | user-workflow.test.ts |

### Configuration Files

| File type | Location | Naming convention |
|------------|--------|---------|
| Environment config | config/environments/ | [environment-name].ts |
| Tool config | Project root | [tool-name].config.js |
| Type definitions | src/types/ | [target].d.ts |

## Naming Conventions

### Directory Names

- **Layer directories**: plural, kebab-case
  - Example: `services/`, `repositories/`, `controllers/`
- **Feature directories**: singular, kebab-case
  - Example: `task-management/`, `user-authentication/`

### File Names

- **Class files**: PascalCase
  - Example: `TaskService.ts`, `UserRepository.ts`
- **Function files**: camelCase
  - Example: `formatDate.ts`, `validateEmail.ts`
- **Constant files**: UPPER_SNAKE_CASE
  - Example: `API_ENDPOINTS.ts`, `ERROR_MESSAGES.ts`

### Test File Names

- Pattern: `[target].test.ts` or `[target].spec.ts`
- Example: `TaskService.test.ts`, `formatDate.spec.ts`

## Dependency Rules

### Dependencies Between Layers

```
UI layer
    ↓ (OK)
Service layer
    ↓ (OK)
Data layer
```

**Forbidden dependencies**:
- Data layer → Service layer (❌)
- Data layer → UI layer (❌)
- Service layer → UI layer (❌)

### Dependencies Between Modules

**No circular dependencies**:
```typescript
// ❌ Bad example: circular dependency
// fileA.ts
import { funcB } from './fileB';

// fileB.ts
import { funcA } from './fileA';  // Circular dependency
```

**Solution**:
```typescript
// ✅ Good example: extract a shared module
// shared.ts
export interface SharedType { /* ... */ }

// fileA.ts
import { SharedType } from './shared';

// fileB.ts
import { SharedType } from './shared';
```

## Scaling Strategy

### Adding Features

Placement policy when adding new features:

1. **Small features**: place in an existing directory
2. **Medium features**: create a subdirectory within a layer
3. **Large features**: separate into an independent module

**Example**:
```
src/
├── services/
│   ├── TaskService.ts           # Existing feature
│   └── task-management/         # Separation of a medium feature
│       ├── TaskService.ts
│       ├── SubtaskService.ts
│       └── TaskCategoryService.ts
```

### Managing File Size

**Guidelines for splitting files**:
- A single file: 300 lines or fewer recommended
- 300-500 lines: consider refactoring
- 500 lines or more: splitting strongly recommended

**How to split**:
```typescript
// Bad example: all functionality in one file
// TaskService.ts (800 lines)

// Good example: split by responsibility
// TaskService.ts (200 lines) - CRUD operations
// TaskValidationService.ts (150 lines) - validation
// TaskNotificationService.ts (100 lines) - notification handling
```

## Special Directories

### .steering/ (Steering Files)

**Role**: Define "what to do this time" for a specific development task

**Structure**:
```
.steering/
└── [YYYYMMDD]-[task-name]/
    ├── requirements.md      # Requirements for this task
    ├── design.md            # Design of the changes
    └── tasklist.md          # Task list
```

**Naming convention**: `20250115-add-user-profile` format

### .opencode/ (opencode Settings)

**Role**: opencode settings and customization

**Structure**:
```
.opencode/
├── command/                 # Slash commands
├── skills/                  # Task-specific skills
└── agent/                   # Subagent definitions
```

## Exclusion Settings

### .gitignore

Files that should be excluded in the project:
- `node_modules/`
- `dist/`
- `.env`
- `.steering/` (temporary files for task management)
- `*.log`
- `.DS_Store`

### .prettierignore, .eslintignore

Files that should be excluded by tooling:
- `dist/`
- `node_modules/`
- `.steering/`
- `coverage/`
