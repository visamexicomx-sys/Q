---
name: agentdb-vector-search
description: Implement semantic vector search with AgentDB for intelligent document retrieval, similarity matching, and context-aware querying. Use when building RAG systems, semantic search engines, or intelligent knowledge bases.
metadata:
  source: ruvnet/ruflo
  version: 1.0.0
---

# AgentDB Vector Search

Semantic vector search using AgentDB's high-performance vector database with 150x-12,500x faster operations. Features HNSW indexing, quantization, and sub-millisecond search (<100µs).

## Prerequisites

- Node.js 18+
- AgentDB v1.0.7+
- OpenAI API key or custom embedding model

## CLI Quick Start

```bash
# Initialize vector database
npx agentdb@latest init ./vectors.db
npx agentdb@latest init ./vectors.db --dimension 768  # sentence-transformers

# Query
npx agentdb@latest query ./vectors.db "[0.1,0.2,0.3,...]"
npx agentdb@latest query ./vectors.db "[...]" -k 10 -t 0.75 -m cosine

# Import/export
npx agentdb@latest export ./vectors.db ./backup.json
npx agentdb@latest import ./backup.json
npx agentdb@latest stats ./vectors.db
```

## API Quick Start

```typescript
import { createAgentDBAdapter, computeEmbedding } from 'agentic-flow/reasoningbank';

const adapter = await createAgentDBAdapter({
  dbPath: '.agentdb/vectors.db',
  enableLearning: false,
  enableReasoning: true,
  quantizationType: 'binary',
  cacheSize: 1000,
});

// Store document
const text = "The quantum computer achieved 100 qubits";
const embedding = await computeEmbedding(text);
await adapter.insertPattern({ /* ... */ });

// Semantic search with MMR
const queryEmbedding = await computeEmbedding("quantum computing advances");
const results = await adapter.retrieveWithReasoning(queryEmbedding, {
  domain: 'technology',
  k: 10,
  useMMR: true,
  synthesizeContext: true,
});
```

## RAG Pipeline

```typescript
async function ragQuery(question: string) {
  const context = await db.searchSimilar(
    await embed(question),
    { limit: 5, threshold: 0.7 }
  );

  const prompt = `Context: ${context.map(c => c.text).join('\n')}
Question: ${question}`;

  return await llm.generate(prompt);
}
```

## Distance Metrics

```bash
npx agentdb@latest query ./db.sqlite "[...]" -m cosine     # default
npx agentdb@latest query ./db.sqlite "[...]" -m euclidean  # L2 distance
npx agentdb@latest query ./db.sqlite "[...]" -m dot        # dot product
```

## MCP Server Integration

```bash
npx agentdb@latest mcp
claude mcp add agentdb npx agentdb@latest mcp
```

## Embedding Model Dimensions

| Model | Dimensions |
|-------|-----------|
| OpenAI ada-002 | 1536 |
| sentence-transformers | 768 |
| all-MiniLM-L6-v2 | 384 |

## Performance Characteristics

| Operation | Performance |
|-----------|------------|
| Vector Search | <100µs |
| Pattern Retrieval | <1ms |
| Batch Insert (100) | 2ms |
| Memory (1M vectors, binary) | ~96MB |
