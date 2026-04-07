---
name: Verification & Quality Assurance
description: Comprehensive truth scoring, code quality verification, and automatic rollback system with 0.95 accuracy threshold. Use when verifying code correctness, running quality gates before deployment, implementing CI/CD quality checks, or rolling back to last-known-good state.
---

# Verification & Quality Assurance

Provides automated truth scoring, multi-dimensional code quality verification, and Git-based automatic rollback with sub-second performance.

## Quick Start

```bash
# View current truth scores
npx claude-flow@alpha truth

# Verify a file
npx claude-flow@alpha verify check --file src/app.js

# Run full verification
npx claude-flow@alpha verify check --all --threshold 0.95
```

## Truth Score Scale

| Score | Rating | Action |
|-------|--------|--------|
| 1.0–0.95 | Excellent ⭐ | Production-ready, deploy immediately |
| 0.94–0.85 | Good ✅ | Acceptable, minor improvements optional |
| 0.84–0.75 | Warning ⚠️ | Needs attention before production |
| <0.75 | Critical ❌ | Immediate action required |

## Commands

```bash
# Basic verification
npx claude-flow@alpha verify check --file src/app.js
npx claude-flow@alpha verify check --dir src/ --recursive
npx claude-flow@alpha verify check --all

# Custom threshold
npx claude-flow@alpha verify check --threshold 0.98

# Interactive dashboard
npx claude-flow@alpha verify dashboard

# Rollback options
npx claude-flow@alpha verify rollback --last-good
npx claude-flow@alpha verify rollback --commit abc123
npx claude-flow@alpha verify rollback --dry-run

# CI/CD mode
npx claude-flow@alpha verify check --all --json --threshold 0.95
```

## Verification Criteria

| Dimension | Checks |
|-----------|--------|
| **Code Correctness** | Syntax, type safety, logic errors |
| **Best Practices** | SOLID principles, design patterns, readability |
| **Security** | OWASP Top 10, secret detection, vulnerability scanning |
| **Performance** | Algorithmic complexity, memory usage, N+1 queries |
| **Documentation** | JSDoc/TSDoc coverage, README completeness |

## Rollback System

```bash
# Automatic rollback (triggers when score < threshold)
npx claude-flow@alpha verify check --auto-rollback --threshold 0.90

# Manual rollback to last good state
npx claude-flow@alpha verify rollback --last-good

# Selective file rollback (<500ms)
npx claude-flow@alpha verify rollback --file src/auth.ts --last-good

# Dry run (shows what would be rolled back)
npx claude-flow@alpha verify rollback --dry-run
```

## CI/CD Integration

### GitHub Actions
```yaml
- name: Quality Gate
  run: npx claude-flow@alpha verify check --all --json --threshold 0.95
  # Exit codes: 0=pass, 1=fail, 2=error
```

### GitLab CI
```yaml
quality-gate:
  script:
    - npx claude-flow@alpha verify check --all --threshold 0.95
  allow_failure: false
```

## Configuration

`.claude-flow/config.json`:
```json
{
  "verification": {
    "thresholds": {
      "production": 0.99,
      "staging": 0.95,
      "development": 0.90
    },
    "autoRollback": true,
    "gitIntegration": true,
    "preCommitHook": true,
    "dimensions": {
      "security": { "weight": 0.3, "enabled": true },
      "correctness": { "weight": 0.3, "enabled": true },
      "performance": { "weight": 0.2, "enabled": true },
      "bestPractices": { "weight": 0.1, "enabled": true },
      "documentation": { "weight": 0.1, "enabled": true }
    }
  }
}
```

## Performance
- Single file check: <100ms
- Full codebase scan: <5s
- Dashboard WebSocket latency: <100ms
- Git rollback: <1s
- Selective file rollback: <500ms
