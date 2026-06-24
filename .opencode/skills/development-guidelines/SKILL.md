---
name: development-guidelines
description: A comprehensive guide and template for establishing a unified development process and coding conventions across the team. Use when creating development guidelines and when implementing code.
---

# Development Guidelines Skill

Covers the two elements needed for team development:
1. Coding conventions for implementation (implementation-guide.md)
2. Standardization of the development process (process-guide.md)

## Prerequisites

Before starting to create development guidelines, check the following:

### Recommended Documents

1. `docs/architecture.md` (architecture design document) - confirm the technology stack
2. `docs/repository-structure.md` (repository structure) - confirm the directory structure

The development guidelines define concrete coding conventions and a development process
based on the project's technology stack and directory structure.

## Priority of Existing Documents

**Important**: If existing development guidelines are present at `docs/development-guidelines.md`,
follow this priority order:

1. **The existing development guidelines (`docs/development-guidelines.md`)** - highest priority
   - They document project-specific conventions and processes
   - They take precedence over this skill's guide

2. **This skill's guide** - reference material
   - ./guides/implementation.md: general-purpose coding conventions
   - ./guides/process.md: general-purpose development process
   - Use when there are no existing guidelines, or as a supplement

**When creating new**: Refer to this skill's guides and template
**When updating**: Update while preserving the structure and content of the existing guidelines

## Output Destination

Save the development guidelines you create to:

```
docs/development-guidelines.md
```

## Quick Reference

### When Implementing Code
Rules and conventions for code implementation: ./guides/implementation.md

Contents:
- TypeScript/JavaScript conventions
- Type definitions and naming conventions
- Function design and error handling
- Comment conventions
- Security and performance
- Test code implementation
- Refactoring techniques

### When Referencing/Defining the Development Process
Git workflow, test strategy, code review: ./guides/process.md

Contents:
- Basic principles (the importance of concrete examples, explaining rationale)
- Git workflow rules (Git Flow branching strategy)
- Commit messages and the PR process
- Test strategy (pyramid and coverage)
- The code review process
- Quality automation

### Template
When creating development guidelines: ./template.md


## Guide by Use Case

### When Developing New Code
1. Confirm naming conventions and coding standards in ./guides/implementation.md
2. Confirm the branching strategy and PR handling in ./guides/process.md
3. Write tests first (TDD)

### During Code Review
- Refer to "The Code Review Process" in ./guides/process.md
- Check for convention violations against ./guides/implementation.md

### When Designing Tests
- "Test Strategy" in ./guides/process.md (pyramid, coverage)
- "Test Code" in ./guides/implementation.md (implementation patterns)

### When Preparing a Release
- "Git Workflow Rules" in ./guides/process.md (policy for merging into main)
- Confirm that commit messages follow Conventional Commits

## Checklist

- [ ] Coding conventions are defined with concrete examples
- [ ] Naming conventions are clear (per language and project-specific)
- [ ] An error handling policy is defined
- [ ] A branching strategy is decided (Git Flow recommended)
- [ ] Commit message conventions are clear
- [ ] A PR template is prepared
- [ ] Test types and coverage targets are set
- [ ] A code review process is defined
- [ ] A CI/CD pipeline is established
