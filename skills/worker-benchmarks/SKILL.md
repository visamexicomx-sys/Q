---
name: worker-benchmarks
description: Run comprehensive worker system benchmarks and performance analysis for agentic-flow. Measures trigger detection, registry operations, agent selection, model cache, concurrent workers, and memory key performance. Use when validating worker system performance, diagnosing bottlenecks, or establishing performance baselines.
---

# Worker Benchmarks

Comprehensive benchmarking suite for the agentic-flow worker system, covering trigger detection, registry operations, agent selection, caching, concurrency, and memory key performance.

## Quick Start

```bash
# Run all benchmarks
npx agentic-flow workers benchmark

# Run specific benchmark type
npx agentic-flow workers benchmark --type trigger-detection
```

## Benchmark Types

| Type | Target (p95) | Iterations | Measures |
|------|-------------|------------|---------|
| `trigger-detection` | < 5ms | 1,000 | Pattern matching speed |
| `registry` | < 10ms (CRUD) | 500 | Worker registration ops |
| `agent-selection` | < 1ms | 1,000 | Selection algorithm speed |
| `cache` (model) | < 0.5ms | — | Model cache hit/miss |
| `concurrent` (10 workers) | total < 1000ms | — | Parallel execution overhead |
| `memory-keys` | < 0.1ms | 5,000 | Memory key operations |

## Commands

```bash
# All benchmarks
npx agentic-flow workers benchmark

# Specific type
npx agentic-flow workers benchmark --type trigger-detection
npx agentic-flow workers benchmark --type registry
npx agentic-flow workers benchmark --type agent-selection
npx agentic-flow workers benchmark --type cache
npx agentic-flow workers benchmark --type concurrent
npx agentic-flow workers benchmark --type memory-keys

# With detailed output
npx agentic-flow workers benchmark --verbose

# JSON output for CI
npx agentic-flow workers benchmark --json
```

## Output Format

```
Worker System Benchmark Results
================================
Trigger Detection:    avg=2.1ms  p95=4.3ms  throughput=476 ops/s  ✅ PASS
Registry CRUD:        avg=4.2ms  p95=8.7ms  throughput=238 ops/s  ✅ PASS
Agent Selection:      avg=0.3ms  p95=0.8ms  throughput=3333 ops/s ✅ PASS
Model Cache:          avg=0.1ms  p95=0.4ms  hit-rate=96.5%        ✅ PASS
Concurrent (10):      total=823ms overhead=82ms/worker             ✅ PASS
Memory Keys:          avg=0.02ms p95=0.09ms throughput=50000 ops/s ✅ PASS

Summary: 6/6 passed | Memory delta: +12.3MB
```

## Programmatic Usage

```typescript
import { workerBenchmarks, runBenchmarks } from 'agentic-flow/workers/worker-benchmarks';

// Run full suite
const suite = await runBenchmarks();
console.log(suite.results);
console.log(`Passed: ${suite.passed}/${suite.total}`);

// Run specific benchmark
const result = await workerBenchmarks.triggerDetection({ iterations: 1000 });
console.log(`p95: ${result.p95}ms`);
```

## Optimization

```bash
# Increase model cache size
export CLAUDE_FLOW_MODEL_CACHE_MB=512

# Enable parallel worker execution
export CLAUDE_FLOW_WORKER_PARALLEL=true

# SQLite WAL mode (automatic when workers enabled)
# Provides ~3x throughput improvement for concurrent reads
```

## Configuration

`.claude/settings.json`:
```json
{
  "performance": {
    "benchmarkThresholds": {
      "triggerDetection": { "p95": 5 },
      "registry": { "p95": 10 },
      "agentSelection": { "p95": 1 },
      "modelCache": { "p95": 0.5 },
      "concurrent": { "total": 1000 },
      "memoryKeys": { "p95": 0.1 }
    }
  }
}
```
