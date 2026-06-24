---
name: steering
description: A skill for recording the work plan and task list for each work instruction in documents. Load it during work planning, implementation, and verification triggered by user instructions.
---

# Steering Skill

A skill that supports implementation based on steering files (`.steering/`) and reliably manages progress in tasklist.md.

## Purpose of This Skill

- Support creation of steering files (requirements.md, design.md, tasklist.md)
- Manage incremental implementation based on tasklist.md
- **Automatically track progress and enforce tasklist.md updates**
- Record a retrospective after implementation is complete

## When to Use

Use this skill at the following times:

1. **During work planning**: when creating steering files
2. **During implementation**: when implementing according to tasklist.md
3. **During verification**: when recording the retrospective after implementation is complete

## Mode 1: Creating Steering Files

### Purpose
Create steering files for a new feature or change.

### Procedure

1. **Check the steering directory**
   ```
   Get the current date and create a directory in the form `.steering/[YYYYMMDD]-[feature-name]/`
   ```

2. **Review the persistent documents**
   - `docs/product-requirements.md`
   - `docs/functional-design.md`
   - `docs/architecture.md`
   - `docs/repository-structure.md`
   - `docs/development-guidelines.md`

   Read these to understand the project's direction

3. **Create files from templates**

   Load the following templates, replace the placeholders with concrete content, and create the files:

   - `.opencode/skills/steering/templates/requirements.md` → `.steering/[date]-[feature-name]/requirements.md`
   - `.opencode/skills/steering/templates/design.md` → `.steering/[date]-[feature-name]/design.md`
   - `.opencode/skills/steering/templates/tasklist.md` → `.steering/[date]-[feature-name]/tasklist.md`

4. **Detail out tasklist.md**

   Based on requirements.md and design.md, flesh out tasklist.md:
   - Describe the tasks of each phase concretely
   - Make subtasks clear as well
   - State the order of implementation

## Mode 2: Implementation (Most Important)

### Purpose
Proceed with implementation according to tasklist.md and **reliably record progress in the document**.

### 🚨 Important Principles

**MUST**:
- Implement with tasklist.md always open
- When starting a task, always update `[ ]`→`[x]` using the edit tool
- When completing a task, always record completion using the edit tool
- **Keep working until all tasks in tasklist.md are complete**
- NEVER: do not move on to the next task without updating tasklist.md

**NEVER**:
- Proceed with implementation without looking at tasklist.md
- Manage progress with the todowrite tool alone (todowrite is a helper; tasklist.md is the official record)
- Update multiple tasks in batch (update in real time)
- **Skip a task for reasons such as "due to time constraints" or "planned as a separate task"**
- **Finish work while leaving incomplete tasks (`[ ]`)**

### 🚨 Principle of Fully Completing Tasks

**Rules that absolutely must be followed**:

1. **Keep working until all tasks in tasklist.md are complete**
   - Continue implementation until every task is `[x]`
   - Do not skip for reasons such as "it takes too long" or "it's difficult"
   - Do not write a retrospective while incomplete tasks remain

2. **Skipping tasks is forbidden in principle**
   - "Planned as a separate task due to time constraints" is forbidden
   - "Postponed because the implementation is too complex" is forbidden
   - Reasons such as "it's difficult, do it later" or "testing is a hassle" are forbidden
   - Skipping is permitted only for technical reasons (see below)

3. **How to handle a task that is too large**
   - Split the task into smaller subtasks
   - Add the split subtasks to tasklist.md
   - Complete the subtasks one by one

4. **Skipping is permitted only when a task becomes unnecessary for technical reasons**

   Skipping is possible only when one of the following technical reasons applies:
   - A change in the implementation approach made the feature itself unnecessary
   - An architecture change replaced it with a different implementation method
   - A change in dependencies made the task impossible to execute
   - An upper-level design change made this task meaningless

   Skip procedure:
   - Clearly state the technical reason in tasklist.md and mark it as skipped
   - Example: `- [x] ~~task name~~ (unnecessary due to a change in approach: the architecture was changed from X to Y, so this layer is no longer needed)`
   - Record the reason for the change in detail in the retrospective section

5. **Bad examples when incomplete tasks remain**
   ```markdown
   ## Post-Implementation Retrospective
   **Tasks not implemented**:
   - Implementing tests (planned as a separate task due to time constraints) ❌ Absolutely not allowed
   ```

6. **What correct completion looks like**
   - All tasks are `[x]`
   - There is no "tasks not implemented" entry in the retrospective section
   - If the implementation approach changed, the reason is clearly stated

### Implementation Flow

#### Step 1: Load tasklist.md

Read `.steering/[date]-[feature-name]/tasklist.md`

Grasp the overall task structure and identify the next task to work on.

#### Step 2: Start task management with todowrite

Based on the contents of tasklist.md, create a task list with the todowrite tool:
- This is an auxiliary, internal note
- **tasklist.md is the official document**

#### Step 3: Task Loop (repeat for each task)

**3-1. Check the next task**
```
Read tasklist.md and identify the next incomplete task (`[ ]`)
```

**3-2. Record the task start in tasklist.md (required)**
```
Use the edit tool to update the relevant line in tasklist.md from `[ ]`→`[x]`

Example:
old_string: "- [ ] Implement StorageService"
new_string: "- [x] Implement StorageService"
```

**Important**: Immediately after running the edit tool, confirm that the update succeeded.

**3-3. Update the status in todowrite as well**
```
Change the relevant task to "in_progress" with the todowrite tool
```

**3-4. Carry out the implementation**
```
Implement according to the development guidelines (docs/development-guidelines.md)
```

**3-5. Record task completion in tasklist.md (required)**
```
After implementation is complete, always update tasklist.md with the edit tool to record completion

If there are subtasks, update each subtask individually as well
```

**3-6. Update the status in todowrite as well**
```
Change the relevant task to "completed" with the todowrite tool
```

**3-7. On to the next task**
```
Return to Step 3-1
```

#### Step 4: Checking at Phase Completion

When each phase (e.g., Phase 1, Phase 2) is complete:

1. **Load tasklist.md and check progress**
   ```
   Read `.steering/[date]-[feature-name]/tasklist.md`
   ```

2. **Check completed tasks**
   - Are all tasks `[x]`?
   - Are there any tasks that were overlooked?

3. **Report to the user**
   ```
   "Phase 1 is complete. Please check the progress in tasklist.md."
   ```

#### Step 4.5: All-Tasks-Complete Check (required)

**Always run this after implementing all phases, before writing the retrospective**:

1. **Load tasklist.md**
   ```
   Read `.steering/[date]-[feature-name]/tasklist.md`
   ```

2. **Check for incomplete tasks (`[ ]`)**
   - Are all tasks `[x]`?
   - Is there even one `[ ]` remaining?

3. **If an incomplete task is found**

   **❌ What you must not do**:
   - Write "planned as a separate task due to time constraints" in the retrospective
   - Ignore the incomplete task and move on to the next step

   **✅ The correct response**:

   **Pattern A: Implement the task**
   ```
   Return to Step 3 (the task loop) and implement the incomplete task
   ```

   **Pattern B: If the task is too large**
   ```
   1. Split the task into smaller subtasks
   2. Add the split subtasks to tasklist.md
   3. Complete the subtasks one by one
   ```

   **Pattern C: Only when a task became unnecessary for technical reasons**

   Skipping is possible only when one of the following technical reasons applies:
   - A change in the implementation approach made the feature itself unnecessary
   - An architecture change replaced it with a different implementation method
   - A change in dependencies made the task impossible to execute

   Skip procedure:
   ```
   1. Clearly state the technical reason in tasklist.md:
      "- [x] ~~task name~~ (unnecessary due to a change in approach: describe the specific technical reason in detail)"
   2. Record the reason for the change in detail in the retrospective section
   3. Clearly describe why this task became unnecessary and what it was replaced with
   ```

4. **Proceed only after confirming all tasks are complete**
   ```
   Confirm that every task is `[x]` before proceeding to Step 5
   ```

#### Step 5: After All Tasks Are Complete

1. **Final check**
   ```
   Read `.steering/[date]-[feature-name]/tasklist.md`
   ```

   Confirm that every task is `[x]`

2. **Record in the retrospective section**
   ```
   Update the "Post-Implementation Retrospective" section of tasklist.md with the edit tool:
   - Implementation completion date
   - Differences between plan and actual
   - Lessons learned
   - Improvement suggestions for next time
   ```

### Self-Check During Implementation

Every 5 tasks, check the following:

- [ ] Did you recently update tasklist.md? (within 5 tasks since the last update)
- [ ] Is progress reflected in the document? (verify with the read tool)
- [ ] Can the user understand the progress by looking at tasklist.md?

## Mode 3: Retrospective

### Purpose
After implementation is complete, record a retrospective in tasklist.md.

### Procedure

1. **Load tasklist.md**
   ```
   Read `.steering/[date]-[feature-name]/tasklist.md`
   ```

2. **Write the retrospective content**
   - Implementation completion date
   - Differences between plan and actual (points that differed from the plan)
   - Lessons learned (technical insights, process improvements)
   - Improvement suggestions for next time

3. **Update with the edit tool**
   ```
   Update the "Post-Implementation Retrospective" section of tasklist.md
   ```

4. **Report to the user**
   ```
   "I have recorded the retrospective in tasklist.md. Please check the content."
   ```

## Troubleshooting

### If you forgot to update tasklist.md

If you notice during implementation that you forgot to update tasklist.md:

1. **Update immediately**
   ```
   Read `.steering/[date]-[feature-name]/tasklist.md`
   Identify the completed tasks and update them all to `[x]` with the edit tool
   ```

2. **Report to the user**
   ```
   "The tasklist.md update was delayed, so I have reflected the current progress."
   ```

3. **Prevent recurrence**
   - Update reliably from the next task onward
   - Strictly follow the self-check every 5 tasks

### Divergence between tasklist.md and the implementation

When the plan and the implementation differ significantly:

1. **Add an annotation to tasklist.md**
   ```
   Add an annotation to the relevant task with the edit tool:
   "- [x] task name (changed implementation method: reason)"
   ```

2. **Add new tasks as needed**
   ```
   Add new tasks with the edit tool
   ```

3. **Update design.md too**
   ```
   If the design change is significant, update design.md as well
   ```

## Checklist (Most Important)

Always check before implementation:

- [ ] Did you load tasklist.md?
- [ ] Did you identify the next task?
- [ ] Did you update with the edit tool when starting the task?

Always check after implementation:

- [ ] Did you update with the edit tool when completing the task?
- [ ] Did you check the progress in tasklist.md?
- [ ] Is it in a state where the user can understand the progress?

## Effects of This Skill

When this skill is used correctly:

- ✅ tasklist.md always reflects the latest progress
- ✅ The user can grasp progress at a glance
- ✅ Divergence between the document and the implementation disappears
- ✅ Retrospectives become easy, leading to improvements next time
- ✅ A record valuable as project history remains

## Important Reminder

🚨 **The most important role of this skill is to reliably manage the progress of tasklist.md.**

- todowrite is a volatile note (not visible to the user)
- **tasklist.md is the persistent document (the user sees it)**

During implementation, always ask yourself, "When the user looks at tasklist.md, can they understand the progress?"
