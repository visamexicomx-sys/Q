# CLAUDE.md — Project: skills CLI + ECC Harness

## Project Overview

This repository is the **`skills` CLI** — a command-line tool for installing AI agent skills from GitHub repos, local paths, and URLs into coding agents (Claude Code, Cursor, Codex, OpenCode, and 37+ more).

**Stack:** TypeScript, Node.js, pnpm  
**Entry point:** `src/cli.ts`  
**Tests:** `tests/` + `src/*.test.ts`

---

## ECC Agent Harness — Installed Components

ECC (Everything Claude Code) has been fully installed (`--profile full`) into `~/.claude/`.  
**Source:** https://github.com/affaan-m/ecc  
**Install state:** `~/.claude/ecc/install-state.json`

### What Was Installed

| Component | Count | Location |
|-----------|-------|----------|
| Skills    | 197   | `~/.claude/skills/ecc/` |
| Agents    | 64    | `~/.claude/agents/` |
| Commands  | 84    | `~/.claude/commands/` |
| Hooks     | 3 configs | `~/.claude/hooks/` |
| Rules     | 20 dirs | `~/.claude/rules/ecc/` |

---

## Skills — `/ecc:<skill-name>`

Skills are workflow definitions that guide Claude through complex multi-step tasks.  
**Invoke:** `/ecc:<skill-name>` or via the Skill tool.

### Development Workflow Skills

| Skill | When to Use |
|-------|-------------|
| `tdd-workflow` | Write tests first, then code. Enforces 80%+ coverage. |
| `plan` | Plan before coding. Waits for user confirmation. |
| `prp-plan` | Deep codebase analysis → implementation plan. |
| `prp-implement` | Execute a plan with validation loops. |
| `feature-dev` | End-to-end guided feature development. |
| `orch-add-feature` | Orchestrate new feature: research → plan → TDD → review → commit. |
| `orch-fix-defect` | Fix a bug: reproduce as test → fix → review → commit. |
| `orch-refine-code` | Behavior-preserving refactor with green tests. |
| `orch-change-feature` | Alter existing feature to new desired behavior. |
| `orch-build-mvp` | Bootstrap a working MVP from a spec/design doc. |

### Code Quality Skills

| Skill | When to Use |
|-------|-------------|
| `security-review` | Auth, user input, secrets, API endpoints, payments. |
| `security-scan` | Run automated vulnerability audit. |
| `code-tour` | Explain a codebase to a new developer. |
| `refactor-clean` | Remove dead code safely with verification. |
| `coding-standards` | Enforce language-specific code standards. |
| `error-handling` | Implement robust error handling patterns. |
| `verification-loop` | Iterative verification with self-correction. |
| `e2e-testing` | End-to-end test setup and execution. |

### TypeScript / Node.js Skills

| Skill | When to Use |
|-------|-------------|
| `backend-patterns` | Express/Fastify API patterns. |
| `frontend-patterns` | React/Vue/Angular component patterns. |
| `react-patterns` | React-specific hooks, context, performance. |
| `react-testing` | React Testing Library patterns. |
| `react-performance` | React optimization techniques. |
| `nodejs-keccak256` | Node.js crypto/hashing patterns. |
| `database-migrations` | Safe DB migration strategies. |
| `mcp-server-patterns` | Build MCP (Model Context Protocol) servers. |

### Research & AI Skills

| Skill | When to Use |
|-------|-------------|
| `deep-research` | Fan-out web searches with citation. |
| `search-first` | Research before coding. |
| `prompt-optimizer` | Improve LLM prompts. |
| `cost-aware-llm-pipeline` | Optimize LLM API costs. |
| `ai-first-engineering` | Build AI-first applications. |
| `eval-harness` | Evaluation framework for AI systems. |

### Agentic Patterns Skills

| Skill | When to Use |
|-------|-------------|
| `agentic-engineering` | Build autonomous agent systems. |
| `autonomous-loops` | Design safe agent feedback loops. |
| `team-agent-orchestration` | Coordinate multiple AI agents. |
| `blueprint` | Architecture blueprint for agent systems. |
| `agent-architecture-audit` | Audit existing agent architectures. |
| `continuous-agent-loop` | Implement continuous processing loops. |
| `nanoclaw-repl` | Lightweight REPL for agent experimentation. |

### Infrastructure Skills

| Skill | When to Use |
|-------|-------------|
| `deployment-patterns` | CI/CD and deployment strategies. |
| `docker-patterns` | Dockerfile and compose patterns. |
| `github-ops` | GitHub Actions, PRs, issues automation. |
| `terminal-ops` | Shell scripting and terminal automation. |
| `dmux-workflows` | tmux-based development workflows. |

### Specialized Skills

| Skill | When to Use |
|-------|-------------|
| `visa-doc-translate` | Visa/immigration document processing. |
| `security-bounty-hunter` | Security vulnerability research. |
| `content-engine` | Content generation pipelines. |
| `market-research` | Competitive and market analysis. |
| `investor-materials` | Pitch decks and investor docs. |

### Multi-Model Workflow Skills

| Skill | When to Use |
|-------|-------------|
| `multi-plan` | Create implementation plan using multiple models. |
| `multi-execute` | Execute plan, Claude handles all file writes. |
| `multi-backend` | Backend-focused multi-model workflow. |
| `multi-frontend` | Frontend-focused multi-model workflow. |
| `multi-workflow` | Full multi-model dev cycle. |
| `model-route` | Pick the right model tier for a task. |

---

## Agents — Specialized Subagents

Agents are spawned automatically or via the Agent tool.  
**Location:** `~/.claude/agents/*.md`

### Core Development Agents

| Agent | Role |
|-------|------|
| `planner` | Complex feature planning (uses Opus). |
| `code-reviewer` | Post-change code quality review. |
| `architect` | System architecture design. |
| `code-architect` | Code-level architecture decisions. |
| `security-reviewer` | Security audit. |
| `performance-optimizer` | Performance bottleneck analysis. |
| `refactor-cleaner` | Dead code and cleanup. |

### Language-Specific Reviewers

| Agent | Language |
|-------|----------|
| `typescript-reviewer` | TypeScript |
| `python-reviewer` | Python |
| `rust-reviewer` | Rust |
| `go-reviewer` | Go |
| `java-reviewer` | Java |
| `kotlin-reviewer` | Kotlin |
| `swift-reviewer` | Swift |
| `react-reviewer` | React/JSX |
| `django-reviewer` | Django |
| `fastapi-reviewer` | FastAPI |
| `cpp-reviewer` | C++ |
| `csharp-reviewer` | C# |
| `flutter-reviewer` | Flutter/Dart |
| `php-reviewer` | PHP |

### Build Error Resolvers

| Agent | Fixes |
|-------|-------|
| `build-error-resolver` | Generic build errors. |
| `react-build-resolver` | React/webpack errors. |
| `go-build-resolver` | Go compiler errors. |
| `rust-build-resolver` | Rust compiler errors. |
| `java-build-resolver` | Java/Maven/Gradle errors. |
| `kotlin-build-resolver` | Kotlin/Gradle errors. |
| `swift-build-resolver` | Xcode/SPM errors. |
| `django-build-resolver` | Django startup errors. |
| `cpp-build-resolver` | C++/CMake errors. |

### Operations Agents

| Agent | Role |
|-------|------|
| `chief-of-staff` | High-level task orchestration. |
| `loop-operator` | Manage autonomous loops. |
| `e2e-runner` | E2E test execution. |
| `pr-test-analyzer` | Analyze PR test failures. |
| `docs-lookup` | Documentation research. |
| `doc-updater` | Documentation updates. |
| `tdd-guide` | TDD enforcement agent. |
| `code-explorer` | Codebase exploration. |

### Specialized Agents

| Agent | Role |
|-------|------|
| `harness-optimizer` | ECC harness tuning. |
| `a11y-architect` | Accessibility auditing. |
| `seo-specialist` | SEO analysis. |
| `silent-failure-hunter` | Find hidden bugs and silent errors. |
| `type-design-analyzer` | TypeScript type system analysis. |
| `comment-analyzer` | Code comment quality. |
| `conversation-analyzer` | Analyze conversation patterns. |

---

## Commands — `/command-name`

Commands are legacy slash-command workflows.

### Planning & Development

| Command | Action |
|---------|--------|
| `/plan` | Plan implementation, wait for confirmation. |
| `/plan-prd` | Generate a problem-first PRD then plan. |
| `/feature-dev` | Guided feature development. |
| `/project-init` | Initialize ECC for a new project. |

### Build & Fix

| Command | Action |
|---------|--------|
| `/build-fix` | Auto-detect build system and fix errors. |
| `/react-build` | Fix React/webpack build errors. |
| `/go-build` | Fix Go build errors. |
| `/rust-build` | Fix Rust build errors. |
| `/kotlin-build` | Fix Kotlin/Gradle errors. |
| `/flutter-build` | Fix Flutter/Dart errors. |
| `/cpp-build` | Fix C++/CMake errors. |
| `/gradle-build` | Fix Gradle errors. |

### Code Review

| Command | Action |
|---------|--------|
| `/code-review` | Full code review of current changes. |
| `/python-review` | Python-specific review. |
| `/react-review` | React-specific review. |
| `/go-review` | Go-specific review. |
| `/rust-review` | Rust-specific review. |
| `/kotlin-review` | Kotlin-specific review. |
| `/flutter-review` | Flutter/Dart review. |
| `/fastapi-review` | FastAPI review. |
| `/cpp-review` | C++ review. |
| `/security-scan` | Security vulnerability scan. |

### Testing

| Command | Action |
|---------|--------|
| `/test-coverage` | Run tests and report coverage gaps. |
| `/react-test` | React testing workflow. |
| `/go-test` | Go TDD workflow. |
| `/rust-test` | Rust testing workflow. |
| `/kotlin-test` | Kotlin/Kotest workflow. |
| `/flutter-test` | Flutter test workflow. |
| `/cpp-test` | C++ GoogleTest workflow. |
| `/quality-gate` | Run ECC quality gate checks. |

### Git & PR

| Command | Action |
|---------|--------|
| `/pr` | Create GitHub PR from current branch. |
| `/prp-pr` | Create PR with full analysis. |
| `/prp-commit` | Smart commit with natural language targeting. |
| `/checkpoint` | Create verified workflow checkpoint. |
| `/save-session` | Save current session state. |
| `/resume-session` | Resume a saved session. |

### Orchestration

| Command | Action |
|---------|--------|
| `/orch-add-feature` | Full feature orchestration. |
| `/orch-fix-defect` | Full bug fix orchestration. |
| `/orch-refine-code` | Full refactor orchestration. |
| `/orch-change-feature` | Full feature change orchestration. |
| `/orch-build-mvp` | Full MVP build orchestration. |
| `/multi-plan` | Multi-model planning. |
| `/multi-execute` | Multi-model execution. |
| `/multi-workflow` | Full multi-model workflow. |
| `/gan-build` | Generator/evaluator build loop. |
| `/gan-design` | Generator/evaluator design loop. |

### Learning & Memory

| Command | Action |
|---------|--------|
| `/learn` | Extract patterns from session into skills. |
| `/learn-eval` | Self-evaluate and save skills to right scope. |
| `/instinct-status` | Show learned instincts. |
| `/instinct-export` | Export instincts to file. |
| `/instinct-import` | Import instincts from file/URL. |
| `/evolve` | Analyze and evolve instinct structures. |
| `/promote` | Promote project instincts to global. |
| `/prune` | Delete stale instincts. |

### ECC Management

| Command | Action |
|---------|--------|
| `/ecc-guide` | Browse ECC agents, skills, commands live. |
| `/harness-audit` | Run full repository harness audit. |
| `/hookify` | Create hooks from conversation analysis. |
| `/hookify-list` | List configured hooks. |
| `/hookify-configure` | Enable/disable hookify rules. |
| `/skill-create` | Create a new custom skill. |
| `/skill-health` | Check skill health and validity. |
| `/update-docs` | Update project documentation. |
| `/update-codemaps` | Update code navigation maps. |
| `/cost-report` | Generate Claude Code cost report. |
| `/model-route` | Get model recommendation for a task. |

### Marketing & Content

| Command | Action |
|---------|--------|
| `/marketing-campaign` | Plan and execute a full marketing campaign. |

---

## Hooks — Automatic Triggers

Hooks run automatically on Claude Code events.  
**Config:** `~/.claude/hooks/hooks.json`

### Active Hooks

| Hook ID | Trigger | Action |
|---------|---------|--------|
| `pre:bash:dispatcher` | Before every Bash command | Quality, tmux, push, and GateGuard checks. |
| `pre:write:doc-file-warning` | Before Write tool on docs | Warns about non-standard documentation files. |
| `pre:edit-write:suggest-compact` | Before Edit/Write | Suggests manual compaction at logical intervals. |
| `pre:observe:continuous-learning` | Before every tool use (async) | Captures tool use observations for learning. |

---

## Rules — Always-Follow Guidelines

Installed rules apply automatically during coding sessions.  
**Location:** `~/.claude/rules/ecc/`

### Available Rule Sets

| Directory | Applies To |
|-----------|------------|
| `common/` | All languages — agents, security, workflow. |
| `typescript/` | TypeScript coding style, patterns, security, testing. |
| `python/` | Python PEP 8, type hints, security, testing. |
| `golang/` | Go idioms, error handling, concurrency. |
| `rust/` | Rust memory safety, traits, async. |
| `java/` | Java patterns, Spring, testing. |
| `kotlin/` | Kotlin idioms, coroutines, null safety. |
| `swift/` | Swift/SwiftUI patterns, concurrency. |
| `angular/` | Angular coding style, hooks, security. |
| `react/` | React patterns, hooks, performance. |
| `php/` | PHP PSR standards, security. |
| `arkts/` | HarmonyOS/ArkTS patterns. |

---

## skills CLI Commands (This Project)

```bash
# Install skills from a repo
npx skills add affaan-m/ecc

# Install specific skills only
npx skills add affaan-m/ecc --skill tdd-workflow --skill security-review

# Install to Claude Code only
npx skills add affaan-m/ecc -a claude-code

# Install globally
npx skills add affaan-m/ecc -g

# List skills in a repo without installing
npx skills add affaan-m/ecc --list

# List installed skills
npx skills list

# Update all skills
npx skills update

# Check for updates
npx skills check

# Restore from lock file
npx skills install

# Create a new SKILL.md template
npx skills init my-skill-name
```

---

## Development Commands (This Repo)

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Type check
pnpm typecheck

# Lint
pnpm lint
```

---

## ECC Re-installation

To reinstall or update ECC:

```bash
cd /tmp/ecc
git pull
node scripts/install-apply.js --profile full --target claude
```

To uninstall:
```bash
cd /tmp/ecc
node scripts/uninstall.js --dry-run  # Preview
node scripts/uninstall.js            # Actually uninstall
```

---

## Key Workflows for This Project

### Adding a New Feature to `skills` CLI

```
/orch-add-feature "Add support for HuggingFace skill repositories"
```

### Fixing a Bug

```
/orch-fix-defect "skills add crashes when given an SSH git URL"
```

### Code Review Before Committing

```
/code-review
```

### Security Audit

```
/security-scan
```

### Create a PR

```
/pr
```
