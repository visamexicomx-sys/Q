---
name: agentdb-optimization
description: Optimize AgentDB performance with quantization (4-32x memory reduction), HNSW indexing (150x faster search), caching, and batch operations. Use when optimizing memory usage, improving search speed, or scaling to millions of vectors.
metadata:
  source: ruvnet/ruflo
  version: 1.0.0
---

# AgentDB Performance Optimization

Comprehensive performance optimization for AgentDB vector databases. Achieve 150x-12,500x performance improvements through quantization, HNSW indexing, caching strategies, and batch operations.

**Performance**: <100µs vector search, <1ms pattern retrieval, 2ms batch insert for 100 vectors.

## Prerequisites

- Node.js 18+
- AgentDB v1.0.7+ (via agentic-flow)
- Existing AgentDB database or application

## Quick Start

```bash
# Run performance benchmarks
npx agentdb@latest benchmark
```

```typescript
import { createAgentDBAdapter } from 'agentic-flow/reasoningbank';

const adapter = await createAgentDBAdapter({
  dbPath: '.agentdb/optimized.db',
  quantizationType: 'binary',
  cacheSize: 1000,
  enableLearning: true,
  enableReasoning: true,
});
```

## Quantization Strategies

### Binary Quantization (32x Reduction)
- **Best For**: Large-scale deployments (1M+ vectors)
- **Trade-off**: ~2-5% accuracy loss
- **Memory**: 32x smaller | **Speed**: 10x faster

### Scalar Quantization (4x Reduction)
- **Best For**: Balanced performance/accuracy
- **Trade-off**: ~1-2% accuracy loss
- **Memory**: 4x smaller | **Speed**: 3x faster

### Product Quantization (8-16x Reduction)
- **Best For**: High-dimensional vectors (>512 dims)
- **Trade-off**: ~3-7% accuracy loss
- **Memory**: 8-16x smaller | **Speed**: 5x faster

## HNSW Indexing Parameters

| Parameter | Small (<10K) | Medium (10K-100K) | Large (>100K) |
|-----------|--------------|-------------------|----------------|
| M | 8 | 16 | 32 |
| efConstruction | 100 | 200 | 400 |
| efSearch | 50 | 100 | 200 |

## Caching Strategies

| Scale | Cache Size |
|-------|-----------|
| Small | 100-500 patterns |
| Medium | 500-2000 patterns |
| Large | 2000-5000 patterns |

## Optimization Recipes

### Maximum Speed
```typescript
{ quantizationType: 'binary', cacheSize: 2000, /* ... */ }
// Result: <50µs search, 90-95% accuracy
```

### Balanced Performance
```typescript
{ quantizationType: 'scalar', cacheSize: 1000, /* ... */ }
// Result: <100µs search, 98-99% accuracy
```

### Maximum Accuracy
```typescript
{ quantizationType: 'none', cacheSize: 5000, /* ... */ }
// Result: <200µs search, 100% accuracy
```

## Performance Benchmarks

| Operation | No Optimization | Optimized | Improvement |
|-----------|-----------------|-----------|-------------|
| Search (10K) | 15ms | 100µs | 150x |
| Search (1M) | 100s | 8ms | 12,500x |
| Batch Insert (100) | 1s | 2ms | 500x |
| Memory (1M) | 3GB | 96MB | 32x |
