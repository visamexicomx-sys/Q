---
name: v3-core-implementation
description: TypeScript framework implementing Domain-Driven Design (DDD) with clean architecture for claude-flow v3. Implements Entity/ValueObject/AggregateRoot base classes, repository pattern, dependency injection with Inversify, and application use cases. Use when building DDD-compliant TypeScript services, implementing clean architecture patterns, or migrating from anemic domain models to rich domain entities.
---

# V3 Core Implementation

TypeScript framework for claude-flow v3 using Domain-Driven Design with clean architecture, Inversify dependency injection, and repository pattern.

## Quick Start

```bash
npx claude-flow sparc run architect "implement DDD task management domain following v3 patterns"
```

## Architecture Pattern

Microkernel with bounded contexts and clean architecture layers:

```
Presentation (CLI/API/UI)
Application  (Use Cases / Commands / Queries)
Domain       (Entities / Value Objects / Domain Events)  ← no external deps
Infrastructure (DB / MCP / External APIs)
```

## Core DDD Abstractions

### Entity Base Class
```typescript
abstract class Entity<T extends { id: string }> {
  protected readonly _props: T;
  
  get id(): string { return this._props.id; }
  
  equals(other: Entity<T>): boolean {
    return this._props.id === other._props.id;
  }
  
  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }
  
  getDomainEvents(): DomainEvent[] { return [...this._domainEvents]; }
  clearDomainEvents(): void { this._domainEvents = []; }
}
```

### Value Object
```typescript
abstract class ValueObject<T> {
  protected readonly _props: T;
  
  constructor(props: T) {
    this._props = Object.freeze(props); // Immutable
  }
  
  equals(other: ValueObject<T>): boolean {
    return JSON.stringify(this._props) === JSON.stringify(other._props);
  }
}

// Example: TaskId
class TaskId extends ValueObject<{ value: string }> {
  static create(): TaskId { return new TaskId({ value: crypto.randomUUID() }); }
  get value(): string { return this._props.value; }
}
```

### Aggregate Root
```typescript
abstract class AggregateRoot<T extends { id: string }> extends Entity<T> {
  private _version: number = 0;
  
  get version(): number { return this._version; }
  
  protected apply(event: DomainEvent): void {
    this._version++;
    this.addDomainEvent(event);
  }
}
```

## Task Management Domain Example

```typescript
// Status transitions: pending → assigned → completed
type TaskStatus = 'pending' | 'assigned' | 'completed';
type Priority = 'low' | 'medium' | 'high' | 'critical';

class Task extends AggregateRoot<TaskProps> {
  static create(props: CreateTaskProps): Task {
    const task = new Task({ ...props, status: 'pending', createdAt: new Date() });
    task.apply(new TaskCreatedEvent(task.id, props));
    return task;
  }
  
  assign(agentId: string): void {
    if (this._props.status !== 'pending') throw new Error('Can only assign pending tasks');
    this._props.status = 'assigned';
    this._props.assignedTo = agentId;
    this.apply(new TaskAssignedEvent(this.id, agentId));
  }
  
  complete(result: string): void {
    if (this._props.status !== 'assigned') throw new Error('Can only complete assigned tasks');
    this._props.status = 'completed';
    this.apply(new TaskCompletedEvent(this.id, result));
  }
}
```

## Repository Pattern

```typescript
interface ITaskRepository {
  save(task: Task): Promise<void>;
  findById(id: TaskId): Promise<Task | null>;
  findByStatus(status: TaskStatus): Promise<Task[]>;
  findByAgentId(agentId: string): Promise<Task[]>;
}

@injectable()
class SqliteTaskRepository implements ITaskRepository {
  constructor(@inject('Database') private db: Database) {}
  
  async save(task: Task): Promise<void> {
    await this.db.run(`INSERT OR REPLACE INTO tasks ...`, this.toRow(task));
  }
  
  private toDomain(row: TaskRow): Task { /* map row → domain entity */ }
  private toRow(task: Task): TaskRow { /* map domain entity → row */ }
}
```

## Dependency Injection (Inversify)

```typescript
const container = new Container();
container.bind<ITaskRepository>('TaskRepository').to(SqliteTaskRepository).inSingletonScope();
container.bind<IAgentRepository>('AgentRepository').to(SqliteAgentRepository).inSingletonScope();
container.bind(AssignTaskUseCase).toSelf().inSingletonScope();
```

## Application Use Case

```typescript
@injectable()
class AssignTaskUseCase {
  constructor(
    @inject('TaskRepository') private tasks: ITaskRepository,
    @inject('AgentRepository') private agents: IAgentRepository,
    @inject('EventBus') private events: IEventBus,
  ) {}
  
  async execute(input: AssignTaskInput): Promise<AssignTaskOutput> {
    const validated = AssignTaskSchema.parse(input);  // Zod validation
    const task = await this.tasks.findById(TaskId.from(validated.taskId));
    if (!task) throw new TaskNotFoundError(validated.taskId);
    
    task.assign(validated.agentId);
    await this.tasks.save(task);
    
    // Publish domain events
    for (const event of task.getDomainEvents()) {
      await this.events.publish(event);
    }
    task.clearDomainEvents();
    
    return { taskId: task.id, status: 'assigned' };
  }
}
```

## Success Metrics
- Test coverage: >90% for core domain logic
- Clean layer separation (no infrastructure imports in domain)
- All entities immutable at creation, mutations via methods only
- All domain invariants enforced in entity constructors
