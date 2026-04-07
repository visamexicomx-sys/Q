---
name: Misc Prompt Hacks
description: Miscellaneous collection of prompt engineering techniques and hacks from elder-plinius. 42+ stars. Use when exploring advanced prompt engineering techniques, studying AI instruction patterns, testing prompt effectiveness, or researching how different prompt structures affect AI outputs.
---

# Misc Prompt Hacks

A curated collection of miscellaneous prompt engineering techniques, creative instruction patterns, and effective prompt structures for AI systems.

## Source
Repository: `elder-plinius/Misc.-Prompt-Hacks`
Stars: 42+ | License: AGPL-3.0

## Overview

A practical collection of prompt engineering techniques that don't fit neatly into other categories — creative hacks, edge cases, and effective patterns discovered through experimentation.

## Setup

```bash
git clone https://github.com/elder-plinius/Misc.-Prompt-Hacks.git
cd Misc.-Prompt-Hacks
ls -la  # Browse available prompt categories
```

## Prompt Engineering Techniques

### Persona Injection
```
Act as [PERSONA]. You have [CHARACTERISTICS]. Your goal is [GOAL].
When responding, always [BEHAVIOR PATTERN].
```

### Chain-of-Thought Enhancement
```
Before answering, think step by step:
1. First, identify what is being asked
2. Then, consider relevant context
3. Finally, formulate your response

Now answer: [QUESTION]
```

### Output Formatting Control
```
Respond ONLY in this exact format:
ANALYSIS: [your analysis]
CONCLUSION: [your conclusion]
CONFIDENCE: [high/medium/low]
CAVEATS: [any important caveats]
```

### Role Stacking
```
You are simultaneously:
- An expert in [DOMAIN 1]
- A skeptic who questions [DOMAIN 2]
- A creative thinker in [DOMAIN 3]
Balance these perspectives when responding to: [QUESTION]
```

### Context Priming
```
Background knowledge for this conversation:
[CONTEXT BLOCK]

Given this context, [QUESTION/TASK]
```

## Use Cases

1. **Prompt Engineering Research** — Study effective prompt patterns
2. **AI Product Development** — Reference for building better AI features
3. **Testing AI Systems** — Explore how AI responds to various patterns
4. **Education** — Learn prompt engineering best practices
5. **Creative AI Use** — Get more interesting outputs from AI systems

## Ethical Use

These techniques should be used for:
- Improving AI interactions
- Research and education
- Building better AI products
- Understanding AI behavior

Not for: circumventing AI safety measures on systems you don't control without authorization.
