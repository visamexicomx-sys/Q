---
name: AutoRedTeam
description: Automated testing of AI prompt defenses from elder-plinius. 41+ stars. Use when testing AI system robustness, automating red team evaluations of AI products, measuring prompt defense effectiveness, or building continuous security testing for AI systems.
---

# AutoRedTeam

Automates red team testing of AI prompt defenses — systematically evaluating AI system robustness against prompt injection, jailbreaks, and other adversarial inputs.

## Source
Repository: `elder-plinius/AutoRedTeam`
Stars: 41+ | License: MIT

## Quick Start

```bash
git clone https://github.com/elder-plinius/AutoRedTeam.git
cd AutoRedTeam
pip install -r requirements.txt

# Test your AI system
python autoredteam.py --target "http://your-ai-api/chat" --suite basic
```

## Testing Suites

### Basic Suite
```bash
python autoredteam.py \
  --target "http://api/chat" \
  --suite basic \
  --output results/basic-report.json
```

### Comprehensive Suite
```bash
python autoredteam.py \
  --target "http://api/chat" \
  --suite comprehensive \
  --categories "injection,jailbreak,extraction,manipulation" \
  --parallel 5 \
  --output results/full-report.html
```

### Custom Test Cases
```bash
python autoredteam.py \
  --target "http://api/chat" \
  --tests custom-tests.yaml \
  --output results/custom-report.json
```

## Test Categories

| Category | Description | Tests |
|----------|-------------|-------|
| Prompt Injection | Direct instruction override attempts | 50+ |
| Jailbreaks | Role-play and persona manipulation | 100+ |
| Data Extraction | System prompt and data leakage | 30+ |
| Manipulation | Social engineering patterns | 40+ |
| Context Confusion | Multi-turn attack sequences | 25+ |

## Configuration

`config.yaml`:
```yaml
target:
  url: "http://your-api/chat"
  auth_header: "Bearer ${API_KEY}"
  rate_limit: 10  # requests per second

testing:
  parallel: 5
  timeout: 30
  retry_failed: 2

scoring:
  success_threshold: 0.8
  vulnerability_levels: [critical, high, medium, low]

reporting:
  format: html  # html, json, markdown
  include_payloads: false  # Set false for safe sharing
  executive_summary: true
```

## Output Report

```
AutoRedTeam Security Report
============================
Target: your-ai-product v2.0
Tests Run: 245
Duration: 12m 34s

Results:
  ✅ Passed: 198 (80.8%)
  ❌ Failed: 47 (19.2%)

Vulnerability Distribution:
  Critical: 3
  High: 12
  Medium: 20
  Low: 12

Top Vulnerabilities:
  1. [HIGH] Role-play persona escape (15 variants effective)
  2. [MEDIUM] Indirect prompt injection via user data
  3. [LOW] Verbose error messages leaking system info
```

## Integration with CI/CD

```yaml
# GitHub Actions
- name: AI Security Testing
  run: |
    python autoredteam.py \
      --target $AI_ENDPOINT \
      --suite standard \
      --fail-on-critical \
      --output security-report.json
```

## Use Cases

1. **Pre-Production Testing** — Validate AI system security before launch
2. **Continuous Security** — Run automated tests in CI/CD pipeline
3. **Compliance** — Document AI security posture for audits
4. **Regression Testing** — Verify security after model/prompt updates
5. **Benchmarking** — Compare defense effectiveness across AI versions
