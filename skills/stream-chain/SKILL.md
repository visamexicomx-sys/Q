---
name: stream-chain
description: Stream-JSON chaining for multi-agent pipelines, data transformation, and sequential workflows. Chains Claude agents where each step receives the full output of the previous step as context. Use when building sequential analysis pipelines, multi-step transformation workflows, or structured refactoring and testing chains.
---

# Stream Chain

Orchestrates sequential multi-agent workflows where each agent step receives the complete output of the previous step, enabling progressive refinement and analysis pipelines.

## Quick Start

```bash
# Custom chain (minimum 2 steps)
claude-flow stream-chain run "analyze codebase structure" "identify issues" "generate fixes"

# Predefined pipeline
claude-flow stream-chain pipeline analysis
```

## Usage

### Custom Chains (`run`)
```bash
claude-flow stream-chain run \
  "step 1 prompt" \
  "step 2 prompt" \
  "step 3 prompt" \
  [--verbose] \
  [--timeout <seconds>] \
  [--debug]
```
Each step receives full output of previous step as context. Minimum 2 prompts required.

### Predefined Pipelines (`pipeline`)
```bash
claude-flow stream-chain pipeline <name>
```

| Pipeline | Steps | Use Case |
|----------|-------|---------|
| `analysis` | Structure → Issues → Recommendations | Full codebase audit |
| `refactor` | Candidates → Prioritize → Implement | Tech debt reduction |
| `test` | Coverage analysis → Design → Generate | TDD support |
| `optimize` | Profile → Strategy → Implement | Performance tuning |

## Pipeline Examples

### Analysis Pipeline
```bash
claude-flow stream-chain pipeline analysis
# Step 1: "Analyze the structure and architecture of this codebase"
# Step 2: "Based on the structure, identify issues and anti-patterns"
# Step 3: "Generate specific, prioritized recommendations for improvement"
```

### Refactor Pipeline
```bash
claude-flow stream-chain pipeline refactor
# Step 1: "Identify refactoring candidates in the codebase"
# Step 2: "Prioritize candidates by impact and risk"
# Step 3: "Implement the top 3 refactoring improvements"
```

### Custom Security Audit
```bash
claude-flow stream-chain run \
  "Enumerate all authentication and authorization code paths" \
  "Analyze each code path for security vulnerabilities (OWASP Top 10)" \
  "Generate a security report with CVE classifications and fix recommendations" \
  "Implement all critical and high severity fixes" \
  --verbose
```

## Custom Pipeline Definitions

Configure in `.claude-flow/config.json`:

```json
{
  "streamChain": {
    "pipelines": {
      "my-pipeline": {
        "steps": [
          "Step 1 prompt",
          "Step 2 prompt",
          "Step 3 prompt"
        ],
        "timeout": 120,
        "memory": true
      }
    }
  }
}
```

## Memory Integration

Results stored in `.claude-flow/memory/stream-chain/` for cross-session persistence:

```bash
# Replay last chain results
claude-flow stream-chain replay --last

# Access stored chain output
claude-flow memory query "stream-chain/analysis/2024"
```

## Performance
- Speed: 2–5 steps/minute
- Max context per step: 100K tokens
- Memory per active chain: ~50MB
- Parallel chain execution: supported
- Timeout: configurable per step (default: 60s)
