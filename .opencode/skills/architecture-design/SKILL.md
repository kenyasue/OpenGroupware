---
name: architecture-design
description: A detailed guide and template for creating architecture design documents. Use only when designing architecture.
---

# Architecture Design Skill

This skill is a detailed guide for creating high-quality architecture design documents.

## Prerequisites

Before starting architecture design, check the following:

### Required Documents

1. `docs/product-requirements.md` (PRD)
2. `docs/functional-design.md` (functional design document)

Architecture design defines the system structure and technology stack
needed to technically realize the PRD's requirements and functional design.

## Priority of Existing Documents

**Important**: If an existing architecture design document is present at `docs/architecture.md`,
follow this priority order:

1. **The existing architecture design document (`docs/architecture.md`)** - highest priority
   - It documents project-specific technology choices and design
   - It takes precedence over this skill's guide

2. **This skill's guide** - reference material
   - General-purpose templates and examples
   - Use when there is no existing design document, or as a supplement

**When creating new**: Refer to this skill's template and guide
**When updating**: Update while preserving the structure and content of the existing design document

## Output Destination

Save the architecture design document you create to:

```
docs/architecture.md
```

## Referencing the Template

When creating an architecture design document, use the template while referring to the following guide:
- Guide: ./guide.md
- Template: ./template.md
