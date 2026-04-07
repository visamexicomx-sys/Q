---
name: flow-nexus-platform
description: Flow Nexus platform management covering authentication, sandbox environments, app deployment, payments, challenges, storage, and real-time features. Use for managing the full Flow Nexus platform lifecycle.
metadata:
  source: ruvnet/ruflo
  version: 1.0.0
---

# Flow Nexus Platform Management

Comprehensive platform management for Flow Nexus including user management, sandbox environments, app store deployment, payments, and real-time features.

## Core Areas

### Authentication & User Management
- Registration, login, password reset
- Profile administration and session management

### Sandbox Management
Create environments with templates (Node, Python, React, etc.):
```bash
npx flow-nexus@latest register
npx flow-nexus@latest login
```

### App Store & Deployment
- Browse and deploy application templates
- Publish to marketplace
- Track marketplace analytics

### Payments & Credits
- Balance tracking and credit purchases
- Auto-refill configuration

**Subscription Tiers:**
| Tier | Features |
|------|---------|
| Free | Basic sandboxes, limited credits |
| Pro | Extended limits, priority support |
| Enterprise | Unlimited, SLA, dedicated infrastructure |

### Challenges & Achievements
- Coding problem submission
- Leaderboards and badge rewards

### Storage & Real-time
- File management across bucket types
- Event-driven subscriptions and real-time sync

### System Utilities
- **Queen Seraphina** AI assistant for platform queries
- Health monitoring and audit logging

## Quick Start

```bash
# Install Flow Nexus CLI
npx flow-nexus@latest init --wizard

# Platform management
npx flow-nexus@latest status
npx flow-nexus@latest sandbox create --template nodejs
npx flow-nexus@latest deploy --app my-app
```

## Key Features

- Multi-platform code execution (Node, Python, React, and more)
- Real-time collaboration between sandboxes
- Automatic resource cleanup
- Chunked file upload support
- Custom Docker configurations

## Resources

- Platform: https://flow-nexus.ruv.io
- Docs: https://flow-nexus.ruv.io/docs
