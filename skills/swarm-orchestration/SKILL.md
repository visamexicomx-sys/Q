---
name: swarm-orchestration
description: Orchestrate multi-agent swarms with agentic-flow for parallel task execution, dynamic topology, and intelligent coordination. Supports mesh, hierarchical, and adaptive topologies with shared memory, load balancing, and fault tolerance. Use when coordinating 2+ agents on parallelizable tasks, distributing workloads, or implementing adaptive multi-agent workflows.
---

# Swarm Orchestration

Multi-agent swarm coordination with agentic-flow supporting dynamic topology selection, shared memory, load balancing, and fault tolerance.

## Requirements
- agentic-flow v1.5.11+
- Node.js 18+

## Quick Start

```bash
# Basic 3-agent swarm
npx agentic-flow swarm init --agents 3 --topology mesh

# Hierarchical coordination
npx agentic-flow swarm init --agents 5 --topology hierarchical --coordinator lead

# Auto-orchestration (swarm decides strategy)
npx agentic-flow swarm run "implement REST API with tests" --auto
```

## Topology Options

| Topology | Structure | Best For |
|----------|-----------|---------|
| Mesh | Peer-to-peer | Research, analysis, collaboration |
| Hierarchical | Coordinator + workers | Development, structured delivery |
| Adaptive | Dynamic, auto-adjusts | Complex tasks with changing requirements |

## Execution Modes

- **Parallel** — All agents work simultaneously on independent tasks
- **Pipeline** — Sequential stages with dependencies (output of stage N feeds stage N+1)
- **Auto-orchestration** — Swarm analyzes task and selects optimal strategy

## Core Operations

```bash
# Initialize swarm
npx agentic-flow swarm init --agents <N> --topology <mesh|hierarchical|adaptive>

# Assign tasks
npx agentic-flow swarm assign --task "implement feature X" --strategy parallel

# Monitor swarm
npx agentic-flow swarm status
npx agentic-flow swarm metrics

# Scale agents
npx agentic-flow swarm scale --min 2 --max 10 --auto

# Shutdown
npx agentic-flow swarm stop --graceful
```

## Shared Memory

Enable agents to share context and coordinate:

```bash
# Write to shared memory
npx agentic-flow memory write --key "arch/decisions" --value "$(cat arch.md)"

# Read from shared memory
npx agentic-flow memory read --key "arch/decisions"

# Namespace isolation per agent
npx agentic-flow memory write --key "agent-1/results" --namespace agent-1 --value "..."
```

## Load Balancing

```bash
# CPU/memory-based load balancing
npx agentic-flow swarm balance --strategy resource-aware

# Work-stealing (idle agents pick up tasks from busy agents)
npx agentic-flow swarm balance --strategy work-stealing

# Round-robin
npx agentic-flow swarm balance --strategy round-robin
```

## Hook Integration

Automatic coordination via hooks in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [{ "type": "command", "command": "npx agentic-flow hooks pre-swarm" }],
    "PostToolUse": [{ "type": "command", "command": "npx agentic-flow hooks post-swarm --update-memory" }],
    "SessionStart": [{ "type": "command", "command": "npx agentic-flow swarm restore" }]
  }
}
```

## Practical Guidelines

1. **Start small** — Begin with 2–3 agents before scaling to larger swarms
2. **Use shared memory** — Always enable for tasks where agents need context from each other
3. **Monitor metrics** — Watch for agent bottlenecks; use adaptive topology for complex tasks
4. **Implement fault tolerance** — Enable retry and task reassignment for production swarms

## Common Issues

| Issue | Diagnosis | Fix |
|-------|-----------|-----|
| Coordination failures | Agents can't read shared memory | Verify memory access permissions, enable hooks |
| Performance bottlenecks | High latency between agents | Switch to adaptive topology, enable load balancing |
| Task duplication | Multiple agents working same task | Use hierarchical topology with coordinator |
| Memory overflow | Too many agents for available RAM | Reduce agent count, increase memory limits |
