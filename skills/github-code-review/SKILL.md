---
name: github-code-review
description: AI-powered comprehensive GitHub code review with multi-agent swarm coordination. Deploys specialized security, performance, architecture, style, and accessibility agents to review PRs. Use when reviewing pull requests or running automated code quality checks.
metadata:
  source: ruvnet/ruflo
  version: 1.0.0
---

# GitHub Code Review Skill

AI-powered code review using specialized swarm agents for comprehensive, parallel PR analysis.

## Quick Start

```bash
# Simple review
gh pr view 123 --json files,diff | npx ruv-swarm github review-init --pr 123

# Complete review workflow
PR_DATA=$(gh pr view 123 --json files,additions,deletions,title,body)
PR_DIFF=$(gh pr diff 123)

npx ruv-swarm github review-init \
  --pr 123 \
  --pr-data "$PR_DATA" \
  --diff "$PR_DIFF" \
  --agents "security,performance,style,architecture,accessibility" \
  --depth comprehensive
```

## Specialized Review Agents

### Security Review Agent
Checks: SQL injection, XSS, authentication bypasses, cryptographic weaknesses, secret exposure, CORS misconfigurations, dependency vulnerabilities.

```bash
SECURITY_RESULTS=$(npx ruv-swarm github review-security \
  --pr 123 \
  --files "$CHANGED_FILES" \
  --check "owasp,cve,secrets,permissions" \
  --suggest-fixes)

# Auto-block on critical findings
if echo "$SECURITY_RESULTS" | grep -q "critical"; then
  gh pr review 123 --request-changes --body "$SECURITY_RESULTS"
fi
```

### Performance Review Agent
Analyzes: Algorithm complexity (Big O), database query efficiency, memory allocation, cache utilization, bundle size impact.

### Architecture Review Agent
Evaluates: Design pattern adherence, SOLID principles, DRY violations, coupling/cohesion, circular dependencies.

### Style & Convention Agent
Enforces: Code formatting, naming conventions, documentation standards, test coverage, error handling patterns.

## Label-Based Agent Assignment

```json
{
  "bug": ["debugger", "tester"],
  "feature": ["architect", "coder", "tester"],
  "security": ["security", "authentication", "audit"],
  "performance": ["analyst", "optimizer"]
}
```

## Automated Review Workflow

```yaml
# .github/workflows/auto-review.yml
name: Automated Code Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  swarm-review:
    runs-on: ubuntu-latest
    steps:
      - name: Run Review Swarm
        run: |
          PR_NUM=${{ github.event.pull_request.number }}
          REVIEW_OUTPUT=$(npx ruv-swarm github review-all \
            --pr $PR_NUM \
            --agents "security,performance,style,architecture")
          echo "$REVIEW_OUTPUT" | gh pr review $PR_NUM --comment -F -
```

## PR Comment Commands

```markdown
/swarm review --agents security,performance
/swarm status
/swarm init mesh 6
```

## Quality Gates

```bash
npx ruv-swarm github quality-gates \
  --define '{
    "security": {"threshold": "no-critical"},
    "performance": {"regression": "<5%"},
    "coverage": {"minimum": "80%"}
  }'
```

## Security Checklist

- [ ] GitHub token scoped to repository only
- [ ] Webhook signatures verified
- [ ] Command injection protection enabled
- [ ] Rate limiting configured
- [ ] Audit logging enabled

## Related Skills

- `github-workflow-automation` — CI/CD pipeline automation
- `github-project-management` — Issue and sprint management
- `swarm-advanced` — Advanced swarm orchestration patterns
