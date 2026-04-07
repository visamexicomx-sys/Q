---
name: pair-programming
description: AI-assisted pair programming with intelligent role management, multiple collaboration modes, continuous verification, and integrated testing. Use when you want AI assistance in driver/navigator roles, TDD workflows, code review, or debugging sessions.
metadata:
  source: ruvnet/ruflo
  version: 1.0.0
---

# Pair Programming

Professional pair programming capabilities with AI assistance, supporting multiple collaboration modes, continuous verification, and integrated testing.

## When to Use

- Implementing features with AI as driver or navigator
- Test-driven development (TDD) workflows
- Debugging complex issues with AI analysis
- Code review and refactoring sessions
- Learning and mentoring workflows

## Collaboration Modes

| Mode | Description |
|------|-------------|
| `driver` | You code, AI navigates and guides |
| `navigator` | AI codes, you direct and review |
| `switch` | Alternates roles automatically |
| `tdd` | Strict test-first development |
| `review` | AI performs structured code review |
| `mentor` | AI explains concepts as it codes |
| `debug` | AI analyzes and fixes issues |

## Getting Started

```bash
# Install Claude Flow
npm install -g claude-flow@alpha

# Start pair programming session
npx claude-flow pair start --mode navigator --context "REST API development"

# Check session status
npx claude-flow pair status

# End session with report
npx claude-flow pair end --save --report
```

## In-Session Commands

### Code Commands
```bash
/refactor function-name    # Suggest refactoring
/optimize performance      # Find performance improvements
/explain code-block        # Explain what code does
/simplify               # Simplify complex logic
```

### Testing Commands
```bash
/test generate             # Generate test cases
/test coverage             # Check coverage gaps
/test run                  # Run test suite
/tdd next                  # Next TDD cycle step
```

### Review Commands
```bash
/review security           # Security-focused review
/review performance        # Performance analysis
/review style              # Style and conventions
/review all                # Comprehensive review
```

### Git Commands
```bash
/git commit                # Generate commit message and commit
/git branch feature-name   # Create feature branch
/git pr                    # Draft PR description
```

## Configuration

```json
{
  "pairProgramming": {
    "mode": "navigator",
    "verificationThreshold": 0.85,
    "testingFramework": "jest",
    "codeReviewStrictness": "high",
    "gitIntegration": true,
    "sessionDuration": 120
  }
}
```

## Agent Profiles

| Profile | Best For |
|---------|---------|
| `senior-dev` | Production code, architecture decisions |
| `tdd-specialist` | Test-driven workflows |
| `debugger-expert` | Bug investigation and fixes |
| `junior-dev` | Learning-focused pairing |

## Real-World Examples

### Feature Implementation
```bash
npx claude-flow pair start --mode navigator --profile senior-dev
# AI implements the feature while you review
/test generate              # Generate tests for new feature
/review security            # Check for security issues
/git commit                 # Commit with generated message
```

### TDD Workflow
```bash
npx claude-flow pair start --mode tdd --profile tdd-specialist
/tdd next                   # Write failing test
/tdd implement              # Write minimum passing code
/tdd refactor               # Refactor with passing tests
```

### Debug Session
```bash
npx claude-flow pair start --mode debug --context "Memory leak in UserService"
/explain stack-trace        # Analyze error
/debug trace                # Add debug logging
/fix suggest                # Suggest fixes
```

## Best Practices

1. Set clear session context before starting
2. Use TDD mode for new features when possible
3. Review security after every significant change
4. Commit frequently with AI-generated messages
5. Save session profiles for reuse in similar contexts
