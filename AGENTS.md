# Project Memory

## Technology Stack

- Development environment: devcontainer
- Node.js v24.11.0
- TypeScript 5.x
- Package manager: npm

## Basic Principles of Spec-Driven Development

### Basic Flow

1. **Document creation**: Define "what to build" in persistent documents (`docs/`)
2. **Work planning**: Plan "what to do this time" in steering files (`.steering/`)
3. **Implementation**: Implement according to tasklist.md and update progress as you go
4. **Verification**: Testing and operation checks
5. **Update**: Update documents as needed

### Important Rules

#### When Creating Documents

**Create one file at a time, and always obtain the user's approval before moving on to the next.**

When waiting for approval, communicate clearly:
```
"The creation of [document name] is complete. Please review the content.
Once you approve, I will proceed to the next document."
```

#### Checks Before Implementation

Before starting a new implementation, always check the following:

1. Read AGENTS.md
2. Read the related persistent documents (`docs/`)
3. Search for existing similar implementations with Grep
4. Understand existing patterns before starting implementation

#### Steering File Management

Create `.steering/[YYYYMMDD]-[task-name]/` for each piece of work:

- `requirements.md`: The requirements for this work
- `design.md`: The implementation approach
- `tasklist.md`: A concrete task list

Naming convention: `20250115-add-user-profile` format

#### Steering File Management

**Use the `steering` skill when planning work, implementing, and verifying.**

- **When planning work**: Mode 1 (creating steering files) via the steering skill
- **When implementing**: Mode 2 (implementation and tasklist.md update management) via the steering skill
- **When verifying**: Mode 3 (retrospective) via the steering skill

Detailed procedures and update-management rules are defined within the steering skill.

## Directory Structure

### Persistent Documents (`docs/`)

Define "what to build" and "how to build it" for the entire application:

#### Drafts and Ideas (`docs/ideas/`)
- Outputs of brainstorming and ideation
- Technical research notes
- Free-form (minimal structure)
- Automatically loaded when `/setup-project` is run

#### Official Documents
- **product-requirements.md** - Product requirements document
- **functional-design.md** - Functional design document
- **architecture.md** - Technical specification
- **repository-structure.md** - Repository structure definition document
- **development-guidelines.md** - Development guidelines
- **glossary.md** - Ubiquitous language definitions

### Work-Unit Documents (`.steering/`)

Define "what to do this time" for a specific development task:

- `requirements.md`: The requirements for this work
- `design.md`: The design of the changes
- `tasklist.md`: The task list

### opencode Configuration (`.opencode/`)

- `.opencode/agent/` - Subagent definitions (doc-reviewer, implementation-validator)
- `.opencode/command/` - Slash commands (setup-project, add-feature, review-docs)
- `.opencode/skills/` - Task-specific skills (prd-writing, functional-design, architecture-design, repository-structure, development-guidelines, glossary-creation, steering)

## Development Process

### Initial Setup

1. Use this template
2. Create persistent documents with `/setup-project` (interactively creating six)
3. Implement features with `/add-feature [feature]`

### Day-to-Day Usage

**Basically, just make requests through normal conversation:**

```bash
# Editing documents
> Please add a new feature to the PRD
> Review the performance requirements in architecture.md
> Add a new domain term to glossary.md

# Adding features (use commands for the standard flow)
> /add-feature edit user profile

# Detailed review (when a detailed report is needed)
> /review-docs docs/product-requirements.md
```

**Key point**: You do not need to be conscious of the details of spec-driven development. opencode will determine and load the appropriate skill.

## Principles of Document Management

### Persistent Documents (`docs/`)

- Describe the fundamental design
- Not updated frequently
- The "north star" for the entire project

### Work-Unit Documents (`.steering/`)

- Specialized for a specific task
- Created anew for each piece of work
- Retained as history
