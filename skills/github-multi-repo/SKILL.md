---
name: github-multi-repo
description: Advanced multi-repository coordination using swarm intelligence, package synchronization, and repository architecture optimization. Use when coordinating changes across multiple repositories, managing monorepos, or synchronizing dependencies organization-wide.
metadata:
  source: ruvnet/ruflo
  version: 1.0.0
---

# GitHub Multi-Repository Coordination

Advanced multi-repository coordination system combining swarm intelligence, package synchronization, and repository architecture optimization.

## When to Use

- Coordinating dependency updates across multiple repositories
- Synchronizing library versions across consumers
- Implementing organization-wide policy changes
- Managing monorepo structure and inter-package dependencies
- Cross-repository security patching

## Core Capabilities

### Cross-Repository Swarm Orchestration
- Repository discovery and dependency mapping
- Parallel changes across multiple repos
- Coordinated PR creation and review

### Package Synchronization
- Version alignment across packages
- Dependency resolution and conflict detection
- Atomic multi-repo updates

### Repository Architecture Optimization
- Structure analysis and template application
- Naming convention enforcement
- Documentation synchronization

## Quick Start

```bash
# Initialize multi-repo coordination
npx claude-flow@alpha github repo-architect \
  "Synchronize version updates across org/repo-a, org/repo-b, org/repo-c"

# Cross-repository sync
npx ruv-swarm github sync-repos \
  --repos "org/repo-a,org/repo-b,org/repo-c" \
  --strategy "eventual-consistency"
```

## Orchestration Workflows

### Dependency Update
```bash
npx ruv-swarm github multi-repo \
  --repos "org/service-a,org/service-b,org/service-c" \
  --task "update-dependency" \
  --package "lodash@4.17.21" \
  --create-prs
```

### Cross-Repository Testing
```bash
npx ruv-swarm github cross-repo-test \
  --repos "org/lib,org/consumer-a,org/consumer-b" \
  --integration-test
```

## Synchronization Patterns

| Pattern | Use Case |
|---------|---------|
| Eventual Consistency | Non-critical updates, async changes |
| Strong Consistency | Breaking changes, security patches |
| Hybrid | Mixed criticality updates |

## Communication Strategies

- **Webhooks** — Event-driven repository notifications
- **Event Streaming** — Real-time coordination bus
- **Pull-based** — Periodic synchronization checks

## Configuration

```yaml
# .github/multi-repo.yml
repos:
  - github.com/org/repo-a
  - github.com/org/repo-b
strategy: eventual-consistency
sync_interval: "1h"
auto_pr: true
require_approval: true
```

## Best Practices

1. Define clear repository roles (source of truth vs consumers)
2. Use semantic versioning consistently
3. Create PRs for review rather than direct pushes
4. Test integration after synchronization
5. Maintain a dependency graph for impact analysis

## Resources

- Claude-Flow: https://github.com/ruvnet/claude-flow
- Ruv-Swarm: https://github.com/ruvnet/ruv-swarm
