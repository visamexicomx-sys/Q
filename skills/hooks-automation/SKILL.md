---
name: Hooks Automation
description: Automated coordination, formatting, and learning from Claude Code operations using intelligent hooks with MCP integration. Includes pre/post task hooks, session management, Git integration, memory coordination, and neural pattern training. Use when setting up automated workflows, coordinating multi-agent operations, or implementing continuous learning from Claude Code sessions.
---

# Hooks Automation

Orchestrates intelligent pre/post operation hooks for Claude Code, enabling automated coordination, pattern learning, and memory synchronization across agent sessions.

## Quick Start

```bash
npx claude-flow init --hooks
```

## Prerequisites
- Claude Flow CLI: `npm install -g claude-flow@alpha`
- Claude Code with hooks enabled
- `.claude/settings.json` with hook configurations

## Hook Types

### Pre-Operation Hooks
Validate, prepare, and auto-assign agents before operations begin.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow hooks pre-tool --tool-name \"$TOOL_NAME\" --validate --auto-assign"
          }
        ]
      }
    ]
  }
}
```

### Post-Operation Hooks
Format outputs, analyze patterns, and train neural models after operations.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow hooks post-tool --tool-name \"$TOOL_NAME\" --analyze --train-patterns"
          }
        ]
      }
    ]
  }
}
```

### Session Management
```json
{
  "hooks": {
    "SessionStart": [
      {
        "type": "command",
        "command": "npx claude-flow hooks session-start --restore-context --load-memory"
      }
    ],
    "SessionEnd": [
      {
        "type": "command",
        "command": "npx claude-flow hooks session-end --persist-state --generate-summary"
      }
    ]
  }
}
```

## Memory Coordination
Synchronize knowledge across swarm agents:

```bash
# Sync memory after significant operations
npx claude-flow memory sync --agents all --strategy merge-latest

# Query stored patterns
npx claude-flow memory query "successful auth implementations"

# Deposit learning
npx claude-flow memory deposit --key "auth/jwt/pattern" --value "$(cat jwt-implementation.ts)"
```

## Git Integration
Automated commit hooks with quality verification:

```bash
# Pre-commit validation
npx claude-flow hooks git pre-commit --verify --threshold 0.90

# Post-commit learning
npx claude-flow hooks git post-commit --extract-patterns --update-memory
```

## Neural Pattern Training
```bash
# Train from successful session
npx claude-flow neural train --session last --patterns extract

# View learned patterns
npx claude-flow neural patterns list --min-confidence 0.85

# Apply patterns to current task
npx claude-flow neural apply --task "implement auth" --top-patterns 5
```

## MCP Integration
```json
{
  "mcpServers": {
    "claude-flow": {
      "command": "npx",
      "args": ["claude-flow@alpha", "mcp"],
      "env": {
        "HOOKS_ENABLED": "true",
        "MEMORY_SYNC": "true",
        "NEURAL_TRAINING": "true"
      }
    }
  }
}
```

## Configuration Reference
Full hook configuration in `.claude/settings.json`:

```json
{
  "hooks": {
    "enabled": true,
    "preTask": { "validate": true, "autoAssign": true, "loadContext": true },
    "postTask": { "format": true, "analyze": true, "trainPatterns": true },
    "session": { "persistState": true, "generateSummary": true },
    "memory": { "syncOnComplete": true, "depositLearnings": true },
    "git": { "preCommitVerify": true, "postCommitLearn": true },
    "neural": { "continuousTraining": true, "patternExtraction": true }
  }
}
```
