---
name: v3-cli-modernization
description: Comprehensive CLI modernization for claude-flow v3 with modular architecture, interactive prompts, deep hook integration, workflow automation, and sub-200ms response targets. Use when refactoring monolithic CLI code, implementing interactive command-line interfaces, or optimizing CLI performance with learning-based auto-completion.
---

# V3 CLI Modernization

Transforms the claude-flow CLI from a monolithic 108KB `index.ts` into a modular, interactive, hook-integrated command system with sub-200ms response targets.

## Quick Start

```bash
# Interactive CLI (new modular interface)
npx claude-flow@v3 init --interactive

# Generate workflow from intent
npx claude-flow@v3 workflow generate "deploy microservices to production"

# Check CLI performance
npx claude-flow@v3 perf status
```

## Problem Being Solved

```
Before:
  src/cli/index.ts    — 108KB monolithic file
  src/enterprise.ts   — 68KB feature module
  
After:
  src/cli/commands/   — Focused files <10KB each
  src/cli/registry.ts — Modular command registry
  src/cli/prompts.ts  — Interactive context-aware prompts
  src/cli/hooks.ts    — Deep lifecycle integration
  src/cli/workflow.ts — Automation orchestrator
```

## 5 Key Implementations

### 1. Modular Command Registry
```typescript
class CommandRegistry {
  register(command: Command): void;
  findCommand(name: string): Command;      // Exact match
  findCommandFuzzy(query: string): Command[]; // Fuzzy match
  getByCategory(category: string): Command[];
  getAliases(name: string): string[];
}
```

### 2. Interactive Context-Aware Prompts
```typescript
// Dynamic imports for tree-shaking (only load needed features)
const { select, text, confirm } = await import('@clack/prompts');

// Context-aware suggestions
const task = await text({
  message: 'What would you like to accomplish?',
  placeholder: 'e.g., "deploy auth service to staging"',
  validate: (v) => v.length < 10 ? 'Please be more specific' : undefined,
});
```

### 3. Enhanced Hooks Integration
```typescript
// Records command patterns for learning
async beforeCommand(command: string, args: string[]): Promise<void> {
  await this.memory.store(`cli/patterns/${command}`, { args, timestamp: Date.now() });
}

// Generates optimization suggestions after execution
async afterCommand(command: string, duration: number): Promise<void> {
  const patterns = await this.memory.retrieve(`cli/patterns/${command}`);
  const suggestions = this.optimizer.suggest(patterns);
  if (suggestions.length > 0) await this.display.showSuggestions(suggestions);
}
```

### 4. Workflow Automation Orchestrator
```typescript
class WorkflowOrchestrator {
  // Generate workflow from natural language intent
  async generateFromIntent(intent: string): Promise<Workflow>;
  
  // Execute with dependency resolution
  async execute(workflow: Workflow): Promise<WorkflowResult> {
    // Topological sort → parallel execution of independent steps
    // Conditional logic (if/else based on step outputs)
    // Auto-retry with exponential backoff
  }
}
```

### 5. Performance Command Monitor
```typescript
// Alerts when P95 latency exceeds 5 seconds
class PerformanceMonitor {
  track(command: string): PerformanceTracker;
  getP95(command: string): number;
  getMemoryUsage(command: string): number;
  getSuccessRate(command: string): number;
  alert(threshold: number): void;
}
```

## Usage Examples

```bash
# Run modular command with interactive prompt
npx claude-flow@v3 sparc --interactive

# Execute workflow with auto-generated steps
npx claude-flow@v3 workflow run "build and test auth service"

# Fuzzy command matching
npx claude-flow@v3 swrm init    # Finds "swarm init"
npx claude-flow@v3 mem query    # Finds "memory query"

# Performance dashboard
npx claude-flow@v3 perf dashboard

# Auto-completion with >90% accuracy (learned from usage history)
npx claude-flow@v3 complete "deploy to"
# → "deploy to staging", "deploy to production", "deploy to k8s"
```

## Success Targets
- Command response: <200ms (P95)
- Module file size: <10KB each
- Auto-completion accuracy: >90%
- Memory usage: 50% reduction from v2
- Zero regression in existing commands
