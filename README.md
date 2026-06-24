# opencode Spec-Driven Development Boilerplate

A spec-driven development boilerplate for [opencode](https://opencode.ai), converted from the
[Claude Code boilerplate](https://git.yasue.org/ken/claudecode-boilerplate) that accompanies the book
*"Practical Claude Code Introduction."*

It gives opencode a structured workflow for turning ideas into production code through persistent design
documents, per-task steering files, AI skills, subagents, and slash commands.

---

## Table of Contents

- [What Is Spec-Driven Development?](#what-is-spec-driven-development)
- [Conversion Summary (Claude Code → opencode)](#conversion-summary-claude-code--opencode)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Directory Structure](#directory-structure)
- [Configuration Overview](#configuration-overview)
- [Usage Workflow](#usage-workflow)
- [Commands Reference](#commands-reference)
- [Skills Reference](#skills-reference)
- [Agents Reference](#agents-reference)
- [Customizing the Boilerplate](#customizing-the-boilerplate)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## What Is Spec-Driven Development?

Spec-driven development separates **"what to build"** from **"how to build it"**:

1. **Persistent documents** (`docs/`) — the north-star design (PRD, functional design, architecture, etc.)
2. **Steering files** (`.steering/`) — per-task plans created fresh for each piece of work
3. **Implementation** — the agent follows `tasklist.md`, updating progress as it goes
4. **Verification** — tests, lint, typecheck, and a retrospective

opencode loads the right skill automatically based on what you're doing, so you don't have to think about
the process — just describe what you want.

---

## Conversion Summary (Claude Code → opencode)

| Claude Code | opencode | Notes |
|---|---|---|
| `CLAUDE.md` | `AGENTS.md` | Referenced via `instructions` in `opencode.json` |
| `.claude/settings.json` | `opencode.json` | Permissions converted to opencode's `permission` schema |
| `.claude/agents/*.md` | `.opencode/agent/*.md` | Added `mode: subagent`; `model: sonnet` removed (inherits default) |
| `.claude/commands/*.md` | `.opencode/command/*.md` | Tool-call syntax (`Bash()`, `Grep()`, `Skill()`) converted to natural instructions; `$ARGUMENTS` added |
| `.claude/skills/*/SKILL.md` | `.opencode/skills/*/SKILL.md` | `allowed-tools` frontmatter removed (not an opencode field) |
| `Skill('steering')` calls | Auto-loaded by description | opencode surfaces skills via `description` matching |
| `TodoWrite` / `Edit` tool refs | `todowrite` / `edit` | Lowercased to match opencode tool names |
| Claude Code devcontainer feature | `curl … opencode.ai/install` | Replaced Anthropic feature with opencode install script |

All skill templates and guides were preserved verbatim except for `.claude/` path references and
"Claude Code" mentions, which were updated to `.opencode/` and "opencode" respectively.

---

## Prerequisites

- **Node.js** v18+ (v24.11.0 recommended)
- **npm**
- **opencode** — install with:
  ```bash
  curl -fsSL https://opencode.ai/install | bash
  ```
  See <https://opencode.ai/docs> for alternatives (npm, Homebrew, etc.)
- **Docker** (only if using the Dev Container)

---

## Quick Start

### Option A — Dev Container (recommended)

1. Open this folder in **VS Code**.
2. When prompted, click **"Reopen in Container"** (or run the command
   *Dev Containers: Reopen in Container*).
3. The container automatically:
   - Installs Node.js LTS
   - Runs `npm install`
   - Installs opencode
4. Open a terminal and start opencode:
   ```bash
   opencode
   ```

### Option B — Manual setup

```bash
# 1. Install dependencies
npm install

# 2. Set up Git hooks
npm run prepare

# 3. Start opencode
opencode
```

---

## Directory Structure

```
.
├── opencode.json              # opencode config (permissions, instructions)
├── AGENTS.md                  # Project instructions (loaded into every session)
├── package.json               # Node.js project + scripts
├── tsconfig.json              # TypeScript config
├── eslint.config.js           # ESLint flat config
├── vitest.config.ts           # Vitest config (80% coverage threshold)
├── .prettierrc / .prettierignore
├── .gitignore
├── .husky/pre-commit          # Runs lint-staged + typecheck before commit
├── .devcontainer/devcontainer.json
├── prompt.md                  # Example MVP prompt
│
├── src/                       # Source code
│   ├── example.ts
│   └── example.test.ts
│
├── docs/                      # Persistent design documents (created by /setup-project)
│   └── ideas/
│       └── initial-requirements.md   # Brainstorming notes (pre-PRD)
│
├── .steering/                 # Per-task steering files (created by /add-feature)
│   └── .gitkeep
│
└── .opencode/                 # opencode configuration
    ├── agent/                 # Subagent definitions
    │   ├── doc-reviewer.md
    │   └── implementation-validator.md
    ├── command/               # Slash commands
    │   ├── setup-project.md
    │   ├── add-feature.md
    │   └── review-docs.md
    └── skills/                # Task-specific skills
        ├── prd-writing/           (SKILL.md + template.md)
        ├── functional-design/     (SKILL.md + template.md + guide.md)
        ├── architecture-design/   (SKILL.md + template.md + guide.md)
        ├── repository-structure/  (SKILL.md + template.md + guide.md)
        ├── development-guidelines/(SKILL.md + template.md + guides/)
        ├── glossary-creation/     (SKILL.md + template.md + guide.md)
        └── steering/              (SKILL.md + templates/)
```

---

## Configuration Overview

### `opencode.json`

The main configuration file. Key sections:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": ["AGENTS.md"],     // Loaded into every session
  "permission": {
    "skill": "allow",                // Skills are auto-available
    "bash": {                        // Common dev commands pre-approved
      "*": "ask",
      "npm *": "allow",
      "npx *": "allow",
      "git *": "allow",
      // ...
    }
  }
}
```

> **After editing `opencode.json`, quit and restart opencode** — config is loaded once at startup.

### `AGENTS.md`

The project memory file. opencode reads it on every session. It defines:
- The technology stack
- The spec-driven development principles
- The directory structure
- The development process and workflow

### Agents (`.opencode/agent/`)

Subagents run in isolated contexts via the `task` tool. They don't consume the main session's context.

### Commands (`.opencode/command/`)

Slash commands invoked in the opencode TUI with `/command-name`. Each command is a prompt template
that opencode executes.

### Skills (`.opencode/skills/`)

Skills are loaded automatically based on their `description` field. You don't invoke them by name —
opencode surfaces the right skill when the task matches.

---

## Usage Workflow

### 1. Initial project setup

Run the setup command to create all six persistent design documents interactively:

```
> /setup-project
```

This creates (one at a time, with your approval):
1. `docs/product-requirements.md` (PRD)
2. `docs/functional-design.md`
3. `docs/architecture.md`
4. `docs/repository-structure.md`
5. `docs/development-guidelines.md`
6. `docs/glossary.md`

The PRD is based on the brainstorming notes in `docs/ideas/initial-requirements.md`. Edit that file
first if you have your own idea, or replace it.

### 2. Add a feature

```
> /add-feature User authentication
```

This fully autonomous workflow:
1. Creates `.steering/[YYYYMMDD]-[feature-name]/` with `requirements.md`, `design.md`, `tasklist.md`
2. Generates the steering files (planning mode of the steering skill)
3. Implements every task in `tasklist.md`, marking each `[ ]` → `[x]` as it goes
4. Launches the `implementation-validator` subagent for quality review
5. Runs `npm test`, `npm run lint`, `npm run typecheck`
6. Records a retrospective in `tasklist.md`

### 3. Review a document

```
> /review-docs docs/product-requirements.md
```

Launches the `doc-reviewer` subagent to evaluate the document from five perspectives:
completeness, clarity, consistency, implementability, and measurability.

### 4. Day-to-day editing

You don't always need a command — just ask in normal conversation:

```
> Add a new feature to the PRD
> Review the performance requirements in architecture.md
> Add a new domain term to glossary.md
```

opencode loads the appropriate skill automatically.

---

## Commands Reference

| Command | Description | Example |
|---|---|---|
| `/setup-project` | Create the six persistent documents interactively | `/setup-project` |
| `/add-feature` | Implement a feature end-to-end (autonomous) | `/add-feature User profile editing` |
| `/review-docs` | Detailed document review via subagent | `/review-docs docs/architecture.md` |

---

## Skills Reference

| Skill | When it loads | Output |
|---|---|---|
| `prd-writing` | Creating a Product Requirements Document | `docs/product-requirements.md` |
| `functional-design` | Creating a functional design document | `docs/functional-design.md` |
| `architecture-design` | Designing the system architecture | `docs/architecture.md` |
| `repository-structure` | Defining the directory layout | `docs/repository-structure.md` |
| `development-guidelines` | Creating coding conventions / implementing code | `docs/development-guidelines.md` |
| `glossary-creation` | Creating a project glossary | `docs/glossary.md` |
| `steering` | Planning, implementing, and retrospecting on a task | `.steering/[date]-[name]/` files |

Each skill folder contains a `SKILL.md` (instructions) plus `template.md` and/or `guide.md` (reference
material the skill points to).

---

## Agents Reference

| Agent | Mode | Purpose |
|---|---|---|
| `doc-reviewer` | subagent | Reviews document quality across 5 dimensions; outputs a scored report with prioritized improvements |
| `implementation-validator` | subagent | Validates code against the spec; checks quality, test coverage, security, performance; runs lint/test/typecheck |

Agents are launched via the `task` tool (e.g., by the `/add-feature` and `/review-docs` commands).
They run in an isolated context window.

---

## Customizing the Boilerplate

### Change the model

Agents inherit the default model from `opencode.json`. To pin a specific model for a subagent, add
`model` to its frontmatter:

```yaml
---
description: ...
mode: subagent
model: anthropic/claude-sonnet-4-6
---
```

Or set a global default in `opencode.json`:

```jsonc
{
  "model": "anthropic/claude-sonnet-4-6"
}
```

> Model IDs use the `provider/model-id` format. See <https://opencode.ai/config.json> for the full schema.

### Adjust permissions

Edit the `permission` block in `opencode.json`. For example, to allow all bash commands:

```jsonc
{
  "permission": { "bash": "allow" }
}
```

### Add a new skill

1. Create `.opencode/skills/my-skill/SKILL.md`
2. Add frontmatter with `name` and `description` (the description controls when opencode loads it)
3. Add any companion `template.md` or `guide.md` files
4. Restart opencode

### Add a new command

1. Create `.opencode/command/my-command.md`
2. Add `description` frontmatter + a prompt body (use `$ARGUMENTS` for user input)
3. Restart opencode

### Add a new agent

1. Create `.opencode/agent/my-agent.md`
2. Add `description` and `mode: subagent` frontmatter + a prompt body
3. Restart opencode

---

## Troubleshooting

### opencode won't start after editing config

opencode validates `opencode.json` strictly and refuses to start on invalid fields. To recover:

```bash
# Skip the project config and start from globals only
OPENCODE_DISABLE_PROJECT_CONFIG=1 opencode
```

Then fix the broken file and restart normally.

### Skills not loading

- Ensure each `SKILL.md` has a `description` in its frontmatter — skills without one are filtered out.
- Ensure the folder name matches the `name` field.
- Restart opencode after adding or changing skills.

### Commands not appearing

- Command files must be directly inside `.opencode/command/` (not in subdirectories).
- Restart opencode after adding commands.

### Dev Container: `opencode` command not found

The install script adds opencode to `~/.opencode/bin/` and updates your shell profile. If the command
isn't found in a new terminal:

```bash
export PATH="$HOME/.opencode/bin:$PATH"
opencode
```

Or create a permanent symlink:

```bash
sudo ln -sf "$HOME/.opencode/bin/opencode" /usr/local/bin/opencode
```

---

## License

MIT — see [LICENSE](LICENSE).
