---
name: agentic-jujutsu
description: Quantum-resistant, self-learning version control for AI agents with ReasoningBank intelligence and multi-agent coordination. 23x faster than Git, 87% automatic conflict resolution, lock-free concurrent commits. Use when multiple AI agents need to work on code simultaneously without conflicts.
metadata:
  source: ruvnet/ruflo
  version: 2.3.2
---

# Agentic Jujutsu — AI Agent Version Control

Quantum-ready, self-learning version control designed for multiple AI agents working simultaneously without conflicts.

## When to Use

- Multiple AI agents modifying code simultaneously
- Lock-free version control (23x faster than Git)
- Self-learning AI that improves from experience
- Quantum-resistant security
- Automatic conflict resolution (87% success rate)
- Pattern recognition and intelligent suggestions

## Installation

```bash
npx agentic-jujutsu
```

## Quick Start

```javascript
const { JjWrapper } = require('agentic-jujutsu');

const jj = new JjWrapper();

// Basic operations
await jj.status();
await jj.newCommit('Add feature');
await jj.log(10);

// Self-learning trajectory
const id = jj.startTrajectory('Implement authentication');
await jj.branchCreate('feature/auth');
await jj.newCommit('Add auth');
jj.addToTrajectory();
jj.finalizeTrajectory(0.9, 'Clean implementation');

// Get AI suggestions
const suggestion = JSON.parse(jj.getSuggestion('Add logout feature'));
console.log(`Confidence: ${suggestion.confidence}`);
```

## Self-Learning (ReasoningBank)

```javascript
// 1. Start trajectory tracking
jj.startTrajectory('Deploy to production');

// 2. Perform operations (auto-tracked)
await jj.execute(['git', 'push', 'origin', 'main']);
await jj.branchCreate('release/v1.0');
await jj.newCommit('Release v1.0');

// 3. Record and finalize
jj.addToTrajectory();
jj.finalizeTrajectory(0.95, 'Deployment successful');

// 4. Get AI suggestions for similar tasks
const suggestion = JSON.parse(jj.getSuggestion('Deploy to staging'));
```

## Multi-Agent Coordination (No Conflicts!)

```javascript
// All agents work concurrently — no locking required
const agents = ['agent1', 'agent2', 'agent3'];
await Promise.all(agents.map(async (agent) => {
  const jj = new JjWrapper();
  jj.startTrajectory(`Changes by ${agent}`);
  await jj.newCommit(`${agent}: feature implementation`);
  jj.addToTrajectory();
  jj.finalizeTrajectory(0.9);
}));
```

## Quantum-Resistant Security (v2.3.0+)

```javascript
const { generateQuantumFingerprint, verifyQuantumFingerprint } = require('agentic-jujutsu');

// SHA3-512 fingerprint (NIST FIPS 202)
const fingerprint = generateQuantumFingerprint(Buffer.from('commit-data'));
const isValid = verifyQuantumFingerprint(data, fingerprint);

// HQC-128 encryption for trajectories
jj.enableEncryption(key);
```

## ReasoningBank API

| Method | Description |
|--------|-------------|
| `startTrajectory(task)` | Begin learning trajectory |
| `addToTrajectory()` | Add recent operations |
| `finalizeTrajectory(score, critique?)` | Complete (score: 0.0-1.0) |
| `getSuggestion(task)` | Get AI recommendation |
| `getLearningStats()` | Learning metrics |
| `getPatterns()` | Discovered patterns |
| `queryTrajectories(task, limit)` | Find similar trajectories |

## Performance vs Git

| Metric | Git | Agentic Jujutsu |
|--------|-----|-----------------|
| Concurrent commits | 15 ops/s | 350 ops/s (23x) |
| Context switching | 500-1000ms | 50-100ms (10x) |
| Conflict resolution | 30-40% auto | 87% auto (2.5x) |
| Lock waiting | 50 min/day | 0 min (∞) |

## Validation Rules (v2.3.1+)

- Task descriptions: non-empty, max 10KB
- Success scores: 0.0 to 1.0 (finite)
- Must have at least one operation before `finalizeTrajectory()`

## Best Practices

1. Use meaningful task descriptions (not "fix stuff")
2. Honest success scores — always 1.0 prevents learning
3. Record failures with details for better pattern recognition
4. Use concurrent operations — no locking needed

## Resources

- NPM: https://npmjs.com/package/agentic-jujutsu
- GitHub: https://github.com/ruvnet/agentic-flow/tree/main/packages/agentic-jujutsu
