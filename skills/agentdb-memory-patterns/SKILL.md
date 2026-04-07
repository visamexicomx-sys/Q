---
name: agentdb-memory-patterns
description: Persistent memory implementation for AI agents using AgentDB. Provides session memory, long-term memory, pattern learning, and hierarchical memory organization. Use when building stateful agents that need to remember and learn from interactions.
metadata:
  source: ruvnet/ruflo
  version: 1.0.0
---

# AgentDB Memory Patterns

Persistent memory management for AI agents enabling stateful systems with 150x-12,500x faster performance than traditional approaches.

## When to Use

- Building agents that remember past interactions
- Implementing user preference learning
- Creating hierarchical memory systems
- Capturing and reusing successful interaction patterns

## Memory Organization Patterns

### Session Memory
Stores conversation history with timestamp tracking and retrieval limits.

### Long-Term Memory
Persists user facts and preferences with confidence scoring.

### Pattern Learning
Captures successful interaction sequences for reuse.

### Hierarchical Organization
```
Immediate → Short-term → Long-term → Semantic
```

## Quick Start

```bash
# Initialize database
npx agentdb@latest init ./agents.db

# Start MCP server
npx agentdb@latest mcp
claude mcp add agentdb npx agentdb@latest mcp
```

## TypeScript Integration

```typescript
import { createAgentDBAdapter, computeEmbedding } from 'agentic-flow/reasoningbank';

const adapter = await createAgentDBAdapter({
  dbPath: '.agentdb/memory.db',
  enableLearning: true,
  enableReasoning: true,
  cacheSize: 1000,
});

// Store memory
const embedding = await computeEmbedding("user preference: dark mode");
await adapter.insertPattern({
  id: '',
  type: 'preference',
  domain: 'user-settings',
  pattern_data: JSON.stringify({ embedding, pattern: { pref: 'dark mode', confidence: 0.95 } }),
  confidence: 0.95,
  usage_count: 1,
  success_count: 1,
  created_at: Date.now(),
  last_used: Date.now(),
});

// Retrieve with reasoning
const result = await adapter.retrieveWithReasoning(embedding, {
  domain: 'user-settings',
  k: 5,
  synthesizeContext: true,
});
```

## Performance

- HNSW vector indexing: **<100µs** search times
- Memory footprint: **4-32x reduction** with quantization
- Batch inserts: **500x faster** than individual insertions

## Migration from Legacy ReasoningBank

```bash
npx agentdb@latest migrate --source .swarm/memory.db
npx agentdb@latest stats ./.agentdb/reasoningbank.db
```
