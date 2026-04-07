---
name: github-workflow-automation
description: Advanced GitHub Actions workflow automation with AI swarm coordination, intelligent CI/CD pipelines, and comprehensive repository management. Use when setting up or optimizing GitHub Actions, creating CI/CD pipelines, or automating repository workflows.
metadata:
  source: ruvnet/ruflo
  version: 1.0.0
---

# GitHub Workflow Automation

Comprehensive GitHub Actions automation with AI swarm coordination — intelligent CI/CD pipelines, workflow orchestration, and self-healing automation.

## When to Use

- Setting up or optimizing GitHub Actions pipelines
- Creating adaptive CI/CD workflows
- Automating code review, testing, and deployment
- Building self-healing pipelines
- Coordinating workflows across repositories

## Quick Start

```bash
# Generate optimized workflow from codebase analysis
npx ruv-swarm actions generate-workflow \
  --analyze-codebase \
  --detect-languages \
  --create-optimal-pipeline

# Optimize existing workflow
npx ruv-swarm actions optimize \
  --workflow ".github/workflows/ci.yml" \
  --suggest-parallelization
```

## Swarm-Powered GitHub Modes

| Mode | Best For |
|------|---------|
| `gh-coordinator` | Complex multi-repo workflows |
| `pr-manager` | PR creation and review coordination |
| `issue-tracker` | Issue management and sprint tracking |
| `release-manager` | Automated versioned releases |
| `repo-architect` | Repository structure optimization |
| `code-reviewer` | Deep automated code review |
| `ci-orchestrator` | Parallel CI/CD coordination |
| `security-guardian` | Security scanning and compliance |

## Workflow Templates

### Intelligent CI with Swarms

```yaml
name: Intelligent CI
on: [push, pull_request]

jobs:
  swarm-analysis:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Initialize Swarm
        uses: ruvnet/swarm-action@v1
        with:
          topology: mesh
          max-agents: 6
      - name: Analyze Changes
        run: npx ruv-swarm actions analyze --commit ${{ github.sha }}
```

### Self-Healing Pipeline

```yaml
name: Self-Healing Pipeline
on: workflow_run

jobs:
  heal-pipeline:
    if: ${{ github.event.workflow_run.conclusion == 'failure' }}
    steps:
      - name: Diagnose and Fix
        run: |
          npx ruv-swarm actions self-heal \
            --run-id ${{ github.event.workflow_run.id }} \
            --auto-fix-common
```

### PR Validation Swarm

```yaml
name: PR Validation
on: pull_request

jobs:
  validate:
    steps:
      - name: Multi-Agent Validation
        run: |
          RESULTS=$(npx ruv-swarm actions pr-validate \
            --spawn-agents "linter,tester,security,docs" \
            --parallel)
          gh pr comment ${{ github.event.pull_request.number }} \
            --body "$RESULTS"
```

### Adaptive Security Scanning

```yaml
name: Security Scan
on:
  schedule:
    - cron: '0 0 * * *'

jobs:
  security-swarm:
    steps:
      - name: Security Analysis Swarm
        run: |
          npx ruv-swarm actions security \
            --deep-scan \
            --format json | \
          jq -r '.issues[]?' | while read issue; do
            gh issue create --title "Security: $issue" --label "security,critical"
          done
```

## Performance Optimization

```bash
# Identify bottlenecks
npx ruv-swarm actions analytics \
  --workflow "ci.yml" \
  --period 30d \
  --identify-bottlenecks

# Cost optimization
npx ruv-swarm actions cost-optimize \
  --analyze-usage \
  --suggest-caching
```

## Dynamic Test Strategies

```yaml
# Generate test matrix from code analysis
jobs:
  generate-matrix:
    outputs:
      matrix: ${{ steps.set-matrix.outputs.matrix }}
    steps:
      - id: set-matrix
        run: |
          MATRIX=$(npx ruv-swarm actions test-matrix \
            --detect-frameworks \
            --optimize-coverage)
          echo "matrix=${MATRIX}" >> $GITHUB_OUTPUT
```

## Security Best Practices

```yaml
permissions:
  contents: read
  pull-requests: write
  issues: write

- name: Setup with OIDC
  uses: aws-actions/configure-aws-credentials@v2
  with:
    role-to-assume: arn:aws:iam::123456789012:role/GitHubAction
```

## Setup Verification Checklist

- [ ] GitHub CLI (`gh`) installed and authenticated
- [ ] Node.js v16+ installed
- [ ] Repository has `.github/workflows` directory
- [ ] GitHub Actions enabled
- [ ] Necessary secrets configured
- [ ] Runner permissions verified

## Related Skills

- `github-code-review` — Automated PR review
- `github-release-management` — Release automation
- `swarm-advanced` — Multi-agent orchestration
