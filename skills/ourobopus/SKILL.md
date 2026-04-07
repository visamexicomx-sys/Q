---
name: ourobopus
description: Simple self-improvement agent from elder-plinius that can modify and enhance its own capabilities. 38+ stars. Use when building self-modifying AI agents, implementing autonomous self-improvement loops, researching recursive self-improvement in AI systems, or experimenting with meta-learning agent architectures.
---

# Ourobopus

A self-improvement agent that can analyze and modify its own code, prompts, and capabilities — named after the ouroboros snake eating its own tail, symbolizing recursive self-improvement.

## Source
Repository: `elder-plinius/ourobopus`
Stars: 38+ | License: AGPL-3.0

## Concept

Ourobopus implements a recursive self-improvement loop:
1. Agent analyzes its own performance on tasks
2. Identifies weaknesses and improvement opportunities
3. Generates modifications to its own code or prompts
4. Tests the modified version
5. Accepts improvements, repeats the cycle

## Quick Start

```bash
git clone https://github.com/elder-plinius/ourobopus.git
cd ourobopus
pip install -r requirements.txt

# Set up your API key
export ANTHROPIC_API_KEY="your-key"

# Start the self-improvement loop
python ourobopus.py --task "improve my ability to solve coding problems" --iterations 3
```

## Core Loop

```python
from ourobopus import SelfImprovementAgent

agent = SelfImprovementAgent(
    model="claude-sonnet-4-6",
    task_domain="coding",
    improvement_metric="test_pass_rate",
)

# Run N improvement cycles
for iteration in range(5):
    # Evaluate current performance
    score = agent.evaluate()
    print(f"Iteration {iteration}: Score = {score}")
    
    # Self-analyze weaknesses
    weaknesses = agent.introspect()
    
    # Generate improvements
    improvements = agent.generate_improvements(weaknesses)
    
    # Apply and test
    if agent.test_improvements(improvements):
        agent.apply_improvements(improvements)
```

## Configuration

```yaml
# ourobopus.yaml
agent:
  model: claude-sonnet-4-6
  task_domain: "general reasoning"
  
improvement:
  max_iterations: 10
  accept_threshold: 0.05  # Minimum improvement to accept
  safety_checks: true     # Prevent harmful self-modifications
  
evaluation:
  benchmark: "custom"
  test_cases: tests/
  metric: "accuracy"
  
memory:
  store_history: true
  history_file: .ourobopus/history.json
```

## Self-Improvement Strategies

1. **Prompt Optimization** — Refine system prompts based on failure analysis
2. **Chain-of-Thought Enhancement** — Improve reasoning step structures
3. **Example Selection** — Curate better few-shot examples from successes
4. **Tool Use Optimization** — Learn when to use which tools
5. **Error Pattern Learning** — Build error recovery strategies from failures

## Research Applications

- **Meta-Learning** — Study how agents can learn to learn
- **Recursive Improvement** — Investigate limits of self-modification
- **Agent Architectures** — Experiment with self-modifying architectures
- **Safety Research** — Study containment of self-improving systems

## Safety Considerations

Self-improving agents can behave unexpectedly. Always:
- Run in isolated environments (Docker, VMs)
- Set improvement iteration limits
- Enable `safety_checks: true`
- Monitor all modifications before applying
- Keep backups of the original agent
