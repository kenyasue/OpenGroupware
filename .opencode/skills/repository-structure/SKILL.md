---
name: repository-structure
description: A detailed guide and template for creating a repository structure definition document. Use only when defining the repository structure.
---

# Repository Structure Definition Skill

This skill is a detailed guide for defining a clear and maintainable repository structure.

## Prerequisites

Before you begin defining the repository structure, confirm the following:

### Required documents

1. `docs/product-requirements.md` (PRD)
2. `docs/functional-design.md` (Functional Design Document)
3. `docs/architecture.md` (Architecture Design Document)

The repository structure defines a concrete directory layout that reflects the technology stack and system composition determined during architecture design.

## Priority of existing documents

**Important**: If an existing repository structure definition document is present at `docs/repository-structure.md`, follow the priority order below:

1. **Existing repository structure definition document (`docs/repository-structure.md`)** - Highest priority
   - Contains the project-specific directory structure
   - Takes precedence over this skill's guide

2. **This skill's guide** - Reference material
   - Generic templates and examples
   - Use when there is no existing definition document, or as a supplement

**When creating from scratch**: Refer to this skill's template and guide
**When updating**: Update while preserving the structure and content of the existing definition document

## Output destination

Save the repository structure definition document you create to the following location:

```
docs/repository-structure.md
```

## Template reference

When creating the repository structure definition document, use the following template: ./template.md

## Detailed guide

For a more detailed creation guide, refer to the following file: ./guide.md
