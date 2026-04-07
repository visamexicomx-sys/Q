---
name: flow-nexus-swarm
description: Cloud-based AI agent swarm orchestration with multi-topology support, event-driven workflows, template libraries, and intelligent agent assignment. Use for deploying and coordinating AI agent swarms in the cloud.
metadata:
  source: ruvnet/ruflo
  version: 1.0.0
---

# Flow Nexus Swarm & Workflow Orchestration

Cloud-based orchestration for AI agent swarms with multi-topology support, event-driven workflows, and intelligent agent assignment.

## Topologies

| Topology | Best For |
|----------|---------|
| `hierarchical` | Structured workflows, clear command structure |
| `mesh` | Distributed research, peer-to-peer collaboration |
| `ring` | Sequential pipeline processing |
| `star` | Centralized testing and validation |

## Agent Types

- `researcher` — Information gathering and analysis
- `coder` — Implementation and development
- `analyst` — Pattern analysis and insights
- `optimizer` — Performance improvement
- `coordinator` — Multi-agent orchestration

## Execution Strategies

- **Parallel** — Maximum concurrent execution
- **Sequential** — Step-by-step with dependencies
- **Adaptive** — Dynamic strategy based on task complexity

## Core Features

- **Workflow Dependencies** — Define task ordering and dependencies
- **Retry Policies** — Automatic retry with exponential backoff
- **Load Balancing** — Distribute work based on CPU and queue depth
- **Real-time Monitoring** — Track swarm progress live
- **Auto-scaling** — Dynamic agent count based on load

## Quick Start

```bash
# Initialize swarm
npx flow-nexus@latest swarm init --topology mesh --agents 5

# Monitor swarm
npx flow-nexus@latest swarm status
npx flow-nexus@latest swarm monitor --interval 5
```

## Workflow Automation

```bash
# Full-stack development
npx flow-nexus@latest swarm create \
  --template full-stack \
  --topology hierarchical \
  --agents 8

# Research and analysis
npx flow-nexus@latest swarm create \
  --template research \
  --topology mesh \
  --agents 6
```

## Best Practices

1. Start with 2-3 agents and scale up
2. Use consistent memory namespaces for context sharing
3. Monitor performance and set timeout thresholds
4. Use hooks for synchronization between agents
5. Progressive scaling: start small, add agents as needed

## Resources

- Docs: https://flow-nexus.ruv.io/docs
- Swarm Guide: https://flow-nexus.ruv.io/docs/swarm
