---
name: prd-writing
description: A detailed guide and template for creating a Product Requirements Document (PRD). Use only when creating a PRD.
---

# PRD Writing Skill

This skill is a detailed guide for creating a high-quality Product Requirements Document (PRD).

## Prerequisites

Before you begin creating a PRD, the following must be complete:

### The idea has been refined through brainstorming

The user must have completed refining the product idea through dialogue with opencode.

### docs/ideas/initial-requirements.md has been created

**Important**: The brainstorming content must be saved by the user in the following file:

**File path**: `docs/ideas/initial-requirements.md`

This file must include the following content:
- The basic idea of the product
- The problem to be solved
- An overview of the target users
- The main features to be implemented
- The scope of the MVP

When creating the PRD, refer to the content of this file to add detail.

## Priority of existing documents

**Important**: If an existing PRD is present at `docs/product-requirements.md`,
follow the priority order below:

1. **Existing PRD (`docs/product-requirements.md`)** - Highest priority
   - Contains project-specific requirements
   - Takes precedence over this skill's guide

2. **This skill's guide** - Reference material
   - Generic templates and examples
   - Use when there is no existing PRD, or as a supplement

**When creating from scratch**: Refer to this skill's template and guide
**When updating**: Update while preserving the structure and content of the existing PRD

## Output destination

Save the PRD you create to the following location:

```
docs/product-requirements.md
```

## Template reference

When creating the PRD, use the following template: ./template.md

## PRD creation process

### 1. Review initial-requirements.md

First, review the initial requirements specification created by the user:

Read `docs/ideas/initial-requirements.md`

### 2. Generate the PRD draft

Based on the content of initial-requirements.md, generate the PRD following the template.

### 3. Review and improve the PRD

Review the generated PRD from the following perspectives:

#### Review perspectives

1. Is the product vision clear?
2. Are the target users specific?
3. Are the success metrics measurable?
4. Are the functional requirements detailed to an implementable level?
5. Are the non-functional requirements comprehensive?

#### Criteria for evaluating review results

Evaluate the generated PRD in the following format:

**✅ Strengths**
- A clear vision is described in a measurable and specific way
- The functional specifications are detailed to an implementation level
- KPIs are defined with quantitative metrics

**⚠️ Points that need improvement**

Ambiguity in functional requirements:
- Problem: There are areas where the concrete implementation specification is unclear
- Recommendation: Clearly state specific command specifications and error handling

Measurement method for success metrics:
- Problem: The measurement method is unclear
- Recommendation: Clearly state the measurement method and considerations for privacy

### 4. Improvement after review

Review the issues raised in the review one by one, and improve the areas that need more detail:

1. Review the raised issues one by one
2. Improve the areas that need more detail
3. After improving, conduct the review again
4. Repeat until there are no more issues

**Cautions**:
- Do not take the AI's review at face value; the final judgment must always be made by a human
- Clearly specify the review perspectives
- Have a human verify the validity of the improvement proposals

## Key points for creating a PRD

### 1. Specificity and measurability

Every requirement must be specific and measurable.

**Bad examples**:
- The system needs to be fast
- Users feel it is easy to use

**Good examples**:
- Command execution time: within 100ms (on an average PC environment)
- A new user can learn the basic operations within 5 minutes (measured by usability testing)

### 2. User-centered design

Every feature must solve a clear user problem.

**User story format**:
```
As a [user], I want [feature] so that [goal]
```

**Example**:
```
As a developer, I want a CLI-based task management tool
so that I can manage tasks without leaving the terminal
```

### 3. Clarifying priorities

Set a priority for every feature:

- **P0 (Required)**: Features to include in the MVP (Minimum Viable Product). Without these, the product does not stand as a product
- **P1 (Important)**: Features that should be added immediately after the initial release
- **P2 (Nice to have)**: Features to consider adding in the future

## Details of the main PRD sections

### 1. Product overview

#### Components

1. **Name**: Product name and subtitle
2. **Product concept**: Three main concepts
3. **Product vision**: The world you aim for, in 3-5 sentences
4. **Purpose**: A list of specific purposes

#### Example

```markdown
### Name
**Devtask** - A task management CLI tool for developers

### Product concept
- Task management that is complete within the CLI: Complete all operations without leaving the terminal
- Automatic priority estimation: Automatically estimate priority from a task's due date, creation time, status change history, and so on
- A simple and fast operating feel: Complete operations with minimal keystrokes, with instant response

### Product vision
Provide a CLI tool that lets developers efficiently manage tasks without leaving the terminal.
Specialized for command-line operation, it delivers lightweight, fast task management that does not interrupt the development flow.
With automatic priority estimation, developers can focus on essential work.
```

**Include a specific value proposition**

Bad example:
```
Build a convenient task management tool
```

Good example:
```
A CLI tool that lets developers manage tasks without leaving the terminal.

Value provided:
- Reduced context switching (zero GUI ↔ terminal switching)
- Improved work efficiency (no mouse operation, averaging a 30% time reduction)
- Integration with automation (can be embedded in shell scripts)
```

### 2. Target users (personas)

#### Required elements

1. **Basic attributes**: Age, occupation, years of experience
2. **Technology stack**: Tools and languages in use
3. **Current problems**: Specific pain points
4. **Expected solution**: What they want to become
5. **A typical daily workflow**

#### Example

```markdown
### Primary persona: Taro Tanaka (29, full-stack engineer)
- Freelancer running 3-5 projects in parallel
- Vim/Emacs + terminal environment
- Does not want to spend time on task management
- Prefers Markdown, Git, and CLI tools
```

### 3. Success metrics (KPIs)

#### SMART principles

- **S**pecific: Clear about what is being measured
- **M**easurable: Can be measured numerically
- **A**chievable: A realistic target
- **R**elevant: Related to business goals
- **T**ime-bound: Sets a deadline for achievement

#### Example

```markdown
### Primary KPIs
- Daily active users (DAU): 100 (in 3 months)
- Task completion rate: 70% or higher
- Average number of commands executed per day: 10 or more
```

### 4. Functional requirements

#### Core features (MVP)

Include the following for each feature:
- User story
- Acceptance criteria (in checklist form)
- Priority (P0/P1/P2)

**Format**:
```markdown
### [Feature name]

User story:
As a [user], I want [feature] so that [goal]

Acceptance criteria:
- [ ] Criterion 1 (measurable)
- [ ] Criterion 2 (measurable)

Priority: P0 (Required) / P1 (Important) / P2 (Nice to have)
```

#### CLI interface

For a CLI tool, include specific command examples:

```bash
# Basic operations
devtask add "Task name" --due 2025-01-15 --priority high
devtask list
devtask next  # Show the task to do now
devtask done <task-id>
devtask show <task-id>
```

### 5. Non-functional requirements

Describe them in a measurable form:

**Example**:
```markdown
### Performance
- Command execution time: within 100ms (on an average PC environment)
- Task list display: within 1 second for up to 1000 items

### Usability
- A new user can learn the basic operations within 5 minutes
- All features can be checked via the help command

### Reliability
- Zero data loss (automatic backup)
- Rollback on error
```

## Quality standards and checkpoints

To ensure the quality of the PRD, confirm the following checkpoints:

### Vision and goals
- [ ] Is the product vision clear and measurable?
- [ ] Is the specific value provided defined?
- [ ] Is the target market clear?

### Target users
- [ ] Is the persona specifically defined?
- [ ] Are the current problems and expected solution clear?
- [ ] Are the technology stack and daily workflow described?

### Success metrics
- [ ] Are KPIs defined following the SMART principles?
- [ ] Is the measurement method clear?
- [ ] Is an achievement deadline set?

### Functional requirements
- [ ] Is every feature described in user story form?
- [ ] Are acceptance criteria defined in a measurable form?
- [ ] Is the priority (P0/P1/P2) clearly set?

### Non-functional requirements
- [ ] Are performance standards defined with specific numbers?
- [ ] Are usability standards measurable?
- [ ] Are reliability and security requirements clear?

## Summary

Keys to success in creating a PRD:

1. **Create based on initial-requirements.md**: Refer to the brainstorming content created by the user
2. **Specificity and measurability**: Make every requirement clear
3. **User-centered**: Only features that solve user problems
4. **Clarifying priorities**: Classify by P0/P1/P2
5. **Review and improvement**: Self-review and final human judgment
6. **Applying the SMART principles**: Especially important when defining KPIs
