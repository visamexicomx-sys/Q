---
name: github-release-management
description: Intelligent release automation and orchestration using AI swarms for comprehensive software releases — changelog generation, semantic versioning, multi-platform deployment, and rollback capabilities. Use when creating releases, managing deployment pipelines, or automating changelog generation.
metadata:
  source: ruvnet/ruflo
  version: 1.0.0
---

# GitHub Release Management

Intelligent release automation using AI swarms for end-to-end release orchestration.

## When to Use

- Creating versioned software releases
- Automating changelog generation
- Coordinating multi-platform deployment
- Managing release rollbacks
- Enforcing semantic versioning

## Quick Start

```bash
# Basic release
npx ruv-swarm github release-init \
  --version "v2.0.0" \
  --auto-changelog \
  --deploy staging

# Automated release
npx claude-flow@alpha github release-manager \
  "Create v2.0.0 release with changelog and deployment"
```

## Release Workflow

### 1. Pre-release Validation
```bash
npx ruv-swarm github release-validate \
  --version "v2.0.0" \
  --checks "tests,security,coverage,changelog"
```

### 2. Changelog Generation
```bash
# Auto-generate from commits since last release
npx ruv-swarm github changelog-generate \
  --from "v1.9.0" \
  --to HEAD \
  --format "keep-a-changelog" \
  --categorize
```

### 3. Semantic Versioning
```bash
# Determine version bump from commit messages
npx ruv-swarm github version-bump \
  --analyze-commits \
  --convention "conventional-commits"
# Outputs: patch|minor|major recommendation
```

### 4. Multi-Platform Deployment
```bash
npx ruv-swarm github release-deploy \
  --version "v2.0.0" \
  --targets "npm,github,docker" \
  --strategy progressive
```

## Automated Release Pipeline

```yaml
# .github/workflows/release.yml
name: Intelligent Release
on:
  push:
    tags: ['v*']

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Release Swarm
        run: |
          npx ruv-swarm actions release \
            --analyze-changes \
            --generate-notes \
            --create-artifacts \
            --publish-smart
```

## Swarm Agent Roles

| Agent | Responsibility |
|-------|---------------|
| Release Coordinator | Orchestrates the full release process |
| Changelog Writer | Generates release notes from commits |
| Security Auditor | Final security check before release |
| Deploy Manager | Coordinates multi-platform deployment |
| Rollback Guardian | Monitors post-release health |

## Rollback Capabilities

```bash
# Automatic rollback on failure
npx ruv-swarm github release-rollback \
  --version "v2.0.0" \
  --reason "health-check-failed" \
  --restore "v1.9.0"
```

## Release Checklist

- [ ] All tests passing
- [ ] Security scan completed
- [ ] Changelog generated and reviewed
- [ ] Version bumped in package.json
- [ ] Docker image built and tagged
- [ ] Release notes published
- [ ] Deployment health verified
- [ ] Rollback plan documented

## Best Practices

1. Always run security scan before release
2. Use conventional commits for automatic changelog
3. Progressive deployment: staging → canary → production
4. Set up automated health checks post-deployment
5. Tag releases with semantic version numbers
