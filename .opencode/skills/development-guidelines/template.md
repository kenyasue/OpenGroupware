# Development Guidelines

## Coding Conventions

### Naming Conventions

#### Variables and Functions

**TypeScript/JavaScript**:
```typescript
// ✅ Good example
const userProfileData = fetchUserProfile();
function calculateTotalPrice(items: CartItem[]): number { }

// ❌ Bad example
const data = fetch();
function calc(arr: any[]): number { }
```

**Principles**:
- Variables: camelCase, noun or noun phrase
- Functions: camelCase, start with a verb
- Constants: UPPER_SNAKE_CASE
- Boolean: start with `is`, `has`, or `should`

#### Classes and Interfaces

```typescript
// Class: PascalCase, noun
class TaskManager { }
class UserAuthenticationService { }

// Interface: PascalCase, with or without the I prefix
interface ITaskRepository { }
interface Task { }

// Type alias: PascalCase
type TaskStatus = 'todo' | 'in_progress' | 'completed';
```

### Code Formatting

**Indentation**: [2 spaces / 4 spaces / tabs]

**Line length**: maximum [80/100/120] characters

**Example**:
```typescript
// [language] code formatting example
[code example]
```

### Comment Conventions

**Function and class documentation**:
```typescript
/**
 * Calculate the total number of tasks
 *
 * @param tasks - Array of tasks to count
 * @param filter - Filter condition (optional)
 * @returns Total number of tasks
 * @throws {ValidationError} When the task array is invalid
 */
function countTasks(
  tasks: Task[],
  filter?: TaskFilter
): number {
  // Implementation
}
```

**Inline comments**:
```typescript
// ✅ Good example: explain why you do it
// Invalidate the cache to fetch the latest data
cache.clear();

// ❌ Bad example: what you are doing (obvious from the code)
// Clear the cache
cache.clear();
```

### Error Handling

**Principles**:
- Expected errors: define an appropriate error class
- Unexpected errors: propagate upward
- Do not ignore errors

**Example**:
```typescript
// Error class definition
class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Error handling
try {
  const task = await taskService.create(data);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(`Validation error [${error.field}]: ${error.message}`);
    // Provide feedback to the user
  } else {
    console.error('Unexpected error:', error);
    throw error; // Propagate upward
  }
}
```

## Git Workflow Rules

### Branching Strategy

**Branch types**:
- `main`: ready to deploy to production
- `develop`: latest development state
- `feature/[feature-name]`: new feature development
- `fix/[fix-description]`: bug fixes
- `refactor/[target]`: refactoring

**Flow**:
```
main
  └─ develop
      ├─ feature/task-management
      ├─ feature/user-auth
      └─ fix/task-validation
```

### Commit Message Conventions

**Format**:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type**:
- `feat`: new feature
- `fix`: bug fix
- `docs`: documentation
- `style`: code formatting
- `refactor`: refactoring
- `test`: adding or fixing tests
- `chore`: build, supporting tools, etc.

**Example**:
```
feat(task): add a task priority setting feature

Allowed users to set a priority (high/medium/low) on tasks.
- Added a priority field to the Task model
- Added a --priority option to the CLI
- Implemented sorting by priority

Closes #123
```

### Pull Request Process

**Checks before creating**:
- [ ] All tests pass
- [ ] No lint errors
- [ ] Type checking passes
- [ ] Conflicts are resolved

**PR template**:
```markdown
## Overview
[A brief description of the changes]

## Reason for Change
[Why this change is necessary]

## Changes
- [change 1]
- [change 2]

## Testing
- [ ] Unit tests added
- [ ] Manual testing performed

## Screenshots (if applicable)
[image]

## Related Issue
Closes #[issue number]
```

**Review process**:
1. Self-review
2. Run automated tests
3. Assign reviewers
4. Address review feedback
5. Merge after approval

## Test Strategy

### Test Types

#### Unit Tests

**Target**: individual functions and classes

**Coverage target**: [80/90/100]%

**Example**:
```typescript
describe('TaskService', () => {
  describe('create', () => {
    it('can create a task with valid data', async () => {
      const service = new TaskService(mockRepository);
      const task = await service.create({
        title: 'Test task',
        description: 'Description',
      });

      expect(task.id).toBeDefined();
      expect(task.title).toBe('Test task');
    });

    it('throws ValidationError when the title is empty', async () => {
      const service = new TaskService(mockRepository);

      await expect(
        service.create({ title: '' })
      ).rejects.toThrow(ValidationError);
    });
  });
});
```

#### Integration Tests

**Target**: coordination of multiple components

**Example**:
```typescript
describe('Task CRUD', () => {
  it('can create, read, update, and delete a task', async () => {
    // Create
    const created = await taskService.create({ title: 'Test' });

    // Read
    const found = await taskService.findById(created.id);
    expect(found?.title).toBe('Test');

    // Update
    await taskService.update(created.id, { title: 'Updated' });
    const updated = await taskService.findById(created.id);
    expect(updated?.title).toBe('Updated');

    // Delete
    await taskService.delete(created.id);
    const deleted = await taskService.findById(created.id);
    expect(deleted).toBeNull();
  });
});
```

#### E2E Tests

**Target**: the entire user scenario

**Example**:
```typescript
describe('Task management flow', () => {
  it('a user can add and complete a task', async () => {
    // Add a task
    await cli.run(['add', 'New task']);
    expect(output).toContain('Task added');

    // Display the task list
    await cli.run(['list']);
    expect(output).toContain('New task');

    // Complete the task
    await cli.run(['complete', '1']);
    expect(output).toContain('Task completed');
  });
});
```

### Test Naming Conventions

**Pattern**: `[target]_[condition]_[expectedResult]`

**Example**:
```typescript
// ✅ Good example
it('create_emptyTitle_throwsValidationError', () => { });
it('findById_existingId_returnsTask', () => { });
it('delete_nonExistentId_throwsNotFoundError', () => { });

// ❌ Bad example
it('test1', () => { });
it('works', () => { });
it('should work correctly', () => { });
```

### Using Mocks and Stubs

**Principles**:
- Mock external dependencies (API, DB, file system)
- Use the real implementation for business logic

**Example**:
```typescript
// Mock the repository
const mockRepository: ITaskRepository = {
  save: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  delete: jest.fn(),
};

// The service uses the real implementation
const service = new TaskService(mockRepository);
```

## Code Review Criteria

### Review Points

**Functionality**:
- [ ] Does it meet the requirements?
- [ ] Are edge cases considered?
- [ ] Is error handling appropriate?

**Readability**:
- [ ] Is the naming clear?
- [ ] Are the comments appropriate?
- [ ] Is complex logic explained?

**Maintainability**:
- [ ] Is there any duplicate code?
- [ ] Are responsibilities clearly separated?
- [ ] Is the impact scope of changes limited?

**Performance**:
- [ ] Are there any unnecessary computations?
- [ ] Is there any possibility of a memory leak?
- [ ] Are database queries optimized?

**Security**:
- [ ] Is input validation appropriate?
- [ ] Is any sensitive information hardcoded?
- [ ] Are permission checks implemented?

### How to Write Review Comments

**Constructive feedback**:
```markdown
## ✅ Good example
With this implementation, performance may degrade as the number of tasks grows.
How about considering a search that uses an index instead?

## ❌ Bad example
This way of writing it is not good.
```

**Indicate priority**:
- `[required]`: must be fixed
- `[recommended]`: fix recommended
- `[suggestion]`: please consider
- `[question]`: a question for understanding

## Development Environment Setup

### Required Tools

| Tool | Version | Installation method |
|--------|-----------|-----------------|
| [tool 1] | [version] | [command] |
| [tool 2] | [version] | [command] |

### Setup Procedure

```bash
# 1. Clone the repository
git clone [URL]
cd [project-name]

# 2. Install dependencies
[install command]

# 3. Set environment variables
cp .env.example .env
# Edit the .env file

# 4. Start the development server
[start command]
```

### Recommended Development Tools (if applicable)

- [tool 1]: [description]
- [tool 2]: [description]
