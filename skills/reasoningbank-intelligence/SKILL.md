---
name: reasoningbank-intelligence
description: Adaptive learning system for AI agents with pattern recognition, strategy optimization, and continuous self-improvement. Supports meta-learning and transfer learning across domains. Use when building self-improving agents or implementing experience-driven optimization.
metadata:
  source: ruvnet/ruflo
  version: 1.0.0
---

# ReasoningBank Intelligence

Adaptive learning system enabling AI agents to learn from experience, recognize patterns, and optimize strategies over time with meta-cognitive capabilities.

## When to Use

- Building self-improving agents that learn from past decisions
- Implementing strategy optimization across multiple runs
- Transferring learned patterns between domains
- Creating agents with meta-learning capabilities

## Prerequisites

- agentic-flow v1.5.11+
- AgentDB v1.0.4+
- Node.js 18+

## Core Capabilities

### 1. Pattern Recognition

Identify triggers and associated actions from accumulated task data:

```typescript
import { ReasoningBankIntelligence } from 'agentic-flow/reasoningbank';

const rb = new ReasoningBankIntelligence({
  dbPath: '.agentdb/intelligence.db',
  enableVectorSearch: true,
  confidenceThreshold: 0.75,
});

// Record an experience
await rb.recordExperience({
  context: 'user requested database optimization',
  action: 'analyze query plans → add indexes → test performance',
  outcome: 'success',
  metrics: { improvement: 0.85, latencyMs: 45 }
});

// Retrieve relevant patterns for new task
const patterns = await rb.findPatterns('optimize slow database query');
```

### 2. Strategy Optimization

Compare different approaches and score their effectiveness:

```typescript
// Compare strategies across past runs
const strategyComparison = await rb.compareStrategies({
  task: 'code refactoring',
  strategies: ['extract-method', 'inline-variable', 'introduce-parameter'],
  metric: 'code-quality-improvement'
});

// Get recommended strategy
const best = strategyComparison.getBestStrategy();
```

### 3. Continuous Learning

Automatic model updates based on task outcomes:

```typescript
// Feedback loop
await rb.updateFromOutcome({
  taskId: 'task-123',
  outcome: 'success',
  reward: 0.92,
  context: { domain: 'refactoring', codebase: 'typescript' }
});
```

### 4. Meta-Learning

Learning about learning itself:

```typescript
// Track which learning strategies work best
const metaInsights = await rb.analyzeMetaPatterns({
  period: '30d',
  domains: ['refactoring', 'debugging', 'optimization']
});

console.log('Best learning approach:', metaInsights.topStrategy);
console.log('Optimal feedback frequency:', metaInsights.feedbackCadence);
```

### 5. Transfer Learning

Apply patterns learned in one domain to another:

```typescript
const transferredPatterns = await rb.transferLearn({
  sourceDomain: 'backend-optimization',
  targetDomain: 'frontend-optimization',
  similarity: 0.7
});
```

## Storage & Performance

```typescript
// Configure for performance
const rb = new ReasoningBankIntelligence({
  dbPath: '.agentdb/intelligence.db',
  enableVectorSearch: true,    // Semantic pattern matching
  ttl: 2592000,                // 30 days TTL
  maxPatterns: 10000,          // Prune when exceeded
  confidenceThreshold: 0.65,
});
```

## Best Practices

1. **Log all outcomes** — not just successes, failures teach equally
2. **Rich context** — include domain, codebase type, team size
3. **Set confidence thresholds** — ignore low-confidence patterns
4. **Audit periodically** — review learned patterns for quality
5. **Enable vector indexing** — critical for semantic retrieval at scale

## Memory Management

```typescript
// Configure growth management
{
  "maxPatterns": 10000,
  "ttlDays": 30,
  "pruneStrategy": "confidence-weighted",
  "compressionEnabled": true
}
```
