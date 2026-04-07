---
name: v3-memory-unification
description: Consolidate 6+ memory systems into a unified AgentDB backend with HNSW vector indexing for 150x-12,500x search improvements. Migrates MemoryManager, DistributedMemorySystem, SwarmMemory, SQLiteBackend, MarkdownBackend, and HybridBackend into a single query interface. Use when unifying fragmented memory systems, implementing semantic vector search, or migrating to AgentDB-backed memory architecture.
---

# V3 Memory Unification

Consolidates 6+ separate memory systems into a single unified AgentDB backend with 1536-dimension HNSW indexing, semantic search, and cross-agent synchronization.

## Quick Start

```bash
npx claude-flow sparc run memory-manager "unify all memory systems to AgentDB backend"
```

## Problem: Fragmented Memory Systems

```
Legacy Systems (6+ separate implementations):
  ├── MemoryManager          — basic key-value storage
  ├── DistributedMemorySystem — cross-agent sync (complex)
  ├── SwarmMemory            — swarm-specific state
  ├── AdvancedMemoryManager  — ML-enhanced retrieval
  ├── SQLiteBackend          — persistent structured data
  ├── MarkdownBackend        — human-readable notes
  └── HybridBackend          — attempts to bridge all above

Problems:
  - Different APIs for each system
  - Duplicate data across systems
  - No semantic search capability
  - Complex synchronization logic
  - 6x maintenance overhead
```

## Target: Unified Architecture

```
Unified AgentDB Backend:
  ├── Single query interface for all memory types
  ├── 1536-dimension embeddings (OpenAI compatible)
  ├── HNSW indexing — 150x–12,500x search speedup
  ├── Cross-agent memory sharing out of the box
  └── Sub-100ms query latency at 1M+ entries
```

## Implementation

### Unified Memory Interface
```typescript
interface UnifiedMemory {
  store(key: string, content: string, metadata?: MemoryMetadata): Promise<void>;
  retrieve(key: string): Promise<MemoryEntry | null>;
  search(query: string, options?: SearchOptions): Promise<MemoryEntry[]>;
  delete(key: string): Promise<void>;
  sync(agents: string[]): Promise<void>;
}
```

### AgentDB Adapter
```typescript
class AgentDBMemoryAdapter implements UnifiedMemory {
  private db: AgentDB;
  private embedder: Embedder;
  
  constructor() {
    this.db = new AgentDB({
      dimensions: 1536,
      indexType: 'hnsw',
      hnswParams: { M: 16, efConstruction: 200, efSearch: 100 },
    });
    this.embedder = new Embedder({ model: 'text-embedding-3-small' });
  }
  
  async store(key: string, content: string, metadata?: MemoryMetadata): Promise<void> {
    const embedding = await this.embedder.embed(content);
    await this.db.upsert(key, embedding, { content, ...metadata, timestamp: Date.now() });
  }
  
  async search(query: string, options?: SearchOptions): Promise<MemoryEntry[]> {
    const queryEmbedding = await this.embedder.embed(query);
    return this.db.search(queryEmbedding, {
      topK: options?.topK ?? 10,
      threshold: options?.threshold ?? 0.75,
      filter: options?.filter,
    });
  }
}
```

## Migration Phases

### Phase 1: Foundation — AgentDB Adapter
```typescript
// Drop-in replacement adapters preserving existing APIs
const legacyMemoryManager = new AgentDBMemoryAdapter(); // implements MemoryManager API
const legacySwarmMemory = new AgentDBMemoryAdapter();   // implements SwarmMemory API
```

### Phase 2: Data Migration
```bash
# Migrate existing SQLite data
npx claude-flow memory migrate --from sqlite --to agentdb

# Migrate Markdown notes
npx claude-flow memory migrate --from markdown --to agentdb --embed-content

# Verify migration
npx claude-flow memory verify --compare-counts --sample-queries 100
```

### Phase 3: SONA Integration
```typescript
// Connect SONA learning pattern storage
await sona.setMemoryBackend(new AgentDBMemoryAdapter({
  namespace: 'sona-patterns',
  adaptationMode: 'real-time',  // <0.05ms
}));
```

## Cross-Agent Memory Sync

```bash
# Synchronize memory across swarm agents
npx claude-flow memory sync --agents all --strategy merge-latest

# Query cross-agent memory
npx claude-flow memory search "authentication implementation patterns" --agents all

# Namespace isolation per agent
npx claude-flow memory store --key "results" --namespace "agent-1" --content "..."
```

## Performance Targets
- Query latency: <100ms at 1M+ entries
- Memory efficiency: 50–75% improvement over legacy systems
- SONA adaptation: <0.05ms
- Cross-agent sync: <500ms for 10 agents
- Migration: zero downtime with adapter pattern
