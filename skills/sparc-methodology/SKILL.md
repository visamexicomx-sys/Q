---
name: sparc-methodology
description: SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) comprehensive development methodology with multi-agent orchestration and 17 specialized modes. Use when implementing structured software development workflows, orchestrating multi-agent development teams, or applying systematic TDD and quality assurance processes.
---

# SPARC Methodology

Systematic development framework with 17 specialized modes for structured, high-quality software delivery. Achieves 84.8% SWE-Bench solve rate with 32.3% token reduction.

## Quick Start

```bash
# Via MCP (preferred)
mcp__claude-flow__sparc_mode { mode: "orchestrator", task_description: "build auth system" }

# Via NPX
npx claude-flow sparc run orchestrator "build auth system"

# Via local install
./claude-flow sparc run architect "design microservices architecture"
```

## 5 Development Phases

1. **Specification** — Requirements gathering, pseudocode, constraint definition
2. **Architecture** — System design, component interfaces, ADR documentation
3. **Refinement (TDD)** — Red-green-refactor cycle, 90%+ coverage target
4. **Review** — Quality, security, and performance analysis
5. **Completion** — Integration, deployment, monitoring setup

## 17 Available Modes

### Orchestration Modes
| Mode | Purpose |
|------|---------|
| `orchestrator` | Master workflow coordination across all agents |
| `swarm-coordinator` | Multi-agent parallel execution management |
| `workflow-manager` | Sequential pipeline orchestration |
| `batch-executor` | Parallel task batch processing |

### Development Modes
| Mode | Purpose |
|------|---------|
| `coder` | Implementation with best practices |
| `architect` | System design and architectural decisions |
| `tdd` | Test-driven development red-green-refactor |
| `reviewer` | Code quality, security, performance review |

### Analysis Modes
| Mode | Purpose |
|------|---------|
| `researcher` | Deep investigation and knowledge synthesis |
| `analyzer` | Pattern detection and root cause analysis |
| `optimizer` | Performance and efficiency improvements |

### Support Modes
| Mode | Purpose |
|------|---------|
| `designer` | UI/UX and system interface design |
| `innovator` | Creative problem-solving and ideation |
| `documenter` | Comprehensive documentation generation |
| `debugger` | Systematic bug investigation and fixing |
| `tester` | Test strategy and coverage analysis |
| `memory-manager` | Cross-session knowledge persistence |

## Orchestration Patterns

| Pattern | Use Case | Agent Count |
|---------|---------|-------------|
| Hierarchical | Queen + specialized workers | 5–20 |
| Mesh | Peer-to-peer collaboration | 3–10 |
| Sequential Pipeline | Strict dependency chains | Any |
| Parallel Execution | Independent workstreams | Any |
| Adaptive Strategy | Dynamic topology selection | 5–15 |

## TDD Workflow

```bash
# 1. Write failing test (Red)
npx claude-flow sparc run tdd "write failing test for auth service"

# 2. Make test pass (Green)
npx claude-flow sparc run coder "implement auth service to pass tests"

# 3. Refactor (Refactor)
npx claude-flow sparc run reviewer "refactor auth service maintaining tests"

# Run full TDD cycle
npx jest --coverage --threshold='{"global":{"lines":90}}'
```

## Full Orchestration Example

```bash
npx claude-flow sparc run orchestrator "
  Build a production-ready REST API with:
  - JWT authentication
  - Rate limiting
  - OpenAPI documentation
  - 90% test coverage
  - Docker deployment
"
```

## Performance Benchmarks
- SWE-Bench solve rate: 84.8%
- Token reduction vs sequential: 32.3%
- Speed improvement with parallel: 2.8x–4.4x
- Average task completion: <2 hours for medium complexity
