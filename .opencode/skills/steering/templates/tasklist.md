# Task List

## 🚨 Principle of Fully Completing Tasks

**Keep working until all tasks in this file are complete**

### Mandatory Rules
- **Make every task `[x]`**
- "Planned as a separate task due to time constraints" is forbidden
- "Postponed because the implementation is too complex" is forbidden
- Do not finish work while leaving incomplete tasks (`[ ]`)

### Plan Only Tasks That Can Be Implemented
- At the planning stage, list only "tasks that can be implemented"
- Do not include "tasks that might be done in the future"
- Do not include "tasks under consideration"

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

## Phase 1: {Phase name}

- [ ] {Task 1}
  - [ ] {Subtask 1-1}
  - [ ] {Subtask 1-2}

- [ ] {Task 2}
  - [ ] {Subtask 2-1}
  - [ ] {Subtask 2-2}

## Phase 2: {Phase name}

- [ ] {Task 1}
  - [ ] {Subtask 1-1}
  - [ ] {Subtask 1-2}

- [ ] {Task 2}

## Phase 3: Quality Check and Fixes

- [ ] Confirm that all tests pass
  - [ ] `npm test`
- [ ] Confirm that there are no lint errors
  - [ ] `npm run lint`
- [ ] Confirm that there are no type errors
  - [ ] `npm run typecheck`
- [ ] Confirm that the build succeeds
  - [ ] `npm run build`

## Phase 4: Documentation Updates

- [ ] Update README.md (as needed)
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
