---
name: v3-ddd-architecture
description: Domain-Driven Design architecture for claude-flow v3. Decomposes god objects into bounded contexts with clean separation of concerns and microkernel plugin pattern. Use when refactoring large monolithic files into DDD domains, implementing bounded context isolation, or designing extensible plugin architectures for Claude Code systems.
---

# V3 DDD Architecture

Decomposes the 1,440-line `core/orchestrator.ts` god object into 5 bounded contexts under 300 lines each, implementing clean architecture with microkernel extensibility.

## Quick Start

```bash
npx claude-flow sparc run architect "decompose orchestrator.ts into DDD bounded contexts"
```

## Problem: God Object

```
core/orchestrator.ts — 1,440 lines (GOD OBJECT)
  ├── Task management (createTask, assignTask, completeTask)
  ├── Session management (createSession, restoreSession)
  ├── Health monitoring (checkHealth, collectMetrics)
  ├── Lifecycle management (initialize, shutdown, restart)
  └── Event coordination (publish, subscribe, dispatch)
```

## Target DDD Structure

```
core/domains/
  ├── task-management/
  │   ├── entities/Task.ts, TaskQueue.ts
  │   ├── value-objects/TaskId.ts, TaskStatus.ts, Priority.ts
  │   ├── services/TaskScheduler.ts, TaskValidator.ts
  │   └── repositories/ITaskRepository.ts
  ├── session-management/
  │   ├── entities/Session.ts, SessionState.ts
  │   ├── value-objects/SessionId.ts, SessionStatus.ts
  │   └── services/SessionLifecycle.ts, SessionPersistence.ts
  ├── health-monitoring/
  │   ├── entities/HealthCheck.ts, Metric.ts
  │   ├── value-objects/HealthStatus.ts, Threshold.ts
  │   └── services/HealthCollector.ts, AlertManager.ts
  ├── lifecycle-management/
  └── event-coordination/
core/shared/
  ├── interfaces/
  ├── value-objects/
  └── domain-events/
```

## 5 Bounded Context Interfaces

### TaskManagementDomain
```typescript
interface TaskManagementDomain {
  entities: { Task, TaskQueue }
  valueObjects: { TaskId, TaskStatus, Priority }
  services: { TaskScheduler, TaskValidator }
  repositories: { ITaskRepository }
}
```

### SessionManagementDomain
```typescript
interface SessionManagementDomain {
  entities: { Session, SessionState }
  valueObjects: { SessionId, SessionStatus }
  services: { SessionLifecycle, SessionPersistence }
}
```

### HealthMonitoringDomain
```typescript
interface HealthMonitoringDomain {
  entities: { HealthCheck, Metric }
  valueObjects: { HealthStatus, Threshold }
  services: { HealthCollector, AlertManager }
}
```

## Microkernel Architecture

```typescript
class ClaudeFlowKernel {
  private domains = new Map<string, Domain>();
  
  async loadDomain(plugin: DomainPlugin): Promise<void> {
    await plugin.initialize(this);
    this.domains.set(plugin.name, plugin);
    this.wireDomainEvents(plugin);
  }
  
  getDomain<T extends Domain>(name: string): T {
    return this.domains.get(name) as T;
  }
}

// Plugin interface
interface DomainPlugin {
  name: string;
  version: string;
  dependencies: string[];   // Other domains this plugin requires
  initialize(kernel: ClaudeFlowKernel): Promise<void>;
  shutdown(): Promise<void>;
}

// Example plugin
class SwarmCoordinationPlugin implements DomainPlugin {
  name = 'swarm-coordination';
  version = '3.0.0';
  dependencies = ['task-management', 'session-management'];
  
  async initialize(kernel: ClaudeFlowKernel): Promise<void> {
    const tasks = kernel.getDomain<TaskManagementDomain>('task-management');
    const sessions = kernel.getDomain<SessionManagementDomain>('session-management');
    this.coordinator = new SwarmCoordinator(tasks, sessions);
  }
}
```

## Domain Events

```typescript
// Base event
abstract class DomainEvent {
  readonly eventId: string = crypto.randomUUID();
  readonly occurredOn: Date = new Date();
  readonly eventVersion: number = 1;
  constructor(readonly aggregateId: string) {}
}

// Concrete events
class TaskAssignedEvent extends DomainEvent {
  constructor(taskId: string, readonly agentId: string) { super(taskId); }
}

class TaskCompletedEvent extends DomainEvent {
  constructor(taskId: string, readonly result: string) { super(taskId); }
}

// Handler
@EventHandler(TaskCompletedEvent)
async onTaskCompleted(event: TaskCompletedEvent): Promise<void> {
  await this.metrics.increment('tasks.completed');
  await this.sessions.updateState(event.aggregateId, 'task-completed');
}
```

## Migration Strategy

```
Week 1: Extract TaskManager → task-management domain
         Extract SessionManager → session-management domain
Week 2: Extract HealthMonitor → health-monitoring domain
         Extract LifecycleManager → lifecycle-management domain  
Week 3: Extract EventCoordinator → event-coordination domain
         Wire cross-domain events via kernel
```

## Success Metrics
- `orchestrator.ts` (1,440 lines) → 5 domains (<300 lines each)
- 100% bounded context isolation (no cross-domain imports)
- All cross-domain communication via domain events
- Plugin architecture: core + optional modules
- >90% domain logic test coverage
