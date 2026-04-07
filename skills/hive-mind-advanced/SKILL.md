---
name: hive-mind-advanced
description: Advanced Hive Mind collective intelligence system for queen-led multi-agent coordination with consensus mechanisms and persistent memory. Use when you need sophisticated multi-agent orchestration with collective decision-making and shared memory.
metadata:
  source: ruvnet/ruflo
  version: 1.0.0
---

# Hive Mind Advanced

The pinnacle of multi-agent coordination in Claude Flow — queen-led hierarchical architecture with collective intelligence.

## When to Use

- Complex projects requiring multiple specialized agents
- Systems requiring collective decision-making with consensus
- Long-running workflows needing persistent shared memory
- Tasks benefiting from queen-led strategic coordination

## Core Concepts

### Queen-Led Coordination
Three coordination modes:
- **Strategic** — Long-term planning and resource allocation
- **Tactical** — Real-time task assignment and monitoring
- **Adaptive** — Dynamic strategy adjustment based on results

### Worker Specialization (8 Agent Types)
`researcher`, `coder`, `tester`, `reviewer`, `architect`, `analyst`, `documenter`, `monitor`

### Collective Memory System
Persistent shared state accessible to all agents in the hive.

### Consensus Mechanisms
- **Majority** — Simple majority vote (>50%)
- **Weighted** — Weight by agent expertise
- **Byzantine** — Fault-tolerant consensus

## Getting Started

```bash
# Install Claude Flow
npm install -g claude-flow@alpha
claude mcp add claude-flow npx claude-flow@alpha mcp start

# Initialize hive mind
npx claude-flow hive-mind init \
  --queen-type strategic \
  --workers 8 \
  --memory-backend agentdb

# Spawn swarm from objective
npx claude-flow hive-mind spawn \
  --objective "Build REST API with authentication" \
  --topology hierarchical \
  --consensus weighted

# Monitor hive
npx claude-flow hive-mind monitor --real-time
```

## Advanced Workflows

```javascript
// Initialize hive with queen
mcp__claude-flow__swarm_init({ topology: "hierarchical", maxAgents: 8 })
mcp__claude-flow__agent_spawn({ type: "coordinator", name: "Queen Seraphina" })

// Spawn specialized workers
const workers = ["researcher", "coder", "tester", "reviewer"];
workers.forEach(type => {
  mcp__claude-flow__agent_spawn({ type, name: `${type}-worker` });
});

// Collective memory
mcp__claude-flow__memory_usage({
  action: "store",
  key: "collective-context",
  value: JSON.stringify(projectContext),
  namespace: "hive-mind"
});

// Build consensus
mcp__claude-flow__task_orchestrate({
  task: "Reach consensus on architecture decision",
  strategy: "consensus",
  priority: "high"
});
```

## Configuration

```json
{
  "hiveMind": {
    "queenType": "strategic",
    "maxWorkers": 10,
    "consensusThreshold": 0.67,
    "memoryTTL": 604800,
    "adaptiveScaling": true
  }
}
```

## Performance Optimization

- Enable HNSW-backed collective memory for fast retrieval
- Use memory namespaces to isolate different hive contexts
- Cache frequently accessed collective knowledge
- Set appropriate worker TTL to manage resources

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Memory overflow | Reduce worker count, enable pruning |
| Slow consensus | Lower consensus threshold, use majority voting |
| Poor coordination | Switch to hierarchical topology |
| High memory usage | Enable AgentDB compression |

## SPARC Integration

Works seamlessly with SPARC methodology:
```bash
npx claude-flow sparc run researcher "Analyze requirements"
npx claude-flow sparc run architect "Design system"
npx claude-flow sparc run coder "Implement features"
```

## API Reference

```typescript
class HiveMindCore {
  initializeHive(config: HiveConfig): Promise<Hive>;
  spawnWorker(type: WorkerType, task: string): Promise<Worker>;
  buildConsensus(question: string, mechanism: ConsensusMechanism): Promise<Decision>;
  getCollectiveMemory(namespace: string): Promise<Memory[]>;
}
```
