---
name: V3 Swarm Coordination
description: 15-agent hierarchical mesh coordination for claude-flow v3 implementation. Orchestrates parallel execution across security, core, and integration domains following 10 ADRs with a 14-week timeline. Use when coordinating large-scale multi-agent software development projects requiring structured agent roles, dependency management, and parallel execution tracking.
---

# V3 Swarm Coordination

Orchestrates a complete 15-agent hierarchical mesh swarm for claude-flow v3 development, spanning security, core systems, integration, and release engineering.

## Quick Start

```bash
npx claude-flow sparc run swarm-coordinator "orchestrate v3 implementation with 15-agent mesh"
```

## Agent Roster

| ID | Agent | Domain | Responsibilities |
|----|-------|--------|-----------------|
| 1 | Queen Coordinator | Orchestration | Master coordination, dependency management, milestone tracking |
| 2 | Security Architect | Security | CVE resolution, threat modeling, security ADRs |
| 3 | Security Implementer | Security | bcrypt, Zod, path sanitization implementation |
| 4 | Security Tester | Security | Penetration testing, vulnerability scanning |
| 5 | Core Architect | Core | DDD domain design, clean architecture patterns |
| 6 | Core Implementer | Core | AgentDB integration, service implementations |
| 7 | Memory Specialist | Core | AgentDB-backed memory unification |
| 8 | Swarm Specialist | Core | QUIC sync, mesh topology, load balancing |
| 9 | MCP Specialist | Core | Connection pooling, fast tool registry |
| 10 | Integration Architect | Integration | agentic-flow@alpha deep integration design |
| 11 | CLI/Hooks Engineer | Integration | Interactive CLI, hook automation |
| 12 | Neural/Learning Engineer | Integration | SONA neural patterns, ReasoningBank |
| 13 | TDD Test Engineer | Quality | Red-green-refactor, 90%+ coverage |
| 14 | Performance Engineer | Performance | Flash Attention, HNSW benchmarking |
| 15 | Release Engineer | Deployment | CI/CD, changelog, v3.0.0 release |

## 4-Phase Implementation Timeline (14 weeks)

### Phase 1 — Security Foundation + Core Architecture (Weeks 1–2)
- Agents 2–4: CVE resolution, security hardening
- Agents 5–6: DDD domain design, repository patterns
- Deliverable: Secure base + architecture ADRs

### Phase 2 — Core Systems (Weeks 3–6)
- Agents 7–9: AgentDB memory, swarm engine, MCP optimization
- Agent 13: TDD framework setup
- Deliverable: AgentDB integration, QUIC sync, MCP pooling

### Phase 3 — Integration (Weeks 7–10)
- Agents 10–12: agentic-flow, CLI modernization, neural patterns
- Agent 14: Performance benchmarking
- Deliverable: Full integration, CLI rewrite, Flash Attention

### Phase 4 — Release (Weeks 11–14)
- All agents: Final optimization, CI/CD, v3.0.0
- Agent 15: Release automation
- Deliverable: Production v3.0.0

## Coordination Patterns

### Dependency Management
```typescript
class DependencyCoordination {
  async checkReady(agentId: number): Promise<boolean> {
    const deps = this.getDependencies(agentId);
    return deps.every(dep => this.completedAgents.has(dep));
  }
  
  async notifyComplete(agentId: number, artifacts: string[]): Promise<void> {
    this.completedAgents.add(agentId);
    await this.quicBus.broadcast({ type: 'agent-complete', agentId, artifacts });
  }
}
```

### QUIC Communication
```bash
# Inter-agent messaging via QuicSwarmBus
npx claude-flow swarm message --from queen --to security-architect "begin CVE audit"
npx claude-flow swarm status --all
npx claude-flow swarm redistribute --threshold 0.8
```

## Success Targets
- Agent utilization: >85%
- Inter-agent messaging latency: <100ms
- Flash Attention improvement: 2.49x–7.47x
- AgentDB search improvement: 150x–12,500x
- Total codebase: <5,000 lines
- Test coverage: >90%
