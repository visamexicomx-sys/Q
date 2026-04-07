---
name: v3-performance-optimization
description: Comprehensive performance optimization for claude-flow v3 across Flash Attention, HNSW vector search, swarm coordination, SONA learning, and cold start. Includes automated benchmarking suite, regression detection, and real-time performance monitoring. Use when benchmarking claude-flow v3 performance, implementing Flash Attention acceleration, diagnosing performance regressions, or establishing performance baselines.
---

# V3 Performance Optimization

Comprehensive benchmarking and optimization suite for claude-flow v3 targeting Flash Attention acceleration, HNSW search improvements, and sub-500ms cold start.

## Quick Start

```bash
# Run full benchmark suite
npx claude-flow@v3 perf benchmark --all

# Run specific benchmark
npx claude-flow@v3 perf benchmark --suite flash-attention

# Real-time monitoring
npx claude-flow@v3 perf monitor --live
```

## Performance Targets

| Dimension | Target | Measurement |
|-----------|--------|------------|
| Flash Attention | 2.49x–7.47x speedup | vs standard attention |
| Flash Attention memory | 50–75% reduction | at 4K tokens |
| HNSW search | 150x–12,500x faster | vs linear scan |
| Cold start (CLI) | <500ms | time to first output |
| SONA adaptation | <0.05ms | learning mode: real-time |
| 15-agent swarm | <2s total | parallel task completion |

## Benchmark Suite (6 Domains)

### 1. Startup Latency
```typescript
const startupBench = new StartupBenchmark();
await startupBench.run({
  scenarios: ['cli-init', 'mcp-server-init', 'agent-spawning'],
  iterations: 100,
  warmupRuns: 10,
});
```

### 2. Vector Search
```typescript
const vectorBench = new VectorSearchBenchmark();
await vectorBench.run({
  datasetSizes: [1000, 10000, 100000, 1000000],
  dimensions: 1536,
  topK: 10,
  indexType: 'hnsw',
});
// Reports: ops/sec, memory usage, accuracy (recall@10)
```

### 3. Swarm Coordination (15 agents)
```typescript
const swarmBench = new SwarmCoordinationBenchmark();
await swarmBench.run({
  agentCount: 15,
  topology: 'hierarchical-mesh',
  taskComplexity: ['low', 'medium', 'high'],
});
// Reports: parallel efficiency, coordination overhead, task completion time
```

### 4. Flash Attention
```typescript
const flashBench = new FlashAttentionBenchmark();
await flashBench.run({
  sequenceLengths: [512, 1024, 2048, 4096, 8192],
  headDim: 64,
  numHeads: 8,
  precision: 'bf16',
});
// Reports: speedup vs standard, memory reduction, numerical accuracy
```

### 5. SONA Learning Modes
```typescript
const sonaBench = new SonaAdaptationBenchmark();
await sonaBench.run({
  modes: ['real-time', 'balanced', 'research', 'edge', 'batch'],
  scenarios: 5,
  iterations: 1000,
});
// Reports: adaptation latency, quality improvement over time
```

### 6. Real-Time Performance Monitor
```typescript
const monitor = new PerformanceMonitor({
  metrics: ['latency', 'throughput', 'memory', 'cpu'],
  regressionThreshold: 0.05,  // 5% degradation triggers alert
  dashboardEnabled: true,
});
monitor.start();
```

## Automated Performance Gates

```typescript
class PerformanceGate {
  async validate(): Promise<GateResult> {
    const results = await this.runAllBenchmarks();
    return {
      passed: this.checkAllTargets(results),
      trends: this.analyzeTrends(results),
      recommendations: this.generateRecommendations(results),
    };
  }
}
```

## Regression Detection

```bash
# Compare against baseline
npx claude-flow@v3 perf compare --baseline v2.0.0 --threshold 5%

# Check specific dimension
npx claude-flow@v3 perf compare --suite startup-latency --threshold 10%

# Generate regression report
npx claude-flow@v3 perf report --format html --output perf-report.html
```

## Continuous Monitoring

```json
// .claude-flow/config.json
{
  "performance": {
    "monitoring": {
      "enabled": true,
      "regressionThreshold": 0.05,
      "alertChannels": ["console", "file"],
      "dashboardPort": 3001,
      "collectInterval": 1000
    }
  }
}
```

## Optimization Checklist
- [ ] Flash Attention enabled (bf16 precision)
- [ ] HNSW index built with M=16, efConstruction=200
- [ ] MCP connection pool pre-warmed (10 connections)
- [ ] SQLite WAL mode enabled
- [ ] SONA mode set to 'balanced' for production
- [ ] Model cache: 512MB+
- [ ] Parallel worker execution enabled
- [ ] Performance gates in CI/CD pipeline
