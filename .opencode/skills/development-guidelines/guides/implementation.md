# Implementation Guide

## TypeScript/JavaScript Conventions

### Type Definitions

**Using built-in types**:
```typescript
// ✅ Good: Use built-in types
function processItems(items: string[]): Record<string, number> {
  return items.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

// ❌ Bad: Importing from the typing module
import { List, Dict } from 'typing';
function processItems(items: List[str]): Dict[str, int] { }
```

**Type annotation principles**:
```typescript
// ✅ Good: Explicit type annotations
function calculateTotal(prices: number[]): number {
  return prices.reduce((sum, price) => sum + price, 0);
}

// ❌ Bad: Over-relying on type inference
function calculateTotal(prices) {  // becomes the any type
  return prices.reduce((sum, price) => sum + price, 0);
}
```

**Interface vs. type alias**:
```typescript
// Interface: extensible object types
interface Task {
  id: string;
  title: string;
  completed: boolean;
}

// Extension
interface ExtendedTask extends Task {
  priority: string;
}

// Type alias: union types, primitive types, etc.
type TaskStatus = 'todo' | 'in_progress' | 'completed';
type TaskId = string;
type Nullable<T> = T | null;
```

### Naming Conventions

**Variables and functions**:
```typescript
// Variables: camelCase, nouns
const userName = 'John';
const taskList = [];
const isCompleted = true;

// Functions: camelCase, start with a verb
function fetchUserData() { }
function validateEmail(email: string) { }
function calculateTotalPrice(items: Item[]) { }

// Boolean: start with is, has, should, or can
const isValid = true;
const hasPermission = false;
const shouldRetry = true;
const canDelete = false;
```

**Classes and interfaces**:
```typescript
// Classes: PascalCase, nouns
class TaskManager { }
class UserAuthenticationService { }

// Interfaces: PascalCase
interface TaskRepository { }
interface UserProfile { }

// Type aliases: PascalCase
type TaskStatus = 'todo' | 'in_progress' | 'completed';
```

**Constants**:
```typescript
// UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';
const DEFAULT_TIMEOUT = 5000;

// For configuration objects
const CONFIG = {
  maxRetryCount: 3,
  apiBaseUrl: 'https://api.example.com',
  defaultTimeout: 5000,
} as const;
```

**File names**:
```typescript
// Class files: PascalCase
// TaskService.ts
// UserRepository.ts

// Functions and utilities: camelCase
// formatDate.ts
// validateEmail.ts

// Components (React, etc.): PascalCase
// TaskList.tsx
// UserProfile.tsx

// Constants: kebab-case or UPPER_SNAKE_CASE
// api-endpoints.ts
// ERROR_MESSAGES.ts
```

### Function Design

**Single responsibility principle**:
```typescript
// ✅ Good: A single responsibility
function calculateTotalPrice(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function formatPrice(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

// ❌ Bad: Multiple responsibilities
function calculateAndFormatPrice(items: CartItem[]): string {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return `¥${total.toLocaleString()}`;
}
```

**Function length**:
- Target: within 20 lines
- Recommended: within 50 lines
- 100 lines or more: consider refactoring

**Number of parameters**:
```typescript
// ✅ Good: Group into an object
interface CreateTaskOptions {
  title: string;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
  dueDate?: Date;
}

function createTask(options: CreateTaskOptions): Task {
  // implementation
}

// ❌ Bad: Too many parameters
function createTask(
  title: string,
  description: string,
  priority: string,
  dueDate: Date,
  tags: string[],
  assignee: string
): Task {
  // implementation
}
```

### Error Handling

**Custom error classes**:
```typescript
// Defining error classes
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

class NotFoundError extends Error {
  constructor(
    public resource: string,
    public id: string
  ) {
    super(`${resource} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

class DatabaseError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'DatabaseError';
    this.cause = cause;
  }
}
```

**Error handling patterns**:
```typescript
// ✅ Good: Proper error handling
async function getTask(id: string): Promise<Task> {
  try {
    const task = await repository.findById(id);

    if (!task) {
      throw new NotFoundError('Task', id);
    }

    return task;
  } catch (error) {
    if (error instanceof NotFoundError) {
      // Expected error: handle appropriately
      logger.warn(`Task not found: ${id}`);
      throw error;
    }

    // Unexpected error: wrap and propagate upward
    throw new DatabaseError('Failed to retrieve the task', error as Error);
  }
}

// ❌ Bad: Ignoring the error
async function getTask(id: string): Promise<Task | null> {
  try {
    return await repository.findById(id);
  } catch (error) {
    return null; // error information is lost
  }
}
```

**Error messages**:
```typescript
// ✅ Good: Specific and suggests a solution
throw new ValidationError(
  'Title must be 1-200 characters. Current length: 250',
  'title',
  title
);

// ❌ Bad: Vague and unhelpful
throw new Error('Invalid input');
```

### Asynchronous Processing

**Using async/await**:
```typescript
// ✅ Good: async/await
async function fetchUserTasks(userId: string): Promise<Task[]> {
  try {
    const user = await userRepository.findById(userId);
    const tasks = await taskRepository.findByUserId(user.id);
    return tasks;
  } catch (error) {
    logger.error('Failed to retrieve tasks', error);
    throw error;
  }
}

// ❌ Bad: Promise chains
function fetchUserTasks(userId: string): Promise<Task[]> {
  return userRepository.findById(userId)
    .then(user => taskRepository.findByUserId(user.id))
    .then(tasks => tasks)
    .catch(error => {
      logger.error('Failed to retrieve tasks', error);
      throw error;
    });
}
```

**Parallel processing**:
```typescript
// ✅ Good: Run in parallel with Promise.all
async function fetchMultipleUsers(ids: string[]): Promise<User[]> {
  const promises = ids.map(id => userRepository.findById(id));
  return Promise.all(promises);
}

// ❌ Bad: Sequential execution
async function fetchMultipleUsers(ids: string[]): Promise<User[]> {
  const users: User[] = [];
  for (const id of ids) {
    const user = await userRepository.findById(id); // slow
    users.push(user);
  }
  return users;
}
```

## Comment Conventions

### Documentation Comments

**TSDoc format**:
```typescript
/**
 * Creates a task
 *
 * @param data - Data for the task to create
 * @returns The created task
 * @throws {ValidationError} When the data is invalid
 * @throws {DatabaseError} When a database error occurs
 *
 * @example
 * ```typescript
 * const task = await createTask({
 *   title: 'New task',
 *   priority: 'high'
 * });
 * ```
 */
async function createTask(data: CreateTaskData): Promise<Task> {
  // implementation
}
```

### Inline Comments

**Good comments**:
```typescript
// ✅ Explain the reason
// Invalidate the cache to fetch the latest data
cache.clear();

// ✅ Explain complex logic
// Compute the maximum subarray sum using Kadane's algorithm
// Time complexity: O(n)
let maxSoFar = arr[0];
let maxEndingHere = arr[0];

// ✅ Make use of TODO and FIXME
// TODO: Implement caching (Issue #123)
// FIXME: Performance degrades with large datasets (Issue #456)
// HACK: Temporary workaround, needs refactoring later
```

**Bad comments**:
```typescript
// ❌ Merely restating the code
// Increment i by 1
i++;

// ❌ Stale information
// This code was added in 2020 (unnecessary information)

// ❌ Commented-out code
// const oldImplementation = () => { ... };  // should be deleted
```

## Security

### Input Validation

```typescript
// ✅ Good: Strict validation
function validateEmail(email: string): void {
  if (!email || typeof email !== 'string') {
    throw new ValidationError('Email address is required', 'email', email);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Email address format is invalid', 'email', email);
  }

  if (email.length > 254) {
    throw new ValidationError('Email address is too long', 'email', email);
  }
}

// ❌ Bad: No validation
function validateEmail(email: string): void {
  // no validation
}
```

### Managing Sensitive Information

```typescript
// ✅ Good: Load from environment variables
import { config } from './config';

const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error('The API_KEY environment variable is not set');
}

// ❌ Bad: Hardcoding
const apiKey = 'sk-1234567890abcdef'; // never do this!
```

## Performance

### Choosing Data Structures

```typescript
// ✅ Good: O(1) access with a Map
const userMap = new Map(users.map(u => [u.id, u]));
const user = userMap.get(userId); // O(1)

// ❌ Bad: O(n) search with an array
const user = users.find(u => u.id === userId); // O(n)
```

### Loop Optimization

```typescript
// ✅ Good: Move unnecessary computation outside the loop
const length = items.length;
for (let i = 0; i < length; i++) {
  process(items[i]);
}

// ❌ Bad: Recomputing length every iteration
for (let i = 0; i < items.length; i++) {
  process(items[i]);
}

// ✅ Better: Use for...of
for (const item of items) {
  process(item);
}
```

### Memoization

```typescript
// Caching computation results
const cache = new Map<string, Result>();

function expensiveCalculation(input: string): Result {
  if (cache.has(input)) {
    return cache.get(input)!;
  }

  const result = /* heavy computation */;
  cache.set(input, result);
  return result;
}
```

## Test Code

### Test Structure (Given-When-Then)

```typescript
describe('TaskService', () => {
  describe('create', () => {
    it('can create a task with valid data', async () => {
      // Given: setup
      const service = new TaskService(mockRepository);
      const taskData = {
        title: 'Test task',
        description: 'Description for testing',
      };

      // When: execute
      const result = await service.create(taskData);

      // Then: verify
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBe('Test task');
      expect(result.description).toBe('Description for testing');
      expect(result.createdAt).toBeInstanceOf(Date);
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

### Creating Mocks

```typescript
// ✅ Good: Mocks based on an interface
const mockRepository: TaskRepository = {
  save: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  delete: jest.fn(),
};

// Configure behavior per test
beforeEach(() => {
  mockRepository.findById = jest.fn((id) => {
    if (id === 'existing-id') {
      return Promise.resolve(mockTask);
    }
    return Promise.resolve(null);
  });
});
```

## Refactoring

### Eliminating Magic Numbers

```typescript
// ✅ Good: Define constants
const MAX_RETRY_COUNT = 3;
const RETRY_DELAY_MS = 1000;

for (let i = 0; i < MAX_RETRY_COUNT; i++) {
  try {
    return await fetchData();
  } catch (error) {
    if (i < MAX_RETRY_COUNT - 1) {
      await sleep(RETRY_DELAY_MS);
    }
  }
}

// ❌ Bad: Magic numbers
for (let i = 0; i < 3; i++) {
  try {
    return await fetchData();
  } catch (error) {
    if (i < 2) {
      await sleep(1000);
    }
  }
}
```

### Extracting Functions

```typescript
// ✅ Good: Extract functions
function processOrder(order: Order): void {
  validateOrder(order);
  calculateTotal(order);
  applyDiscounts(order);
  saveOrder(order);
}

function validateOrder(order: Order): void {
  if (!order.items || order.items.length === 0) {
    throw new ValidationError('No items selected', 'items', order.items);
  }
}

function calculateTotal(order: Order): void {
  order.total = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
}

// ❌ Bad: A long function
function processOrder(order: Order): void {
  if (!order.items || order.items.length === 0) {
    throw new ValidationError('No items selected', 'items', order.items);
  }

  order.total = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (order.coupon) {
    order.total -= order.total * order.coupon.discountRate;
  }

  repository.save(order);
}
```

## Checklist

Confirm before completing implementation:

### Code Quality
- [ ] Naming is clear and consistent
- [ ] Functions have a single responsibility
- [ ] No magic numbers
- [ ] Type annotations are written appropriately
- [ ] Error handling is implemented

### Security
- [ ] Input validation is implemented
- [ ] No sensitive information is hardcoded
- [ ] SQL injection countermeasures are in place

### Performance
- [ ] Appropriate data structures are used
- [ ] Unnecessary computation is avoided
- [ ] Loops are optimized

### Testing
- [ ] Unit tests are written
- [ ] Tests pass
- [ ] Edge cases are covered

### Documentation
- [ ] Functions and classes have TSDoc comments
- [ ] Complex logic has comments
- [ ] TODOs and FIXMEs are noted (where applicable)

### Tooling
- [ ] No lint errors
- [ ] Type checking passes
- [ ] Formatting is consistent
