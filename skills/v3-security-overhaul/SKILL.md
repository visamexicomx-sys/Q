---
name: V3 Security Overhaul
description: Complete security architecture overhaul for claude-flow v3. Addresses critical CVEs and implements secure-by-default patterns including bcrypt password hashing, cryptographic credential generation, input validation with Zod, path sanitization, and safe command execution. Use when performing security audits, fixing vulnerabilities, or hardening claude-flow v3 deployments.
---

# V3 Security Overhaul

Orchestrates a comprehensive security overhaul for claude-flow v3, resolving critical CVEs and implementing production-grade security patterns.

## Quick Start

```bash
npx claude-flow sparc run security "audit and fix all CVEs in claude-flow v3"
```

## CVE Resolutions

### CVE-1: Dependency Vulnerability
- Update `@anthropic-ai/claude-code` to `^2.0.31`
- Run `npm audit --fix`
- Verify with `npm audit --audit-level=moderate`

### CVE-2: Weak Password Hashing
Replace SHA-256 with hardcoded salt:
```typescript
// Before (insecure)
const hash = crypto.createHash('sha256').update(password + 'hardcoded-salt').digest('hex');

// After (secure)
import bcrypt from 'bcrypt';
const hash = await bcrypt.hash(password, 12);
const valid = await bcrypt.compare(password, hash);
```

### CVE-3: Hardcoded Credentials
```typescript
// Before (insecure)
const apiKey = 'hardcoded-api-key-123';

// After (secure)
const apiKey = crypto.randomBytes(32).toString('hex');
```

## Security Patterns

### Input Validation with Zod
```typescript
import { z } from 'zod';

const TaskInputSchema = z.object({
  taskId: z.string().uuid(),
  command: z.string().max(1000).regex(/^[a-zA-Z0-9\s\-_./]+$/),
  timeout: z.number().min(1000).max(300000).default(30000),
});

type TaskInput = z.infer<typeof TaskInputSchema>;
```

### Path Sanitization
```typescript
function sanitizePath(userInput: string, baseDir: string): string {
  const resolved = path.resolve(baseDir, userInput);
  if (!resolved.startsWith(path.resolve(baseDir))) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}
```

### Safe Command Execution
```typescript
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// Never use exec() with shell: true
const { stdout } = await execFileAsync('git', ['log', '--oneline', '-10'], {
  shell: false,
  timeout: 10000,
  cwd: sanitizePath(workDir, baseDir),
});
```

## Implementation Checklist

- [ ] Update all dependencies: `npm audit --fix`
- [ ] Replace all SHA-256/MD5 password hashing with bcrypt (12+ rounds)
- [ ] Replace hardcoded credentials with `crypto.randomBytes(32)`
- [ ] Add Zod validation to all API endpoints
- [ ] Implement path traversal detection on all file operations
- [ ] Replace `exec()` with `execFile()` (shell: false)
- [ ] Add rate limiting to authentication endpoints
- [ ] Enable Content Security Policy headers
- [ ] Implement JWT token rotation
- [ ] Add audit logging for security events

## Success Metrics
- Security score: 90/100
- CVE resolution: 100%
- Test coverage: >95%
- Zero critical/high severity vulnerabilities in `npm audit`
