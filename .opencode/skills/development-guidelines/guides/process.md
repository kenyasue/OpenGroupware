# Process Guide

## Basic Principles

### 1. Include Plenty of Concrete Examples

Present concrete code examples, not just abstract rules.

**Bad example**:
```
Make variable names easy to understand
```

**Good example**:
```typescript
// ✅ Good: The role is clear
const userAuthentication = new UserAuthenticationService();
const taskRepository = new TaskRepository();

// ❌ Bad: Ambiguous
const auth = new Service();
const repo = new Repository();
```

### 2. Explain the Reasoning

Make clear "why we do it this way."

**Example**:
```
## Don't Ignore Errors

Reason: Ignoring errors makes it difficult to identify the cause of a problem.
Handle expected errors appropriately, and propagate unexpected errors upward
so they can be recorded in the logs.
```

### 3. Set Measurable Criteria

Avoid vague expressions and provide concrete numbers.

**Bad example**:
```
Keep code coverage high
```

**Good example**:
```
Code coverage targets:
- Unit tests: 80% or higher
- Integration tests: 60% or higher
- E2E tests: 100% of the main flows
```

## Git Operation Rules

### Branching Strategy (Adopting Git Flow)

**What is Git Flow**:
A branching model proposed by Vincent Driessen that systematically manages feature development, releases, and hotfixes. With clearly divided roles, it enables parallel work and stable releases in team development.

**Branch structure**:
```
main (production environment)
└── develop (development/integration environment)
    ├── feature/* (new feature development)
    ├── fix/* (bug fixes)
    └── release/* (release preparation) *as needed
```

**Operation rules**:
- **main**: Holds only stable code already released to production. Versioned with tags
- **develop**: Integrates the latest development code for the next release. Automated tests run in CI
- **feature/\*, fix/\***: Branch from develop, and merge into develop via a PR after the work is complete
- **No direct commits**: Require PR review on all branches to ensure code quality
- **Merge policy**: Recommend squash merge for feature→develop, and a merge commit for develop→main

**Benefits of Git Flow**:
- Branch roles are clear, making parallel development by multiple people easier
- The production environment (main) is always kept clean
- During emergencies, hotfix branches enable rapid response (introduce as needed)

### Commit Message Conventions

**Conventional Commits is recommended**:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**List of types**:
```
feat: New feature (minor version up)
fix: Bug fix (patch version up)
docs: Documentation
style: Formatting (no effect on code behavior)
refactor: Refactoring
perf: Performance improvement
test: Adding or fixing tests
build: Build system
ci: CI/CD configuration
chore: Other (dependency updates, etc.)

BREAKING CHANGE: Breaking change (major version up)
```

**Example of a good commit message**:

```
feat(task): Add priority-setting feature

Users can now set a priority (high/medium/low) on tasks.

Implementation details:
- Added a priority field to the Task model
- Added a --priority option to the CLI
- Implemented sorting by priority

Breaking changes:
- The structure of the Task type has changed
- Existing task data requires migration

Closes #123
BREAKING CHANGE: Added a required priority field to the Task type
```

### Pull Request Template

**An effective PR template**:

```markdown
## Type of Change
- [ ] New feature (feat)
- [ ] Bug fix (fix)
- [ ] Refactoring (refactor)
- [ ] Documentation (docs)
- [ ] Other (chore)

## Changes
### What was changed
[Brief description]

### Why it was changed
[Background and reasoning]

### How it was changed
- [Change 1]
- [Change 2]

## Testing
### Tests performed
- [ ] Added unit tests
- [ ] Added integration tests
- [ ] Performed manual testing

### Test results
[Description of the test results]

## Related Issues
Closes #[number]
Refs #[number]

## Review Points
[Points you especially want reviewers to look at]
```

## Test Strategy

### Test Pyramid

```
       /\
      /E2E\       Few (slow, high cost)
     /------\
    / Integ. \    Medium
   /----------\
  /   Unit     \  Many (fast, low cost)
 /--------------\
```

**Target ratio**:
- Unit tests: 70%
- Integration tests: 20%
- E2E tests: 10%

### How to Write Tests

**Given-When-Then pattern**:

```typescript
describe('TaskService', () => {
  describe('task creation', () => {
    it('can create a task with valid data', async () => {
      // Given: setup
      const service = new TaskService(mockRepository);
      const validData = { title: 'Test' };

      // When: execute
      const result = await service.create(validData);

      // Then: verify
      expect(result.id).toBeDefined();
      expect(result.title).toBe('Test');
    });

    it('throws a ValidationError when the title is empty', async () => {
      // Given: setup
      const service = new TaskService(mockRepository);
      const invalidData = { title: '' };

      // When/Then: execute and verify
      await expect(
        service.create(invalidData)
      ).rejects.toThrow(ValidationError);
    });
  });
});
```

### Coverage Targets

**Measurable targets**:

```json
// jest.config.js
{
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    },
    "./src/services/": {
      "branches": 90,
      "functions": 90,
      "lines": 90,
      "statements": 90
    }
  }
}
```

**Reasoning**:
- Critical business logic (services/) requires high coverage
- The UI layer is acceptable at a lower level
- Don't aim for 100% (balance cost and benefit)

## Code Review Process

### Purpose of Review

1. **Quality assurance**: Early detection of bugs
2. **Knowledge sharing**: Understanding the codebase across the whole team
3. **Learning opportunity**: Sharing best practices

### Points for Effective Reviews

**For reviewers**:

1. **Constructive feedback**
```markdown
## ❌ Bad example
This code is no good.

## ✅ Good example
This implementation results in O(n²) time complexity.
Using a Map can improve it to O(n):

```typescript
const taskMap = new Map(tasks.map(t => [t.id, t]));
const result = ids.map(id => taskMap.get(id));
```
```

2. **State the priority explicitly**
```markdown
[Required] Security: A password is being output to the logs
[Recommended] Performance: Avoid DB calls inside a loop
[Suggestion] Readability: Could this function name be made clearer?
[Question] Could you explain the intent of this processing?
```

3. **Positive feedback too**
```markdown
✨ This implementation is easy to understand!
👍 Edge cases are thoroughly considered
💡 This pattern looks reusable elsewhere
```

**For reviewees**:

1. **Perform a self-review**
   - Review your own code before creating the PR
   - Add comments where explanation is needed

2. **Aim for small PRs**
   - 1 PR = 1 feature
   - Number of changed files: 10 or fewer recommended
   - Number of changed lines: 300 or fewer recommended

3. **Explain carefully**
   - Why you chose this implementation
   - Alternatives you considered
   - Points you especially want reviewed

### Review Time Guidelines

- Small PR (100 lines or fewer): 15 minutes
- Medium PR (100-300 lines): 30 minutes
- Large PR (300 lines or more): 1 hour or more

**Principle**: Avoid large PRs; split them up

## Promoting Automation (Where Applicable)

### Automating Quality Checks

**Automation items and the tools adopted**:

1. **Lint checks**
   - **ESLint 9.x** + **@typescript-eslint**
     - Unifies coding conventions with a TypeScript-specific rule set
     - Automatically detects potential bugs and deprecated patterns
     - Configuration file: `eslint.config.js` (Flat Config format)

2. **Code formatting**
   - **Prettier 3.x**
     - Automatically formats code style, reducing debate during review
     - Used together with ESLint, avoiding conflicts via `eslint-config-prettier`
     - Configuration file: `.prettierrc`

3. **Type checking**
   - **TypeScript Compiler (tsc) 5.x**
     - Checks only type errors with `tsc --noEmit`
     - Verifies type safety independently of the build
     - Configuration file: `tsconfig.json`

4. **Running tests**
   - **Vitest 2.x**
     - Fast startup and execution based on Vite
     - Natively supports TypeScript/ESM and works with zero configuration
     - Coverage measurement (@vitest/coverage-v8) is built in as standard
     - Modern development experience with HMR support

5. **Build verification**
   - **TypeScript Compiler (tsc)**
     - Guarantees a type-checked build with the standard compiler
     - Simple configuration with no additional tools required
     - Centralizes output settings in `tsconfig.json`

**Implementation methods**:

**1. CI/CD (GitHub Actions)**
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - run: npm run build
```

**2. Pre-commit hooks (Husky 9.x + lint-staged)**
```json
// package.json
{
  "scripts": {
    "prepare": "husky",
    "lint": "eslint .",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "build": "tsc"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```
```bash
# .husky/pre-commit
npm run lint-staged
npm run typecheck
```

**Effects of adoption**:
- Automated checks run before committing, preventing defective code from being introduced
- CI runs automatically when a PR is created, ensuring quality before merging
- Early detection reduces fix costs by up to 80% (compared to when bugs are found after production)

**Why this configuration was chosen**:
- A standard and modern configuration in the TypeScript ecosystem as of 2025
- High compatibility between tools, with few configuration conflicts
- An excellent balance between development experience and execution speed

## Checklist

- [ ] A branching strategy is decided
- [ ] Commit message conventions are clear
- [ ] A PR template is prepared
- [ ] Test types and coverage targets are set
- [ ] A code review process is defined
- [ ] A CI/CD pipeline is built
