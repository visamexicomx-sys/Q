---
name: agentdb-advanced
description: Advanced AgentDB features including QUIC synchronization, hybrid vector+metadata search, multi-database sharding, MMR (Maximal Marginal Relevance), and context synthesis. Use when building high-performance distributed memory systems or advanced RAG pipelines.
metadata:
  source: ruvnet/ruflo
  version: 1.0.0
---

# AgentDB Advanced Features

Advanced vector database operations with sub-millisecond cross-node synchronization, hybrid search, and context synthesis.

## When to Use

- Building distributed multi-node agent memory systems
- Implementing hybrid search (vector + metadata filters)
- Optimizing vector search with MMR for diverse results
- Sharding databases across multiple nodes
- Generating rich narrative context from memories

## Core Capabilities

### QUIC Synchronization
Sub-millisecond cross-node communication for distributed AgentDB clusters.

### Distance Metrics
- **Cosine similarity** — default, best for semantic search
- **Euclidean (L2)** — for spatial relationships
- **Dot product** — for normalized vectors

### Hybrid Search
```typescript
const results = await db.hybridSearch({
  query: "machine learning models",
  filters: {
    category: "research",
    date: { $gte: "2024-01-01" }
  },
  limit: 20
});
```

### MMR (Maximal Marginal Relevance)
Diverse result sets that avoid redundancy:
```typescript
const result = await adapter.retrieveWithReasoning(embedding, {
  useMMR: true,
  synthesizeContext: true,
  k: 10,
});
```

### Multi-Database Sharding
Distribute vectors across nodes for horizontal scaling.

## Performance

- Pattern Search: **150x faster** (100µs vs 15ms)
- Batch Insert: **500x faster** (2ms vs 1s for 100 vectors)
- Large-scale Query: **12,500x faster** at 1M vectors
- Memory Efficiency: **4-32x reduction** with quantization

## CLI Operations

```bash
# Export vectors
npx agentdb@latest export ./vectors.db ./backup.json

# Import vectors
npx agentdb@latest import ./backup.json

# Get database statistics
npx agentdb@latest stats ./vectors.db
```

## Setup

```bash
npx agentdb@latest init ./agents.db
```

## Learn More

- GitHub: https://github.com/ruvnet/agentic-flow/tree/main/packages/agentdb
- Website: https://agentdb.ruv.io
