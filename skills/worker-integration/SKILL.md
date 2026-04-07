---
name: worker-integration
description: Worker-Agent integration for intelligent task dispatch and performance tracking in agentic-flow. Maps trigger keywords to specialized agents, tracks execution quality with feedback loops, and optimizes agent selection based on historical performance. Use when configuring automated agent dispatch, implementing trigger-based workflows, or optimizing multi-agent task routing.
---

# Worker Integration

Intelligent task dispatch system that maps trigger keywords to specialized agents, learns from execution history, and continuously optimizes agent selection based on quality scores and performance metrics.

## Quick Start

```bash
# Initialize worker integration
npx agentic-flow workers init

# Trigger a workflow
npx agentic-flow workers trigger ultralearn "analyze auth module"

# Check integration stats
npx agentic-flow workers stats
```

## Agent Trigger Mappings

| Trigger | Primary Agents | Pipeline Phases |
|---------|---------------|-----------------|
| `ultralearn` | researcher, coder | discovery → patterns → vectorization → summary |
| `optimize` | performance-analyzer, coder | static-analysis → performance → patterns |
| `audit` | security-analyst, tester | security → secrets → vulnerability-scan |
| `benchmark` | performance-analyzer | performance → metrics → report |
| `testgaps` | tester | discovery → coverage → gaps |
| `document` | documenter, researcher | api-discovery → patterns → indexing |
| `deepdive` | researcher, security-analyst | call-graph → deps → trace |
| `refactor` | coder, reviewer | complexity → smells → patterns |

## Performance-Based Agent Selection

The system learns from execution history to select the best agent for each task:

```typescript
// Selection returns confidence-scored recommendation
const selection = await workerAgentIntegration.selectAgent('optimize', {
  topic: 'database queries',
  complexity: 'high',
});
// Returns: { agent: 'performance-analyzer', confidence: 0.94, reasoning: '...' }
```

**Selection factors**:
- Quality score (weighted 40%)
- Success rate (weighted 30%)
- Average latency (weighted 20%)
- Execution count / experience (weighted 10%)

## Memory Key Patterns

```
{trigger}/{topic}/{phase}

Examples:
  ultralearn/auth-module/analysis
  optimize/db-queries/performance
  audit/payment-service/security
  benchmark/worker-system/metrics
```

## Feedback Loop

Record execution results to improve future selections:

```typescript
import { workerAgentIntegration } from 'agentic-flow/workers/worker-integration';

// Record feedback after task completion
workerAgentIntegration.recordFeedback(
  'optimize',           // trigger
  'coder',              // agent used
  true,                 // success
  245,                  // latency ms
  0.92                  // quality score
);

// Check if agent meets benchmark thresholds
const compliant = workerAgentIntegration.checkBenchmarkCompliance('coder');
```

## Benchmark Thresholds Per Agent

| Agent | Latency p95 | Memory | Quality |
|-------|------------|--------|---------|
| researcher | <500ms | <256MB | — |
| coder | <300ms | — | >0.85 |
| security-analyst | <1000ms | — | scan >95% |
| performance-analyzer | <200ms | — | — |
| tester | <400ms | — | coverage >90% |

## Configuration

`.claude/settings.json`:
```json
{
  "workers": {
    "enabled": true,
    "parallel": true,
    "memoryDepositEnabled": true,
    "agentMappings": {
      "ultralearn": ["researcher", "coder"],
      "optimize": ["performance-analyzer", "coder"],
      "audit": ["security-analyst", "tester"],
      "benchmark": ["performance-analyzer"],
      "testgaps": ["tester"],
      "document": ["documenter", "researcher"],
      "deepdive": ["researcher", "security-analyst"],
      "refactor": ["coder", "reviewer"]
    },
    "selectionWeights": {
      "qualityScore": 0.4,
      "successRate": 0.3,
      "avgLatency": 0.2,
      "executionCount": 0.1
    }
  }
}
```

## Integration Stats Example
```
Worker Integration Statistics
==============================
Total executions:     1,247
Success rate:         96.5%
Avg quality score:    0.91
Model cache hit rate: 96.5%
Top trigger:          ultralearn (312 uses)
Best agent:           researcher (0.94 avg quality)
```
