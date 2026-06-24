# Functional Design Document Creation Guide

This guide provides practical guidance for creating a functional design document based on a Product Requirements Document (PRD).

## Purpose of the Functional Design Document

The functional design document translates the "what to build" defined in the PRD into "how to realize it".

**Main Content**:
- System architecture diagram
- Data model
- Component design
- Algorithm design (if applicable)
- UI design
- Error handling

## Basic Creation Flow

### Step 1: Review the PRD

Before creating the functional design document, always review the PRD.

```
Example prompt for having opencode create a functional design document from the PRD:

Create a functional design document based on the content of the PRD.
In particular, focus on the priority P0 (MVP) features.
```

### Step 2: Create the System Architecture Diagram

#### Using Mermaid Notation

Write the system architecture diagram using Mermaid notation.

**Example of a basic 3-tier architecture**:
```mermaid
graph TB
    User[User]
    CLI[CLI Layer]
    Service[Service Layer]
    Data[Data Layer]

    User --> CLI
    CLI --> Service
    Service --> Data
```

**A more detailed example**:
```mermaid
graph TB
    User[User]
    CLI[CLI Interface]
    Commander[Commander.js]
    TaskManager[TaskManager]
    PriorityEstimator[PriorityEstimator]
    FileStorage[FileStorage]
    JSON[(tasks.json)]

    User --> CLI
    CLI --> Commander
    Commander --> TaskManager
    TaskManager --> PriorityEstimator
    TaskManager --> FileStorage
    FileStorage --> JSON
```

### Step 3: Define the Data Model

#### Define Clearly with TypeScript Type Definitions

Define the data model using TypeScript interfaces.

**Example of a basic Task type**:
```typescript
interface Task {
  id: string;                    // UUID v4
  title: string;                 // 1-200 characters
  description?: string;          // Optional, Markdown format
  status: TaskStatus;            // 'todo' | 'in_progress' | 'completed'
  priority: TaskPriority;        // 'high' | 'medium' | 'low'
  estimatedPriority?: TaskPriority;  // Automatically estimated priority
  dueDate?: Date;                // Due date
  createdAt: Date;               // Creation timestamp
  updatedAt: Date;               // Update timestamp
  statusHistory?: StatusChange[]; // Status change history
}

type TaskStatus = 'todo' | 'in_progress' | 'completed';
type TaskPriority = 'high' | 'medium' | 'low';

interface StatusChange {
  from: TaskStatus;
  to: TaskStatus;
  changedAt: Date;
}
```

**Key Points**:
- Add a comment explaining each field
- Clearly note constraints (character count, format, etc.)
- Add `?` to optional fields
- Improve readability with type aliases

#### Creating an ER Diagram

When there are multiple entities, show the relationships with an ER diagram.

```mermaid
erDiagram
    TASK ||--o{ SUBTASK : has
    TASK ||--o{ TAG : has
    USER ||--o{ TASK : creates

    TASK {
        string id PK
        string title
        string status
        datetime createdAt
    }
    SUBTASK {
        string id PK
        string taskId FK
        string title
    }
```

### Step 4: Component Design

Clarify the responsibilities of each layer.

#### CLI Layer

**Responsibility**: Accept user input, validation, display results

```typescript
// CommandLineInterface
class CLI {
  // Accept user input
  parseArguments(): Command;

  // Display results
  displayResult(result: Result): void;

  // Display errors
  displayError(error: Error): void;
}
```

#### Service Layer

**Responsibility**: Implement business logic

```typescript
// TaskManager
class TaskManager {
  // Create a task
  createTask(data: CreateTaskData): Task;

  // Get the task list
  listTasks(filter?: FilterOptions): Task[];

  // Update a task
  updateTask(id: string, data: UpdateTaskData): Task;

  // Delete a task
  deleteTask(id: string): void;
}
```

#### Data Layer

**Responsibility**: Data persistence and retrieval

```typescript
// FileStorage
class FileStorage {
  // Save data
  save(data: any): void;

  // Load data
  load(): any;

  // Check whether the file exists
  exists(): boolean;
}
```

### Step 5: Algorithm Design (if applicable)

Design complex logic (e.g., automatic priority estimation) in detail.

#### Example of an Automatic Priority Estimation Algorithm

**Purpose**: Automatically estimate priority from a task's due date, creation timestamp, and status

**Calculation Logic**:

##### Step 1: Deadline Score Calculation (0-100 points)
```
- Overdue: 100 points (highest)
- 0-3 days until due: 90 points
- 4-7 days until due: 70 points
- 8-14 days until due: 50 points
- 14 or more days until due: 30 points
- No due date set: 20 points
```

**Formula**:
```typescript
function calculateDeadlineScore(dueDate?: Date): number {
  if (!dueDate) return 20;

  const now = new Date();
  const daysRemaining = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) return 100;  // Overdue
  if (daysRemaining <= 3) return 90;
  if (daysRemaining <= 7) return 70;
  if (daysRemaining <= 14) return 50;
  return 30;
}
```

##### Step 2: Elapsed Time Score Calculation (0-100 points)
```
- 30 or more days since creation: 100 points (highest)
- 21-30 days since creation: 80 points
- 14-21 days since creation: 60 points
- 7-14 days since creation: 40 points
- Less than 7 days since creation: 20 points
```

**Formula**:
```typescript
function calculateAgeScore(createdAt: Date): number {
  const now = new Date();
  const daysOld = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  if (daysOld >= 30) return 100;
  if (daysOld >= 21) return 80;
  if (daysOld >= 14) return 60;
  if (daysOld >= 7) return 40;
  return 20;
}
```

##### Step 3: Status Score Calculation (0-100 points)
```
- In progress (in_progress): 100 points (highest priority)
- Not started (todo): 50 points
- Completed (completed): 0 points
```

**Formula**:
```typescript
function calculateStatusScore(status: TaskStatus): number {
  if (status === 'in_progress') return 100;
  if (status === 'todo') return 50;
  return 0;  // completed
}
```

##### Step 4: Total Score Calculation

**Weighted Average**:
```
Total Score = (Deadline Score × 50%) + (Elapsed Time Score × 20%) + (Status Score × 30%)
```

**Formula**:
```typescript
function calculateTotalScore(task: Task): number {
  const deadlineScore = calculateDeadlineScore(task.dueDate);
  const ageScore = calculateAgeScore(task.createdAt);
  const statusScore = calculateStatusScore(task.status);

  return (deadlineScore * 0.5) + (ageScore * 0.2) + (statusScore * 0.3);
}
```

##### Step 5: Priority Classification

**Classification by Threshold**:
```
- 70 points or more: high (high priority)
- 40-70 points: medium (medium priority)
- Less than 40 points: low (low priority)
```

**Formula**:
```typescript
function estimatePriority(task: Task): TaskPriority {
  const score = calculateTotalScore(task);

  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}
```

**Complete Implementation Example**:
```typescript
class PriorityEstimator {
  estimate(task: Task): TaskPriority {
    const deadlineScore = this.calculateDeadlineScore(task.dueDate);
    const ageScore = this.calculateAgeScore(task.createdAt);
    const statusScore = this.calculateStatusScore(task.status);

    const totalScore = (deadlineScore * 0.5) + (ageScore * 0.2) + (statusScore * 0.3);

    if (totalScore >= 70) return 'high';
    if (totalScore >= 40) return 'medium';
    return 'low';
  }

  private calculateDeadlineScore(dueDate?: Date): number {
    if (!dueDate) return 20;

    const now = new Date();
    const daysRemaining = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) return 100;
    if (daysRemaining <= 3) return 90;
    if (daysRemaining <= 7) return 70;
    if (daysRemaining <= 14) return 50;
    return 30;
  }

  private calculateAgeScore(createdAt: Date): number {
    const now = new Date();
    const daysOld = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    if (daysOld >= 30) return 100;
    if (daysOld >= 21) return 80;
    if (daysOld >= 14) return 60;
    if (daysOld >= 7) return 40;
    return 20;
  }

  private calculateStatusScore(status: TaskStatus): number {
    if (status === 'in_progress') return 100;
    if (status === 'todo') return 50;
    return 0;
  }
}
```

### Step 6: Use Case Diagram

Express the main use cases with sequence diagrams.

**Task Addition Flow**:
```mermaid
sequenceDiagram
    participant User
    participant CLI
    participant TaskManager
    participant PriorityEstimator
    participant FileStorage

    User->>CLI: devtask add "task"
    CLI->>CLI: Validate input
    CLI->>TaskManager: createTask(data)
    TaskManager->>TaskManager: Create task object
    TaskManager->>PriorityEstimator: estimate(task)
    PriorityEstimator-->>TaskManager: Estimated priority
    TaskManager->>FileStorage: save(task)
    FileStorage-->>TaskManager: Success
    TaskManager-->>CLI: Created task
    CLI-->>User: "Task created (ID: xxx)"
```

### Step 7: UI Design (if applicable)

For CLI tools, define table display and color coding.

#### Table Display

```
┌──────────┬──────────────────┬────────────┬──────────┬───────────────┐
│ ID       │ Title            │ Status     │ Priority │ Due Date      │
├──────────┼──────────────────┼────────────┼──────────┼───────────────┤
│ 7a5c6ff0 │ Buy milk on the  │ Not started│ High     │ 2025-11-05    │
│          │ way home.        │            │          │ (1 day left)  │
└──────────┴──────────────────┴────────────┴──────────┴───────────────┘
```

#### Color Coding

**Status Color Coding**:
- Completed (completed): green
- In progress (in_progress): yellow
- Not started (todo): white

**Priority Color Coding**:
- High (high): red
- Medium (medium): yellow
- Low (low): blue

### Step 8: File Structure (if applicable)

Define the data storage format.

**Example: Data storage for a CLI tool**:
```
.devtask/
├── tasks.json      # Task data
└── config.json     # Configuration data
```

**Example of tasks.json**:
```json
{
  "tasks": [
    {
      "id": "7a5c6ff0-5f55-474e-baf7-ea13624d73a4",
      "title": "Buy milk on the way home",
      "description": "",
      "status": "todo",
      "priority": "high",
      "estimatedPriority": "medium",
      "dueDate": "2025-11-05T00:00:00.000Z",
      "createdAt": "2025-11-04T10:00:00.000Z",
      "updatedAt": "2025-11-04T10:00:00.000Z"
    }
  ]
}
```

### Step 9: Error Handling

Define the types of errors and how to handle them.

| Error Category | Handling | Display to User |
|-----------|------|-----------------|
| Input validation error | Abort processing, display error message | "Please enter a title of 1-200 characters" |
| File read error | Continue with empty initial data | "Data file not found. Creating a new one" |
| Task not found | Abort processing, display error message | "Task not found (ID: xxx)" |

## Reviewing the Functional Design Document

### Review Perspectives

Request a review from opencode:

```
Please evaluate this functional design document. Check it from the following perspectives:

1. Does it satisfy the requirements of the PRD?
2. Is the data model concrete?
3. Are the responsibilities of the components clear?
4. Is the algorithm detailed to an implementable level?
5. Is error handling comprehensive?
```

### Implementing Improvements

Make improvements based on opencode's feedback.

## Summary

Keys to successfully creating a functional design document:

1. **Consistency with the PRD**: Accurately reflect the requirements defined in the PRD
2. **Leverage Mermaid notation**: Express things visually with diagrams
3. **TypeScript type definitions**: Make the data model clear
4. **Detailed algorithm design**: Be concrete about complex logic
5. **Layer separation**: Clarify the responsibilities of each component
6. **Implementable level**: A level of detail that lets developers implement without confusion
