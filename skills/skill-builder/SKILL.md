---
name: Skill Builder
description: Create new Claude Code Skills with proper YAML frontmatter, progressive disclosure structure, and complete directory organization. Use when building custom skills, creating skill templates, or organizing skill libraries for Claude Code deployments.
---

# Skill Builder

Comprehensive guide for creating well-structured Claude Code Skills with proper YAML frontmatter, progressive disclosure, and directory organization.

## Quick Start

```bash
mkdir -p ~/.claude/skills/my-skill
cat > ~/.claude/skills/my-skill/SKILL.md << 'EOF'
---
name: My Skill
description: What this skill does and when to use it.
---

# My Skill
...
EOF
```

## YAML Frontmatter Specification

```yaml
---
name: Skill Name          # Required, max 64 chars
description: |            # Required, max 1024 chars
  What the skill does AND when to trigger it.
  Include both "what" and "when" for proper LLM matching.
---
```

**Important**: Only `name` and `description` are used. Fields like `version`, `author`, `tags` are silently ignored.

## Directory Structure

```
~/.claude/skills/
└── my-skill/             # Must be directly under skills/ (no nesting)
    ├── SKILL.md          # Required: main skill definition
    ├── scripts/          # Optional: executable scripts
    │   └── setup.sh
    ├── resources/        # Optional: templates, configs
    │   └── template.json
    └── docs/             # Optional: extended documentation
        └── advanced.md
```

**Critical**: Skills MUST be directly under `~/.claude/skills/[skill-name]/` — nested subdirectories are not loaded.

## 3-Level Progressive Disclosure

| Level | Content | Size | When Loaded |
|-------|---------|------|-------------|
| Level 1 | YAML frontmatter (name + description) | ~200 chars | Always — at startup |
| Level 2 | SKILL.md body | 1–10KB | When skill is triggered |
| Level 3+ | Referenced files (scripts, resources) | Unlimited | On-demand |

**Benefit**: 100 skills ≈ only ~6KB startup context overhead.

## Content Structure (4-Level Recommended)

```markdown
# Skill Name

One-sentence overview.

## Quick Start
Minimal working example.

## Detailed Instructions
Step-by-step guidance for common use cases.

## Reference
Full API, configuration options, troubleshooting.
```

## Templates

### Basic Template
```markdown
---
name: Basic Skill
description: Does X. Use when Y.
---

# Basic Skill

Brief description.

## Usage
Instructions here.
```

### Intermediate Template (with scripts)
```markdown
---
name: Intermediate Skill
description: Does X with scripted automation. Use when Y.
---

# Intermediate Skill

## Quick Start
\`\`\`bash
bash ~/.claude/skills/my-skill/scripts/setup.sh
\`\`\`

## Manual Steps
1. Step one
2. Step two
```

### Advanced Template (full-featured)
```markdown
---
name: Advanced Skill
description: Comprehensive X capability. Use when Y or Z.
---

# Advanced Skill

## Overview
| Feature | Capability |
|---------|-----------|
| Feature 1 | Description |

## Quick Start
\`\`\`bash
command --flag
\`\`\`

## Configuration
Options and settings.

## Troubleshooting
Common issues and fixes.

## API Reference
Full parameter documentation.
```

## Validation Checklist

- [ ] YAML frontmatter is valid (run `yaml-lint SKILL.md`)
- [ ] `name` ≤ 64 characters
- [ ] `description` ≤ 1024 characters and includes both "what" and "when"
- [ ] Skill directory is directly under `~/.claude/skills/`
- [ ] SKILL.md body is 1–10KB (not too short, not too long)
- [ ] Quick Start section has a working minimal example
- [ ] Referenced scripts are executable (`chmod +x scripts/*.sh`)
- [ ] Tested by triggering from Claude Code conversation
