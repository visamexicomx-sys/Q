---
name: reasoningbank-agentdb
description: ReasoningBank adaptive learning with AgentDB's 150x faster vector database. Includes trajectory tracking, verdict judgment, memory distillation, and pattern recognition. Use when building self-learning agents, optimizing decision-making, or implementing experience replay systems.
metadata:
  source: ruvnet/ruflo
  version: 1.0.0
---

# ReasoningBank with AgentDB

ReasoningBank adaptive learning using AgentDB's high-performance backend (150x-12,500x faster). Enables agents to learn from experiences, judge outcomes, distill memories, and improve decision-making over time.

**Performance**: 150x faster pattern retrieval, 500x faster batch operations, <1ms memory access.

## Prerequisites

- Node.js 18+
- AgentDB v1.0.7+ (via agentic-flow)

## Quick Start

```bash
# Initialize ReasoningBank database
npx agentdb@latest init ./.agentdb/reasoningbank.db --dimension 1536

# Start MCP server
npx agentdb@latest mcp
claude mcp add agentdb npx agentdb@latest mcp

# Migrate from legacy
npx agentdb@latest migrate --source .swarm/memory.db
```

## Core Concepts

### 1. Trajectory Tracking

```typescript
import { createAgentDBAdapter, computeEmbedding } from 'agentic-flow/reasoningbank';

const rb = await createAgentDBAdapter({
  dbPath: '.agentdb/reasoningbank.db',
  enableLearning: true,
  enableReasoning: true,
  cacheSize: 1000,
});

// Track a learning trajectory
const trajectory = {
  task: 'optimize-api-endpoint',
  steps: [
    { action: 'analyze-bottleneck', result: 'found N+1 query' },
    { action: 'add-eager-loading', result: 'reduced queries' },
  ],
  outcome: 'success',
  metrics: { latency_before: 2500, latency_after: 150 }
};

const embedding = await computeEmbedding(JSON.stringify(trajectory));
await rb.insertPattern({
  id: '', type: 'trajectory', domain: 'api-optimization',
  pattern_data: JSON.stringify({ embedding, pattern: trajectory }),
  confidence: 0.9, usage_count: 1, success_count: 1,
  created_at: Date.now(), last_used: Date.now()
});
```

### 2. Verdict Judgment

```typescript
const similar = await rb.retrieveWithReasoning(queryEmbedding, {
  domain: 'api-optimization', k: 10,
});

const verdict = similar.memories.filter(m =>
  m.pattern.outcome === 'success' && m.similarity > 0.8
).length > 5 ? 'likely_success' : 'needs_review';
```

### 3. Memory Distillation

```typescript
// Consolidate experiences into high-level patterns
const experiences = await rb.retrieveWithReasoning(embedding, {
  domain: 'api-optimization', k: 100, optimizeMemory: true,
});

const distilledPattern = {
  domain: 'api-optimization',
  pattern: 'For N+1 queries: add eager loading, then cache',
  success_rate: 0.92, confidence: 0.95
};
```

## 4 Reasoning Modules

### PatternMatcher
Find similar successful patterns with `useMMR: true` for diverse results.

### ContextSynthesizer
Generate rich narrative context from multiple memories with `synthesizeContext: true`.

### MemoryOptimizer
Auto-consolidate and prune with `optimizeMemory: true`.

### ExperienceCurator
Filter by quality with `minConfidence: 0.8`.

## Legacy API Compatibility

```typescript
import { retrieveMemories, judgeTrajectory, distillMemories } from 'agentic-flow/reasoningbank';

// Legacy API works unchanged — uses AgentDB backend automatically
const memories = await retrieveMemories(query, { domain: 'code-generation', agent: 'coder' });
const verdict = await judgeTrajectory(trajectory, query);
```

## Hierarchical Memory

```typescript
// Low-level: specific bug fix
await rb.insertPattern({ type: 'concrete', domain: 'debugging/null-pointer', ... });

// Mid-level: pattern across similar cases
await rb.insertPattern({ type: 'pattern', domain: 'debugging', ... });

// High-level: general principle
await rb.insertPattern({ type: 'principle', domain: 'software-engineering', ... });
```

## Performance

| Operation | Duration |
|-----------|---------|
| Pattern Search | 150x faster (<100µs) |
| Memory Retrieval | <1ms |
| Batch Insert (100) | 500x faster (2ms) |
| Trajectory Judgment | <5ms |
| Memory Distillation | <50ms |
