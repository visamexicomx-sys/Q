---
name: swarm-advanced
description: Advanced swarm orchestration patterns for research, development, testing, and distributed workflows. Implements mesh, hierarchical, star, and ring topologies with neural pattern learning, fault tolerance, memory/state management, and performance monitoring. Use when orchestrating complex multi-agent systems requiring parallel execution, adaptive coordination, or production-grade swarm reliability.
---

# Swarm Advanced

Advanced multi-pattern swarm orchestration with 4 topology types, fault tolerance, neural learning, and comprehensive monitoring.

## Quick Start

```bash
# Research swarm (mesh, 6 agents)
npx claude-flow swarm "research AI trends" --strategy research --mode distributed --max-agents 6 --parallel --output report.md

# Development swarm (hierarchical, 8 agents)
npx claude-flow swarm "build authentication service" --strategy development --mode hierarchical --max-agents 8

# Testing swarm (star, 7 agents)
npx claude-flow swarm "comprehensive test suite" --strategy testing --mode star --max-agents 7

# Analysis swarm (mesh, 5 agents)
npx claude-flow swarm "codebase analysis" --strategy analysis --mode mesh --max-agents 5
```

## Pattern 1: Research Swarm (Mesh, 6 agents)

Peer-to-peer collaboration for investigation and knowledge synthesis.

**Phases:** Information Gathering → Analysis/Validation → Knowledge Management → Report Generation

```javascript
// MCP approach
await mcp__claude_flow__swarm_init({ topology: 'mesh', maxAgents: 6, strategy: 'research' });
const agents = await mcp__claude_flow__agent_spawn({ roles: ['researcher', 'analyst', 'validator', 'synthesizer', 'fact-checker', 'reporter'] });
await mcp__claude_flow__parallel_execute({ agents, task: 'investigate AI trends 2025' });
await mcp__claude_flow__pattern_recognize({ domain: 'research', extractInsights: true });
await mcp__claude_flow__workflow_execute({ workflow: 'research-report', output: 'report.md' });
```

## Pattern 2: Development Swarm (Hierarchical, 8 agents)

Coordinator + specialized workers for structured software delivery.

**Team:** architect, backend dev, frontend dev, DB engineer, QA, code reviewer, tech writer, DevOps
**Phases:** Architecture/Design → Parallel Implementation → Testing/Validation → Review/Deployment

```javascript
await mcp__claude_flow__task_orchestrate({ coordinator: 'architect', workers: ['backend', 'frontend', 'db', 'qa', 'reviewer', 'writer', 'devops'] });
await mcp__claude_flow__parallel_execute({ strategy: 'hierarchical', dependencies: true });
await mcp__claude_flow__quality_assess({ threshold: 0.90 });
await mcp__claude_flow__pipeline_create({ stages: ['build', 'test', 'review', 'deploy'] });
```

## Pattern 3: Testing Swarm (Star, 7 agents)

Centralized test coordination with specialized testers.

**Team:** unit, integration, E2E, performance, security testers + analyst + documenter

```javascript
await mcp__claude_flow__swarm_init({ topology: 'star', maxAgents: 7, strategy: 'testing' });
await mcp__claude_flow__benchmark_run({ suites: ['unit', 'integration', 'e2e', 'performance', 'security'] });
await mcp__claude_flow__security_scan({ depth: 'comprehensive', report: true });
await mcp__claude_flow__performance_report({ format: 'detailed', include: ['bottlenecks', 'recommendations'] });
```

## Pattern 4: Analysis Swarm (Mesh, 5 agents)

Distributed codebase analysis across multiple dimensions.

**Team:** code, security, performance, architecture analyzers + reporter

```javascript
await mcp__claude_flow__parallel_execute({ analyzers: ['code', 'security', 'performance', 'architecture'] });
await mcp__claude_flow__cost_analysis({ dimensions: ['complexity', 'maintainability', 'security', 'performance'] });
```

## Advanced Techniques

### Fault Tolerance
```javascript
await mcp__claude_flow__daa_fault_tolerance({ strategy: 'retry-reassign', maxRetries: 3 });
await mcp__claude_flow__error_analysis({ rootCause: true, autoFix: true });
```

### Memory & State Management
```javascript
await mcp__claude_flow__memory_persist({ namespace: 'swarm-session', ttl: 86400 });
await mcp__claude_flow__state_snapshot({ checkpoint: 'pre-deployment' });
await mcp__claude_flow__context_restore({ checkpoint: 'pre-deployment' });
await mcp__claude_flow__memory_backup({ destination: '.swarm-memory/backup' });
```

### Neural Pattern Learning
```javascript
await mcp__claude_flow__neural_train({ patterns: 'successful-completions', epochs: 10 });
await mcp__claude_flow__learning_adapt({ mode: 'continuous', threshold: 0.85 });
await mcp__claude_flow__pattern_recognize({ domain: 'orchestration', topK: 5 });
```

### Performance Optimization
```javascript
await mcp__claude_flow__topology_optimize({ metric: 'latency', target: '<100ms' });
await mcp__claude_flow__load_balance({ strategy: 'work-stealing', threshold: 0.8 });
await mcp__claude_flow__swarm_scale({ min: 3, max: 20, autoScale: true });
```

### Monitoring
```javascript
await mcp__claude_flow__swarm_monitor({ realtime: true, dashboard: true });
await mcp__claude_flow__metrics_collect({ dimensions: ['latency', 'throughput', 'quality', 'cost'] });
await mcp__claude_flow__health_check({ agents: 'all', interval: 30 });
```
