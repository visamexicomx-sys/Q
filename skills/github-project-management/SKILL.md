---
name: github-project-management
description: Comprehensive GitHub project management with swarm-coordinated issue tracking, project board automation, and sprint planning. Use when managing GitHub projects, automating issue triage, or coordinating sprint workflows.
metadata:
  source: ruvnet/ruflo
  version: 1.0.0
---

# GitHub Project Management

AI-powered GitHub project management with swarm coordination for issue tracking, board automation, and sprint planning.

## When to Use

- Automating issue creation and triage
- Managing project boards and sprint planning
- Coordinating multi-team development workflows
- Tracking KPIs and project health metrics

## Issue Management

```bash
# Create and triage issues with swarm
npx ruv-swarm github issue-tracker \
  "Manage sprint issues with automated tracking"

# Decompose complex issue into subtasks
gh issue create --title "Epic: User Authentication" \
  --label "epic,feature" | \
  npx ruv-swarm github issue-decompose --subtasks 5
```

## Project Board Automation

```bash
# Initialize project board
npx claude-flow@alpha github issue-tracker \
  "Setup kanban board with automated card management"

# Sync tasks to board in real-time
npx ruv-swarm github board-sync --project "Sprint 12"
```

## Sprint Planning

```bash
# Create sprint
gh milestone create "Sprint 12" \
  --due-date "2025-11-01" | \
  npx ruv-swarm github sprint-plan \
    --velocity 40 \
    --team-capacity 0.8

# Generate sprint analytics
npx ruv-swarm github sprint-report \
  --format markdown \
  --export docs/sprint-12-report.md
```

## Issue Templates

### Bug Report
```markdown
**Environment**: [OS, Node version, etc.]
**Expected**: [What should happen]
**Actual**: [What happens]
**Steps to reproduce**: [Numbered list]
```

### Feature Request
```markdown
**User Story**: As a [user], I want [feature] so that [outcome]
**Acceptance Criteria**: [Checklist]
**Priority**: [High/Medium/Low]
```

## Swarm Strategies

| Task Type | Swarm Topology | Agents |
|-----------|---------------|--------|
| Bug investigation | Mesh | debugger, analyst, tester |
| Feature implementation | Hierarchical | architect, coder, tester, reviewer |
| Technical debt | Mesh | analyst, coder, reviewer |

## Monitoring & KPIs

```bash
# Generate project metrics
npx ruv-swarm github project-metrics \
  --period 30d \
  --metrics "velocity,burndown,lead-time,cycle-time" \
  --dashboard
```

## Integration

Works with other GitHub skills:
- `github-code-review` — Automated PR review
- `github-workflow-automation` — CI/CD pipelines
- `github-release-management` — Release coordination

## Best Practices

1. Use labels consistently for automated triage
2. Link PRs to issues for automatic closure
3. Set up milestone-based sprint tracking
4. Review stale issues weekly with automated detection
5. Export metrics regularly for team retrospectives
