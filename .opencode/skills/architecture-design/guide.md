# Architecture Design Guide

## Basic Principles

### 1. State the Rationale for Technology Choices

**Bad example**:
```
- Node.js
- TypeScript
```

**Good example**:
```
- Node.js v24.11.0 (LTS)
  - Long-term support guaranteed until April 2026, ensuring stable operation in production
  - Excellent at asynchronous I/O, delivering high performance as an API server
  - Rich npm ecosystem makes the required libraries easy to obtain

- TypeScript 5.x
  - Static typing catches bugs at compile time, improving maintainability
  - Powerful IDE autocompletion boosts development efficiency
  - Shared type definitions in team development ensure code readability and quality

- npm 11.x
  - Bundled with Node.js v24.11.0, so no separate installation is required
  - Supports monorepo configurations via the workspaces feature
  - Enables strict dependency management through package-lock.json
```

### 2. The Principle of Layer Separation

Clarify the responsibilities of each layer and keep dependencies unidirectional:

```
UI → Service → Data (OK)
UI ← Service (NG)
UI → Data (NG)
```

### 3. Measurable Requirements

Describe all performance requirements in a measurable form.

## Designing a Layered Architecture

### Responsibilities of Each Layer

**UI layer**:
```typescript
// Responsibility: Accepting and validating user input
class CLI {
  // OK: Call the service layer
  async addTask(title: string) {
    const task = await this.taskService.create({ title });
    console.log(`Created: ${task.id}`);
  }

  // NG: Call the data layer directly
  async addTask(title: string) {
    const task = await this.repository.save({ title }); // ❌
  }
}
```

**Service layer**:
```typescript
// Responsibility: Implementing business logic
class TaskService {
  // Business logic: Automatic priority estimation
  async create(data: CreateTaskData): Promise<Task> {
    const task = {
      ...data,
      estimatedPriority: this.estimatePriority(data),
    };
    return this.repository.save(task);
  }
}
```

**Data layer**:
```typescript
// Responsibility: Data persistence
class TaskRepository {
  async save(task: Task): Promise<void> {
    await this.storage.write(task);
  }
}
```

## Setting Performance Requirements

### Concrete Numeric Targets

```
Command execution time: within 100ms (on an average PC environment)
└─ Measurement method: measure from CLI startup to result display with console.time
└─ Measurement environment: CPU equivalent to Core i5, 8GB RAM, SSD

Task list display: within 1 second for up to 1000 items
└─ Measurement method: measure with 1000 dummy data items
└─ Acceptable range: 100ms for 100 items, 1 second for 1000 items, 10 seconds for 10000 items
```

## Security Design

### The Three Principles of Data Protection

1. **Principle of least privilege**
```bash
# File permissions
chmod 600 ~/.devtask/tasks.json  # Read/write for owner only
```

2. **Input validation**
```typescript
function validateTitle(title: string): void {
  if (!title || title.length === 0) {
    throw new ValidationError('Title is required');
  }
  if (title.length > 200) {
    throw new ValidationError('Title must be 200 characters or fewer');
  }
}
```

3. **Managing sensitive information**
```bash
# Manage via environment variables
export DEVTASK_API_KEY="xxxxx"  # Do not hardcode in the code
```

## Scalability Design

### Handling Data Growth

**Expected data volume**: [e.g., 10,000 tasks]

**Countermeasures**:
- Data pagination
- Archiving old data
- Index optimization

```typescript
// Example archive feature: move old tasks to a separate file
class ArchiveService {
  async archiveCompletedTasks(olderThan: Date): Promise<void> {
    const oldTasks = await this.repository.findCompleted(olderThan);
    await this.archiveStorage.save(oldTasks);
    await this.repository.deleteMany(oldTasks.map(t => t.id));
  }
}
```

## Dependency Management

### Version Management Policy

```json
{
  "dependencies": {
    "commander": "^11.0.0",  // Minor version upgrades are automatic
    "chalk": "5.3.0"         // Pin when there is a risk of breaking changes
  },
  "devDependencies": {
    "typescript": "~5.3.0",  // Patch versions only are automatic
    "eslint": "^9.0.0"
  }
}
```

**Policy**:
- Pin stable versions (allow up to minor versions with ^)
- Pin completely when there is a risk of breaking changes
- For devDependencies, automate patch versions only (~)

## Checklist

- [ ] Every technology choice has a stated rationale
- [ ] The layered architecture is clearly defined
- [ ] Performance requirements are measurable
- [ ] Security considerations are documented
- [ ] Scalability is taken into account
- [ ] A backup strategy is defined
- [ ] The dependency management policy is clear
- [ ] A test strategy is defined
