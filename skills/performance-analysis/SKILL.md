---
name: performance-analysis
description: Comprehensive performance analysis, bottleneck detection, and optimization recommendations for Claude Flow swarms. Use when identifying performance bottlenecks, generating performance reports, or optimizing swarm operations.
metadata:
  source: ruvnet/ruflo
  version: 1.0.0
---

# Performance Analysis Skill

Comprehensive performance analysis suite for identifying bottlenecks, profiling swarm operations, generating detailed reports, and providing actionable optimization recommendations.

## When to Use

- Identifying performance bottlenecks in swarm operations
- Generating performance reports for teams
- Profiling agent utilization and task throughput
- Setting up automated performance monitoring in CI/CD
- Capacity planning for swarm deployments

## Quick Start

```bash
# Basic bottleneck detection
npx claude-flow bottleneck detect

# Generate HTML performance report
npx claude-flow analysis performance-report --format html --include-metrics

# Detect and auto-fix
npx claude-flow bottleneck detect --fix --threshold 15
```

## Bottleneck Detection

```bash
npx claude-flow bottleneck detect [options]
  --swarm-id, -s <id>     Analyze specific swarm
  --time-range, -t <range> Analysis period: 1h, 24h, 7d, all
  --threshold <percent>    Bottleneck threshold (default: 20)
  --export, -e <file>      Export analysis
  --fix                    Apply automatic optimizations
```

### Metrics Analyzed

**Communication**: Message queue delays, agent response times, coordination overhead

**Processing**: Task completion times, agent utilization rates, parallel execution efficiency

**Memory**: Cache hit rates, HNSW index performance, storage I/O

**Network**: API call latency, MCP communication delays, external service timeouts

## Report Generation

```bash
npx claude-flow analysis performance-report \
  --format markdown \          # json | html | markdown
  --include-metrics \
  --compare swarm-123 \        # Compare with previous
  --time-range 7d \
  --output docs/perf-report.md
```

### Report Sections
1. **Executive Summary** — Overall score and key metrics
2. **Swarm Overview** — Topology and agent distribution
3. **Performance Metrics** — Execution times, throughput
4. **Bottleneck Analysis** — Identified issues with impact
5. **Comparative Analysis** — Trends vs previous period
6. **Recommendations** — Prioritized action items

## MCP Integration

```javascript
// Check for bottlenecks in Claude Code
mcp__claude-flow__bottleneck_detect({
  timeRange: "1h",
  threshold: 20,
  autoFix: false
})

// Get detailed results
mcp__claude-flow__performance_report({
  format: "detailed",
  timeframe: "current-run"
})
```

## Automatic Fixes Applied with `--fix`

1. **Topology Optimization** — Switch to more efficient topology
2. **Caching Enhancement** — Enable memory caching, preload patterns
3. **Concurrency Tuning** — Adjust agent counts and parallel execution
4. **Priority Adjustment** — Reorder task queues
5. **Resource Optimization** — Reduce I/O, batch API calls

## CI/CD Integration

```yaml
# .github/workflows/performance.yml
name: Performance Analysis
on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - name: Run Performance Analysis
        run: |
          npx claude-flow analysis performance-report \
            --format json \
            --output performance.json
      - name: Check Thresholds
        run: |
          npx claude-flow bottleneck detect \
            --threshold 15 \
            --export bottlenecks.json
```

## Typical Performance Improvements After Fixes

| Area | Improvement |
|------|------------|
| Communication | 30-50% faster message delivery |
| Processing | 20-40% reduced task completion time |
| Memory | 40-60% fewer cache misses |
| Network | 25-45% reduced API latency |

## Best Practices

1. Run bottleneck detection after major changes
2. Generate weekly performance reports
3. Set thresholds: 10-15% for production, 25-30% for development
4. Always review before applying `--fix`
5. Build performance budgets and establish baselines
