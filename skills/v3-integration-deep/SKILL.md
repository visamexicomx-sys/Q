---
name: v3-integration-deep
description: Deep integration strategy consolidating claude-flow with agentic-flow@alpha. Transforms claude-flow from a parallel implementation into a specialized extension, eliminating 10,000+ duplicate lines. Leverages SONA learning modes, Flash Attention, AgentDB coordination, and 213 pre-built MCP tools. Use when integrating claude-flow with agentic-flow@alpha, eliminating code duplication between AI frameworks, or migrating to unified agent infrastructure.
---

# V3 Integration Deep

Transforms claude-flow from a parallel implementation into a specialized extension built on top of agentic-flow@alpha, reducing from 15,000+ to under 5,000 orchestration lines.

## Quick Start

```bash
npm install agentic-flow@alpha
npx claude-flow sparc run architect "integrate claude-flow v3 with agentic-flow@alpha"
```

## Core Goal: Eliminate Duplication

```
Before:
  claude-flow:     SwarmCoordinator (2,000+ lines)
  agentic-flow:    SwarmCoordinator (2,000+ lines)  ← DUPLICATE
  
  claude-flow:     AgentManager (1,500+ lines)
  agentic-flow:    AgentManager (1,500+ lines)      ← DUPLICATE
  
  Total duplication: 10,000+ lines

After:
  claude-flow extends agentic-flow
  claude-flow total: <5,000 specialized lines
```

## Components Being Replaced

| claude-flow Component | Replaced By |
|----------------------|-------------|
| `SwarmCoordinator` | agentic-flow `SwarmEngine` |
| `AgentManager` | agentic-flow `AgentRegistry` |
| `TaskScheduler` | agentic-flow `TaskOrchestrator` |
| `MemoryManager` | agentic-flow `AgentDB` |
| Custom MCP tools | agentic-flow 213 pre-built tools |

## Key Integrations

### SONA Learning Modes (5 adaptation strategies)
| Mode | Latency | Use Case |
|------|---------|---------|
| Real-time | ~0.05ms | Live adaptation during task |
| Balanced | ~1ms | Default production mode |
| Research | ~10ms | Deep pattern analysis |
| Edge | ~0.5ms | Resource-constrained environments |
| Batch | Async | Offline learning from history |

```typescript
import { SonaLearning } from 'agentic-flow';
const sona = new SonaLearning({ mode: 'balanced' });
await sona.adapt({ context: currentTask, patterns: storedPatterns });
```

### Flash Attention Integration
- Target speedup: 2.49x–7.47x
- Memory reduction: 50–75%

```typescript
import { FlashAttention } from 'agentic-flow/neural';
const attention = new FlashAttention({ precision: 'bf16', chunkSize: 1024 });
const output = await attention.compute(query, key, value);
```

### AgentDB Coordination
- Cross-agent memory sharing
- HNSW indexing for 150x–12,500x search speedup
- 1536-dimension embeddings

```typescript
import { AgentDB } from 'agentic-flow/agentdb';
const db = new AgentDB({ dimensions: 1536, indexType: 'hnsw' });
await db.store('task-context', embedding, { agentId, taskId, timestamp });
const similar = await db.search(queryEmbedding, { topK: 10, threshold: 0.85 });
```

### MCP Tools (213 pre-built)
```typescript
// Instead of building custom MCP tools:
import { mcpTools } from 'agentic-flow/mcp';

// Access all 213 tools via unified registry
const tool = mcpTools.get('memory_search');
const result = await tool.execute({ query: 'auth implementation patterns' });
```

## Migration Phases

### Phase 1: Adapter Layer (backward compatibility)
```typescript
// Wrap agentic-flow with claude-flow API surface
class SwarmCoordinator extends AgentFlowSwarmEngine {
  // Preserve existing claude-flow API
  async createSwarm(config: ClaudeFlowSwarmConfig): Promise<Swarm> {
    return super.createSwarm(this.mapConfig(config));
  }
}
```

### Phase 2: Core Migration
```typescript
// Replace claude-flow implementations with agentic-flow equivalents
// Remove adapter layer for migrated components
```

### Phase 3: Deprecation
```typescript
// Remove deprecated code
// Update documentation and examples
// Final codebase: <5,000 lines
```

## Success Criteria
- 100% feature parity with claude-flow v2
- 10,000+ lines eliminated
- All agentic-flow performance improvements inherited:
  - Flash Attention: 2.49x–7.47x speedup
  - AgentDB: 150x–12,500x search improvement
  - SONA: <0.05ms adaptation
- Zero API breaking changes for existing claude-flow users
