---
name: agentdb-learning
description: Create and train AI learning plugins using AgentDB's reinforcement learning framework. Supports 9 algorithms including Decision Transformer, Q-Learning, SARSA, and Actor-Critic. Use when building self-learning agents or experience replay systems.
metadata:
  source: ruvnet/ruflo
  version: 1.0.0
---

# AgentDB Learning Plugins

Create, train, and deploy learning plugins for autonomous agents that improve through experience. Train models 10-100x faster with WASM-accelerated neural inference.

## When to Use

- Building self-learning agents that improve from experience
- Implementing reinforcement learning in agent workflows
- Creating experience replay systems
- Training specialized models for domain-specific tasks

## Prerequisites

- Node.js 18+
- AgentDB v1.0.7+ (via agentic-flow)
- Basic reinforcement learning knowledge (recommended)

## Nine Learning Algorithms

1. **Decision Transformer** — offline RL from demonstration data
2. **Q-Learning** — value-based, off-policy
3. **SARSA** — value-based, on-policy
4. **Actor-Critic** — policy gradient methods
5. **Active Learning** — query-based learning
6. **Adversarial Training** — robustness through adversarial examples
7. **Curriculum Learning** — progressive difficulty scheduling
8. **Federated Learning** — distributed training across nodes
9. **Multi-Task Learning** — transfer learning across domains

## Core Workflow

```typescript
import { createAgentDBAdapter } from 'agentic-flow/reasoningbank';

const adapter = await createAgentDBAdapter({
  dbPath: '.agentdb/learning.db',
  enableLearning: true,
  enableReasoning: true,
});

// 1. Collect agent experiences
// 2. Train models on accumulated data
// 3. Evaluate through pattern retrieval and reasoning integration
```

## Performance

- WASM-accelerated inference: **10-100x faster** than pure JS
- Pattern retrieval: **<1ms**
- Training updates: Real-time with batch processing

## Setup

```bash
npx agentdb@latest init ./.agentdb/learning.db
```

## Category

Machine Learning / Reinforcement Learning | Difficulty: Intermediate | Time: 30-60 minutes
