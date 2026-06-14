# Промт: ECC Skills Dashboard

Скопируй этот промт целиком и вставь в новый чат Claude Code.

---

## ПРОМТ

Build a professional ECC Skills Dashboard — a single-page web application that serves as a command center for 197 AI agent skills. This is an internal power-user tool, not a marketing page.

---

## Design Direction

**Style:** Dark luxury / editorial. Think Vercel dashboard meets Linear.app meets The Browser Company.

**NOT:** Generic Tailwind template, bootstrap cards, gray-on-white, default shadcn.

**Visual requirements (must hit at least 6 of these):**
1. Clear hierarchy through scale contrast — skill name large, description small
2. Intentional rhythm — sections breathe, cards don't have uniform padding
3. Depth through layering — cards float on a darker surface, subtle borders glow on hover
4. Typography with character — use `Inter` + `JetBrains Mono` for monospace commands
5. Color used semantically — each category has a distinct accent, not decorative blobs
6. Hover/focus states that feel designed — card lifts, command reveals, copy button appears
7. Grid-breaking layout — hero stat row spans full width, cards use masonry-adjacent bento
8. Motion that clarifies — category filter transition, card hover lift (150ms ease-out-expo)

**Palette (dark mode only):**
```css
--bg-base: oklch(10% 0 0);
--bg-surface: oklch(14% 0 0);
--bg-card: oklch(17% 0 0);
--border: oklch(22% 0 0);
--border-hover: oklch(35% 0 0);
--text-primary: oklch(96% 0 0);
--text-secondary: oklch(55% 0 0);
--text-muted: oklch(38% 0 0);
--accent-security: oklch(68% 0.19 25);    /* red-orange */
--accent-ai: oklch(68% 0.19 265);         /* violet */
--accent-finance: oklch(68% 0.19 145);    /* emerald */
--accent-marketing: oklch(68% 0.19 310);  /* pink */
--accent-media: oklch(68% 0.19 50);       /* amber */
--accent-research: oklch(68% 0.19 220);   /* sky */
--accent-dev: oklch(68% 0.19 185);        /* cyan */
--accent-devops: oklch(68% 0.19 170);     /* teal */
--accent-qa: oklch(68% 0.19 240);         /* indigo */
--accent-domain: oklch(68% 0.19 90);      /* lime */
```

---

## Tech Stack

- **Framework:** Next.js 15 App Router (or Vite + React 19 if Next.js not available)
- **Styling:** Tailwind CSS v4 + CSS custom properties for tokens
- **Language:** TypeScript strict mode
- **Icons:** Lucide React
- **Fonts:** Inter (body) + JetBrains Mono (commands/code)
- **NO external UI libraries** — build components from scratch
- **State:** React useState/useMemo only — no external store needed
- **Animations:** CSS transitions only (no Framer Motion needed here)

---

## File Structure

```
src/
├── app/
│   ├── page.tsx          # Dashboard root
│   ├── layout.tsx        # Fonts, meta, dark bg
│   └── globals.css       # CSS tokens + base
├── components/
│   ├── Header.tsx        # Title + stats bar
│   ├── SearchBar.tsx     # Search input with keyboard shortcut (⌘K)
│   ├── CategoryFilter.tsx # Pill tabs for category filtering
│   ├── SkillGrid.tsx     # Responsive grid container
│   ├── SkillCard.tsx     # Individual skill card
│   └── CommandBadge.tsx  # Monospace command with copy button
└── data/
    └── skills.ts         # All 197 skills as typed data
```

---

## Data Structure

```typescript
// src/data/skills.ts

export type Category =
  | 'security'
  | 'ai-agents'
  | 'finance'
  | 'marketing'
  | 'media'
  | 'research'
  | 'backend'
  | 'frontend'
  | 'devops'
  | 'testing'
  | 'ml'
  | 'domain';

export interface Skill {
  id: string;               // kebab-case, matches /ecc:<id>
  name: string;             // Display name
  category: Category;
  description: string;      // One-line what it does
  delivers: string;         // What you get (output)
  earning: string;          // Earning potential range
  command: string;          // /ecc:<id> — ready to copy
  tags: string[];           // Searchable tags
}

export const SKILLS: Skill[] = [
  // --- SECURITY ---
  {
    id: 'security-bounty-hunter',
    name: 'Bug Bounty Hunter',
    category: 'security',
    description: 'Hunt exploitable vulnerabilities in repositories. SSRF, auth bypass, upload-to-RCE.',
    delivers: 'Готовый HackerOne/Huntr репорт с доказательствами',
    earning: '$500 – $50 000 / баг',
    command: '/ecc:security-bounty-hunter',
    tags: ['security', 'bounty', 'hackerone', 'huntr', 'vulnerability', 'ssrf', 'rce'],
  },
  {
    id: 'security-review',
    name: 'Security Review',
    category: 'security',
    description: 'Full code audit: secrets, SQL injection, XSS, CSRF, auth, rate limiting, CORS.',
    delivers: 'Чеклист уязвимостей + исправленный код',
    earning: '$500 – $5 000 / проект',
    command: '/ecc:security-review',
    tags: ['security', 'audit', 'xss', 'csrf', 'sql', 'auth', 'owasp'],
  },
  {
    id: 'defi-amm-security',
    name: 'DeFi AMM Security',
    category: 'security',
    description: 'Solidity AMM/liquidity pool audit: reentrancy, oracle manipulation, integer math.',
    delivers: 'Отчёт безопасности смарт-контракта',
    earning: '$2 000 – $50 000 / аудит',
    command: '/ecc:defi-amm-security',
    tags: ['solidity', 'defi', 'amm', 'smart-contract', 'web3', 'audit'],
  },
  {
    id: 'llm-trading-agent-security',
    name: 'LLM Trading Agent Security',
    category: 'security',
    description: 'Secure autonomous trading agents: prompt injection defense, spend limits, MEV protection.',
    delivers: 'Безопасная архитектура trading бота',
    earning: '$3 000 – $20 000 / аудит',
    command: '/ecc:llm-trading-agent-security',
    tags: ['trading', 'llm', 'agent', 'security', 'mev', 'wallet'],
  },
  {
    id: 'hipaa-compliance',
    name: 'HIPAA Compliance',
    category: 'security',
    description: 'HIPAA compliance for healthcare apps: PHI handling, BAA gates, breach posture.',
    delivers: 'US healthcare compliance отчёт',
    earning: '$5 000 – $30 000 / проект',
    command: '/ecc:hipaa-compliance',
    tags: ['hipaa', 'healthcare', 'phi', 'compliance', 'baa', 'medical'],
  },
  {
    id: 'healthcare-phi-compliance',
    name: 'PHI/PII Compliance',
    category: 'security',
    description: 'PHI/PII protection: RLS by facility, audit trails, zero-leak DB architecture.',
    delivers: 'HIPAA-ready архитектура с audit trail',
    earning: '$3 000 – $15 000 / внедрение',
    command: '/ecc:healthcare-phi-compliance',
    tags: ['phi', 'pii', 'hipaa', 'rls', 'audit', 'healthcare', 'database'],
  },
  {
    id: 'security-scan',
    name: 'Security Scan',
    category: 'security',
    description: 'Automated vulnerability scan across the entire codebase.',
    delivers: 'Отчёт с CVE + рекомендации',
    earning: '$300 – $2 000 / скан',
    command: '/ecc:security-scan',
    tags: ['scan', 'cve', 'vulnerability', 'automated', 'audit'],
  },

  // --- AI AGENTS ---
  {
    id: 'agentic-engineering',
    name: 'Agentic Engineering',
    category: 'ai-agents',
    description: 'Eval-first AI agent systems: decomposition, model routing Haiku→Sonnet→Opus, cost tracking.',
    delivers: 'Production AI агентная система',
    earning: '$10 000 – $500 000+',
    command: '/ecc:agentic-engineering',
    tags: ['agent', 'ai', 'eval', 'orchestration', 'llm', 'automation'],
  },
  {
    id: 'mcp-server-patterns',
    name: 'MCP Server Patterns',
    category: 'ai-agents',
    description: 'Build MCP servers with Node/TypeScript SDK: tools, resources, prompts, Zod validation.',
    delivers: 'Custom MCP сервер для Claude Code',
    earning: '$500 – $5 000 / сервер',
    command: '/ecc:mcp-server-patterns',
    tags: ['mcp', 'server', 'claude', 'tools', 'typescript', 'zod'],
  },
  {
    id: 'team-agent-orchestration',
    name: 'Team Agent Orchestration',
    category: 'ai-agents',
    description: 'Multi-agent Kanban: work items, ownership, merge gates, agent squads.',
    delivers: 'Многоагентная система автоматизации',
    earning: '$10 000 – $500 000+',
    command: '/ecc:team-agent-orchestration',
    tags: ['multi-agent', 'orchestration', 'kanban', 'automation', 'squads'],
  },
  {
    id: 'autonomous-loops',
    name: 'Autonomous Loops',
    category: 'ai-agents',
    description: 'Claude Code loop patterns: sequential pipeline, NanoClaw REPL, RFC-DAG multi-agent.',
    delivers: 'Autonomous CI/CD agent pipeline',
    earning: '$1 000 – $5 000 / мес экономии',
    command: '/ecc:autonomous-loops',
    tags: ['loop', 'autonomous', 'pipeline', 'dag', 'repl', 'ci'],
  },
  {
    id: 'enterprise-agent-ops',
    name: 'Enterprise Agent Ops',
    category: 'ai-agents',
    description: 'Long-lived agent workloads: observability, security boundaries, lifecycle management.',
    delivers: 'Enterprise-grade agent operations',
    earning: '$10 000 – $50 000 / мес',
    command: '/ecc:enterprise-agent-ops',
    tags: ['enterprise', 'ops', 'observability', 'agent', 'lifecycle'],
  },
  {
    id: 'eval-harness',
    name: 'Eval Harness',
    category: 'ai-agents',
    description: 'Formal evaluation framework: capability evals, regression evals, LLM-as-judge graders.',
    delivers: 'Система оценки качества AI',
    earning: '$5 000 – $25 000',
    command: '/ecc:eval-harness',
    tags: ['eval', 'evaluation', 'llm', 'judge', 'regression', 'ai'],
  },
  {
    id: 'cost-aware-llm-pipeline',
    name: 'Cost-Aware LLM Pipeline',
    category: 'ai-agents',
    description: 'LLM API cost optimization: model routing, prompt caching, retry logic, budget tracking.',
    delivers: 'Снижение расходов на AI до 10x',
    earning: '$500 – $10 000 / мес экономии',
    command: '/ecc:cost-aware-llm-pipeline',
    tags: ['cost', 'llm', 'optimization', 'caching', 'routing', 'budget'],
  },
  {
    id: 'agent-architecture-audit',
    name: 'Agent Architecture Audit',
    category: 'ai-agents',
    description: '12-layer agent stack diagnostic: memory pollution, tool discipline, rendering corruption.',
    delivers: 'Severity-ranked audit report + code fixes',
    earning: '$2 000 – $10 000 / аудит',
    command: '/ecc:agent-architecture-audit',
    tags: ['audit', 'agent', 'architecture', 'debug', 'memory', 'tools'],
  },
  {
    id: 'prompt-optimizer',
    name: 'Prompt Optimizer',
    category: 'ai-agents',
    description: 'Analyze prompts, detect intent gaps, match ECC components, output ready-to-use prompts.',
    delivers: 'Оптимизированные промпты + workflow',
    earning: '$100 – $500 / промпт',
    command: '/ecc:prompt-optimizer',
    tags: ['prompt', 'optimize', 'intent', 'llm', 'workflow'],
  },
  {
    id: 'continuous-agent-loop',
    name: 'Continuous Agent Loop',
    category: 'ai-agents',
    description: 'Continuous processing loops with safety defaults and explicit stop conditions.',
    delivers: 'Автономный агент без вмешательства',
    earning: '$5 000 – $50 000 / продукт',
    command: '/ecc:continuous-agent-loop',
    tags: ['loop', 'continuous', 'autonomous', 'agent', 'safety'],
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    category: 'ai-agents',
    description: 'Architecture blueprint for agent systems: data flow, component design, integration points.',
    delivers: 'Полный архитектурный план',
    earning: '$3 000 – $15 000 / consulting',
    command: '/ecc:blueprint',
    tags: ['blueprint', 'architecture', 'agent', 'design', 'plan'],
  },

  // --- FINANCE / TRADING ---
  {
    id: 'prediction-market-oracle-research',
    name: 'Prediction Market Research',
    category: 'finance',
    description: 'Prediction markets as data sources: liquidity, implied probabilities, manipulation signals.',
    delivers: 'Market intelligence briefing',
    earning: 'Торговое преимущество',
    command: '/ecc:prediction-market-oracle-research',
    tags: ['prediction', 'market', 'oracle', 'liquidity', 'probability'],
  },
  {
    id: 'ito-market-intelligence',
    name: 'Itô Market Intelligence',
    category: 'finance',
    description: 'Itô basket research: events, venues, underliers, liquidity, spread, news context.',
    delivers: 'Market intelligence briefing + basket analysis',
    earning: 'Торговое преимущество',
    command: '/ecc:ito-market-intelligence',
    tags: ['ito', 'basket', 'prediction', 'market', 'liquidity', 'spread'],
  },
  {
    id: 'ito-trade-planner',
    name: 'Itô Trade Planner',
    category: 'finance',
    description: 'Non-advisory trade planning worksheet: venues, underliers, order prerequisites, checklist.',
    delivers: 'Структурированный план сделки',
    earning: 'Основа для алго-трейдинга',
    command: '/ecc:ito-trade-planner',
    tags: ['trade', 'planning', 'ito', 'venue', 'worksheet'],
  },
  {
    id: 'ito-data-atlas-agent',
    name: 'Itô Data Atlas Agent',
    category: 'finance',
    description: 'Design Data Atlas agents for basket research: 4-lane architecture with human approval gates.',
    delivers: 'Blueprint prediction market агента для hedge fund',
    earning: '$50 000 – $500 000',
    command: '/ecc:ito-data-atlas-agent',
    tags: ['ito', 'atlas', 'agent', 'hedge-fund', 'basket', 'architecture'],
  },
  {
    id: 'customer-billing-ops',
    name: 'Customer Billing Ops',
    category: 'finance',
    description: 'Billing workflows for subscriptions, refunds, churn triage via Stripe.',
    delivers: 'Automated billing operations система',
    earning: '$2 000 – $10 000 / внедрение',
    command: '/ecc:customer-billing-ops',
    tags: ['billing', 'stripe', 'subscription', 'refund', 'churn', 'saas'],
  },
  {
    id: 'finance-billing-ops',
    name: 'Finance Billing Ops',
    category: 'finance',
    description: 'Revenue truth: pricing, team billing, seat counting, code-backed behavior verification.',
    delivers: 'Finance operations система',
    earning: '$3 000 – $15 000 / внедрение',
    command: '/ecc:finance-billing-ops',
    tags: ['finance', 'revenue', 'pricing', 'billing', 'saas'],
  },

  // --- MARKETING / GROWTH ---
  {
    id: 'content-engine',
    name: 'Content Engine',
    category: 'marketing',
    description: 'Platform-native content for X, LinkedIn, TikTok, YouTube, newsletters — one source, all platforms.',
    delivers: 'Контентная система + calendar',
    earning: '$2 000 – $10 000 / клиент/мес',
    command: '/ecc:content-engine',
    tags: ['content', 'social', 'linkedin', 'twitter', 'youtube', 'newsletter'],
  },
  {
    id: 'brand-voice',
    name: 'Brand Voice',
    category: 'marketing',
    description: 'Source-derived writing style profile from real posts — reuse across content, outreach, social.',
    delivers: 'Voice profile + шаблоны ghostwriting',
    earning: '$1 000 – $10 000 / мес',
    command: '/ecc:brand-voice',
    tags: ['brand', 'voice', 'ghostwriting', 'writing', 'style', 'content'],
  },
  {
    id: 'seo',
    name: 'SEO',
    category: 'marketing',
    description: 'Technical SEO audit: Core Web Vitals, schema markup, canonicals, keyword mapping.',
    delivers: 'SEO action plan + имплементация',
    earning: '$1 000 – $5 000 / мес',
    command: '/ecc:seo',
    tags: ['seo', 'google', 'web-vitals', 'schema', 'keywords', 'audit'],
  },
  {
    id: 'market-research',
    name: 'Market Research',
    category: 'marketing',
    description: 'TAM/SAM/SOM, competitive analysis, investor due diligence with source attribution.',
    delivers: 'Sourced research report с downside cases',
    earning: '$500 – $5 000 / отчёт',
    command: '/ecc:market-research',
    tags: ['research', 'market', 'tam', 'competitive', 'analysis', 'due-diligence'],
  },
  {
    id: 'investor-materials',
    name: 'Investor Materials',
    category: 'marketing',
    description: 'Pitch decks, one-pagers, financial models, accelerator applications — internally consistent.',
    delivers: 'Investor-ready документы',
    earning: 'Привлечение раундов $100K – $10M',
    command: '/ecc:investor-materials',
    tags: ['investor', 'pitch', 'deck', 'fundraising', 'financial-model', 'vc'],
  },
  {
    id: 'investor-outreach',
    name: 'Investor Outreach',
    category: 'marketing',
    description: 'Cold emails, warm intro blurbs, follow-ups for angels, VCs, strategic investors.',
    delivers: 'Готовые письма инвесторам',
    earning: 'Ускорение fundraising раунда',
    command: '/ecc:investor-outreach',
    tags: ['investor', 'email', 'outreach', 'fundraising', 'cold-email', 'vc'],
  },
  {
    id: 'lead-intelligence',
    name: 'Lead Intelligence',
    category: 'marketing',
    description: 'AI lead pipeline replacing Apollo/Clay: signal scoring, warm path discovery, multi-channel outreach.',
    delivers: 'Квалифицированный lead list + outreach',
    earning: 'Замена Apollo+Clay: $1 000+/мес экономии',
    command: '/ecc:lead-intelligence',
    tags: ['leads', 'apollo', 'clay', 'outreach', 'sales', 'linkedin', 'crm'],
  },
  {
    id: 'crosspost',
    name: 'Crosspost',
    category: 'marketing',
    description: 'Multi-platform distribution: X, LinkedIn, Threads, Bluesky — platform-native, never copy-paste.',
    delivers: 'Платформо-нативные посты',
    earning: '$500 – $3 000 / мес',
    command: '/ecc:crosspost',
    tags: ['social', 'crosspost', 'twitter', 'linkedin', 'threads', 'bluesky'],
  },
  {
    id: 'social-graph-ranker',
    name: 'Social Graph Ranker',
    category: 'marketing',
    description: 'Weighted social graph ranking: warm intro discovery, bridge scoring, network gap analysis.',
    delivers: 'Карта тёплых знакомств до цели',
    earning: 'Нетворкинг для fundraising/sales',
    command: '/ecc:social-graph-ranker',
    tags: ['social', 'graph', 'network', 'intro', 'linkedin', 'twitter', 'bridge'],
  },

  // --- MEDIA / VIDEO ---
  {
    id: 'manim-video',
    name: 'Manim Video',
    category: 'media',
    description: 'Animated explainers for technical concepts, system diagrams, product walkthroughs (Python Manim).',
    delivers: 'MP4 анимация + thumbnail + storyboard',
    earning: '$500 – $3 000 / видео',
    command: '/ecc:manim-video',
    tags: ['video', 'animation', 'manim', 'explainer', 'technical', 'diagram'],
  },
  {
    id: 'remotion-video-creation',
    name: 'Remotion Video',
    category: 'media',
    description: 'Programmatic video via React/Remotion: 3D, animations, charts, captions, dynamic metadata.',
    delivers: 'Code-generated видео продукт',
    earning: '$1 000 – $10 000 / продукт',
    command: '/ecc:remotion-video-creation',
    tags: ['video', 'remotion', 'react', '3d', 'animation', 'programmatic'],
  },
  {
    id: 'fal-ai-media',
    name: 'fal.ai Media',
    category: 'media',
    description: 'Unified AI media generation: text-to-image (Nano Banana), video (Veo 3/Kling), audio (CSM-1B).',
    delivers: 'AI-generated медиа контент',
    earning: '$100 – $1 000 / проект',
    command: '/ecc:fal-ai-media',
    tags: ['ai', 'image', 'video', 'audio', 'generation', 'fal', 'veo3'],
  },
  {
    id: 'video-editing',
    name: 'Video Editing',
    category: 'media',
    description: 'Automated video editing pipelines: trim, concat, overlay, subtitle generation.',
    delivers: 'Автоматизированное видео',
    earning: '$500 – $2 000 / мес экономии',
    command: '/ecc:video-editing',
    tags: ['video', 'editing', 'ffmpeg', 'automation', 'pipeline'],
  },

  // --- RESEARCH / DATA ---
  {
    id: 'deep-research',
    name: 'Deep Research',
    category: 'research',
    description: 'Multi-source research with firecrawl + exa: cited reports, competitive analysis, due diligence.',
    delivers: 'Полный research отчёт с источниками',
    earning: '$200 – $2 000 / отчёт',
    command: '/ecc:deep-research',
    tags: ['research', 'web', 'firecrawl', 'exa', 'citations', 'analysis'],
  },
  {
    id: 'data-scraper-agent',
    name: 'Data Scraper Agent',
    category: 'research',
    description: 'Automated scraper for any public source → Notion/Sheets/Supabase. Free on GitHub Actions.',
    delivers: 'Production data pipeline (бесплатно)',
    earning: '$500 – $5 000 / мес (data product)',
    command: '/ecc:data-scraper-agent',
    tags: ['scraping', 'data', 'automation', 'github-actions', 'notion', 'supabase'],
  },
  {
    id: 'exa-search',
    name: 'Exa Search',
    category: 'research',
    description: 'Neural search via Exa MCP: web, code examples, company intel, people lookup.',
    delivers: 'Глубокий поиск с AI пониманием',
    earning: 'Research в 5x быстрее',
    command: '/ecc:exa-search',
    tags: ['search', 'exa', 'neural', 'web', 'company', 'people'],
  },
  {
    id: 'scientific-db-pubmed-database',
    name: 'PubMed Database',
    category: 'research',
    description: 'Structured PubMed search: clinical trials, literature review, biomedical data.',
    delivers: 'Научные данные для healthcare',
    earning: '$2 000 – $10 000 / consulting',
    command: '/ecc:scientific-db-pubmed-database',
    tags: ['pubmed', 'medical', 'research', 'clinical', 'biomedical'],
  },
  {
    id: 'scientific-db-uspto-database',
    name: 'USPTO Patent Database',
    category: 'research',
    description: 'Patent landscape analysis, prior art search, classification via USPTO database.',
    delivers: 'Patent landscape analysis',
    earning: '$2 000 – $10 000 / анализ',
    command: '/ecc:scientific-db-uspto-database',
    tags: ['patent', 'uspto', 'ip', 'prior-art', 'landscape'],
  },
  {
    id: 'iterative-retrieval',
    name: 'Iterative Retrieval',
    category: 'research',
    description: 'Iterative retrieval for RAG systems: multi-hop queries, relevance re-ranking.',
    delivers: 'Точный RAG pipeline',
    earning: 'AI продукт: $5 000 – $30 000',
    command: '/ecc:iterative-retrieval',
    tags: ['rag', 'retrieval', 'vector', 'search', 'ai', 'embedding'],
  },

  // --- BACKEND DEV ---
  {
    id: 'backend-patterns',
    name: 'Backend Patterns',
    category: 'backend',
    description: 'Node.js/Express: repository pattern, service layer, caching, auth, background jobs, logging.',
    delivers: 'Production-ready backend',
    earning: '$3 000 – $20 000 / проект',
    command: '/ecc:backend-patterns',
    tags: ['node', 'express', 'backend', 'api', 'cache', 'auth'],
  },
  {
    id: 'api-design',
    name: 'API Design',
    category: 'backend',
    description: 'REST API: resource naming, status codes, pagination, filtering, versioning, rate limiting.',
    delivers: 'Чистый API контракт',
    earning: 'Сокращение revision cycles',
    command: '/ecc:api-design',
    tags: ['api', 'rest', 'design', 'pagination', 'versioning', 'rate-limit'],
  },
  {
    id: 'api-connector-builder',
    name: 'API Connector Builder',
    category: 'backend',
    description: 'Build new API connectors matching repo\'s existing integration pattern exactly.',
    delivers: 'Готовый интегрированный connector',
    earning: '$500 – $5 000 / connector',
    command: '/ecc:api-connector-builder',
    tags: ['api', 'connector', 'integration', 'provider', 'pattern'],
  },
  {
    id: 'database-migrations',
    name: 'Database Migrations',
    category: 'backend',
    description: 'Zero-downtime DB migrations: schema changes, rollbacks, Prisma/Drizzle/Django/golang-migrate.',
    delivers: 'Zero-downtime migration',
    earning: 'Избежание даунтаймов: $$$',
    command: '/ecc:database-migrations',
    tags: ['database', 'migration', 'postgres', 'prisma', 'zero-downtime'],
  },
  {
    id: 'postgres-patterns',
    name: 'Postgres Patterns',
    category: 'backend',
    description: 'PostgreSQL: RLS, advanced indexes, JSONB, full-text search, query optimization.',
    delivers: 'Optimized Postgres schema',
    earning: 'Performance 10x',
    command: '/ecc:postgres-patterns',
    tags: ['postgres', 'sql', 'rls', 'index', 'jsonb', 'optimization'],
  },
  {
    id: 'fastapi-patterns',
    name: 'FastAPI Patterns',
    category: 'backend',
    description: 'FastAPI: async routes, dependency injection, Pydantic v2, OpenAPI, security middleware.',
    delivers: 'Production FastAPI приложение',
    earning: '$3 000 – $15 000 / проект',
    command: '/ecc:fastapi-patterns',
    tags: ['fastapi', 'python', 'async', 'pydantic', 'openapi', 'rest'],
  },
  {
    id: 'django-patterns',
    name: 'Django Patterns',
    category: 'backend',
    description: 'Django: ORM, CBVs, DRF serializers, Celery tasks, signals, custom auth.',
    delivers: 'Полное Django приложение',
    earning: '$3 000 – $20 000 / проект',
    command: '/ecc:django-patterns',
    tags: ['django', 'python', 'orm', 'drf', 'celery', 'backend'],
  },
  {
    id: 'nestjs-patterns',
    name: 'NestJS Patterns',
    category: 'backend',
    description: 'NestJS: modules, providers, guards, interceptors, pipes, WebSockets.',
    delivers: 'Enterprise Node.js backend',
    earning: '$3 000 – $15 000 / проект',
    command: '/ecc:nestjs-patterns',
    tags: ['nestjs', 'node', 'typescript', 'enterprise', 'guards', 'backend'],
  },
  {
    id: 'mcp-server-patterns',
    name: 'MCP Server Patterns',
    category: 'backend',
    description: 'MCP servers: tools, resources, prompts, stdio/HTTP transports, Zod validation.',
    delivers: 'Custom MCP сервер',
    earning: '$500 – $5 000 / сервер',
    command: '/ecc:mcp-server-patterns',
    tags: ['mcp', 'claude', 'server', 'typescript', 'zod', 'tools'],
  },
  {
    id: 'golang-patterns',
    name: 'Go Patterns',
    category: 'backend',
    description: 'Go: idioms, error handling, concurrency, interfaces, context propagation.',
    delivers: 'Production Go сервис',
    earning: '$5 000 – $25 000 / проект',
    command: '/ecc:golang-patterns',
    tags: ['go', 'golang', 'concurrency', 'error-handling', 'interfaces'],
  },

  // --- FRONTEND DEV ---
  {
    id: 'frontend-patterns',
    name: 'Frontend Patterns',
    category: 'frontend',
    description: 'React/Next.js: hooks, state management, code splitting, error boundaries, accessibility.',
    delivers: 'Modern React архитектура',
    earning: '$3 000 – $15 000 / проект',
    command: '/ecc:frontend-patterns',
    tags: ['react', 'nextjs', 'frontend', 'hooks', 'state', 'a11y'],
  },
  {
    id: 'react-patterns',
    name: 'React Patterns',
    category: 'frontend',
    description: 'React 19: server/client components, Suspense, error boundaries, form actions, data fetching.',
    delivers: 'Reusable компонент библиотека',
    earning: '$2 000 – $10 000 / библиотека',
    command: '/ecc:react-patterns',
    tags: ['react', 'components', 'server', 'suspense', 'hooks', 'patterns'],
  },
  {
    id: 'react-performance',
    name: 'React Performance',
    category: 'frontend',
    description: 'React optimization: useMemo, virtualization, lazy loading, bundle splitting, Core Web Vitals.',
    delivers: 'Быстрый React app',
    earning: 'Конверсия +10–30%',
    command: '/ecc:react-performance',
    tags: ['react', 'performance', 'optimization', 'memo', 'virtual', 'cwv'],
  },
  {
    id: 'liquid-glass-design',
    name: 'Liquid Glass Design',
    category: 'frontend',
    description: 'Apple Vision Pro Liquid Glass UI: glassmorphism, depth layers, blur surfaces.',
    delivers: 'Премиум glassmorphism UI',
    earning: '$2 000 – $10 000 / UI',
    command: '/ecc:liquid-glass-design',
    tags: ['design', 'glass', 'apple', 'ui', 'glassmorphism', 'visionpro'],
  },
  {
    id: 'motion-ui',
    name: 'Motion UI',
    category: 'frontend',
    description: 'Framer Motion animations: page transitions, list animations, micro-interactions.',
    delivers: 'Animated polished interface',
    earning: 'Premium feel UI',
    command: '/ecc:motion-ui',
    tags: ['animation', 'motion', 'framer', 'transitions', 'ui', 'frontend'],
  },
  {
    id: 'swiftui-patterns',
    name: 'SwiftUI Patterns',
    category: 'frontend',
    description: 'SwiftUI: views, bindings, environment, animations, NavigationStack, Swift Concurrency.',
    delivers: 'iOS/macOS приложение',
    earning: '$5 000 – $30 000 / проект',
    command: '/ecc:swiftui-patterns',
    tags: ['swift', 'swiftui', 'ios', 'macos', 'apple', 'mobile'],
  },
  {
    id: 'dart-flutter-patterns',
    name: 'Flutter/Dart Patterns',
    category: 'frontend',
    description: 'Flutter: widgets, BLoC/Riverpod, navigation, platform channels, performance.',
    delivers: 'Cross-platform мобильное приложение',
    earning: '$5 000 – $30 000 / проект',
    command: '/ecc:dart-flutter-patterns',
    tags: ['flutter', 'dart', 'mobile', 'bloc', 'riverpod', 'cross-platform'],
  },
  {
    id: 'dashboard-builder',
    name: 'Dashboard Builder',
    category: 'frontend',
    description: 'Grafana/SigNoz monitoring dashboards that answer real operator questions, not vanity boards.',
    delivers: 'Actionable ops dashboard',
    earning: '$1 000 – $5 000 / дашборд',
    command: '/ecc:dashboard-builder',
    tags: ['grafana', 'monitoring', 'dashboard', 'metrics', 'ops', 'observability'],
  },

  // --- DEVOPS ---
  {
    id: 'deployment-patterns',
    name: 'Deployment Patterns',
    category: 'devops',
    description: 'CI/CD: rolling, blue-green, canary; Kubernetes probes; health checks; rollback strategies.',
    delivers: 'Production deployment pipeline',
    earning: '$3 000 – $15 000 / внедрение',
    command: '/ecc:deployment-patterns',
    tags: ['deployment', 'ci', 'cd', 'kubernetes', 'canary', 'rollback'],
  },
  {
    id: 'docker-patterns',
    name: 'Docker Patterns',
    category: 'devops',
    description: 'Docker Compose: multi-stage builds, non-root users, networks, volumes, secrets.',
    delivers: 'Secure containerized app',
    earning: '$1 000 – $5 000 / consulting',
    command: '/ecc:docker-patterns',
    tags: ['docker', 'compose', 'container', 'build', 'networking', 'devops'],
  },
  {
    id: 'github-ops',
    name: 'GitHub Ops',
    category: 'devops',
    description: 'GitHub automation: issue triage, PR management, CI debugging, releases, Dependabot.',
    delivers: 'Automated repository management',
    earning: '$500 – $3 000 / мес',
    command: '/ecc:github-ops',
    tags: ['github', 'actions', 'ci', 'pr', 'release', 'automation'],
  },
  {
    id: 'terminal-ops',
    name: 'Terminal Ops',
    category: 'devops',
    description: 'Shell scripting, CLI tools, automation, cron jobs, process management.',
    delivers: 'Production shell automation',
    earning: '$1 000 – $5 000 / скрипт',
    command: '/ecc:terminal-ops',
    tags: ['shell', 'bash', 'cli', 'automation', 'cron', 'sysadmin'],
  },
  {
    id: 'netmiko-ssh-automation',
    name: 'Netmiko SSH Automation',
    category: 'devops',
    description: 'Python Netmiko: SSH automation for routers, switches, firewalls at scale.',
    delivers: 'Network automation scripts',
    earning: '$5 000 – $20 000 / проект',
    command: '/ecc:netmiko-ssh-automation',
    tags: ['netmiko', 'ssh', 'network', 'automation', 'cisco', 'python'],
  },
  {
    id: 'network-bgp-diagnostics',
    name: 'BGP Diagnostics',
    category: 'devops',
    description: 'BGP routing diagnostics: peering, convergence, route leaks, policy analysis.',
    delivers: 'BGP troubleshooting report',
    earning: '$2 000 – $10 000 / consulting',
    command: '/ecc:network-bgp-diagnostics',
    tags: ['bgp', 'routing', 'network', 'peering', 'diagnostics'],
  },
  {
    id: 'latency-critical-systems',
    name: 'Latency-Critical Systems',
    category: 'devops',
    description: 'Sub-millisecond systems: lock-free data structures, CPU pinning, DPDK, kernel bypass.',
    delivers: 'HFT-grade low-latency система',
    earning: '$20 000 – $100 000+ / проект',
    command: '/ecc:latency-critical-systems',
    tags: ['latency', 'hft', 'performance', 'lock-free', 'kernel', 'fintech'],
  },

  // --- TESTING / QA ---
  {
    id: 'tdd-workflow',
    name: 'TDD Workflow',
    category: 'testing',
    description: 'TDD enforcement: write tests first, 80%+ coverage, unit + integration + E2E.',
    delivers: 'Полный test suite с чеклистами',
    earning: 'Снижение багов: $1 000–$10 000/мес',
    command: '/ecc:tdd-workflow',
    tags: ['tdd', 'testing', 'coverage', 'unit', 'integration', 'e2e'],
  },
  {
    id: 'e2e-testing',
    name: 'E2E Testing',
    category: 'testing',
    description: 'Playwright E2E: Page Object Model, CI integration, artifact management, flaky test strategy.',
    delivers: 'Automated end-to-end suite',
    earning: '$2 000 – $8 000 / внедрение',
    command: '/ecc:e2e-testing',
    tags: ['playwright', 'e2e', 'testing', 'automation', 'ci', 'browser'],
  },
  {
    id: 'verification-loop',
    name: 'Verification Loop',
    category: 'testing',
    description: 'Iterative verification with self-correction: run → check → fix → repeat until green.',
    delivers: 'Verified implementation',
    earning: 'Качество кода ↑',
    command: '/ecc:verification-loop',
    tags: ['verification', 'testing', 'loop', 'quality', 'iterative'],
  },
  {
    id: 'error-handling',
    name: 'Error Handling',
    category: 'testing',
    description: 'Typed errors, error boundaries, retries, circuit breakers across TypeScript, Python, Go.',
    delivers: 'Robust error handling patterns',
    earning: 'Надёжность системы ↑',
    command: '/ecc:error-handling',
    tags: ['error', 'handling', 'retry', 'circuit-breaker', 'typescript', 'python', 'go'],
  },
  {
    id: 'ai-regression-testing',
    name: 'AI Regression Testing',
    category: 'testing',
    description: 'AI-specific regression tests: prompt regression, output quality, model swap safety.',
    delivers: 'AI model regression suite',
    earning: '$5 000 – $20 000 / MLOps',
    command: '/ecc:ai-regression-testing',
    tags: ['ai', 'regression', 'testing', 'mlops', 'prompt', 'quality'],
  },

  // --- DOMAIN SPECIFIC ---
  {
    id: 'visa-doc-translate',
    name: 'Visa Doc Translate',
    category: 'domain',
    description: 'OCR + translate visa documents (HEIC/PNG) → bilingual PDF with original + English.',
    delivers: 'Официальный двуязычный PDF',
    earning: '$50 – $200 / документ',
    command: '/ecc:visa-doc-translate',
    tags: ['visa', 'translation', 'ocr', 'pdf', 'immigration', 'document'],
  },
  {
    id: 'jira-integration',
    name: 'Jira Integration',
    category: 'domain',
    description: 'Jira via MCP or REST: fetch tickets, JQL search, comments, transitions, PR linking.',
    delivers: 'Automated project management',
    earning: '$500 – $2 000 / мес экономии',
    command: '/ecc:jira-integration',
    tags: ['jira', 'project', 'management', 'mcp', 'tickets', 'workflow'],
  },
  {
    id: 'inventory-demand-planning',
    name: 'Demand Planning',
    category: 'domain',
    description: 'Inventory demand forecasting: reorder points, safety stock, ABC classification.',
    delivers: 'Demand forecast система',
    earning: '$5 000 – $25 000 / внедрение',
    command: '/ecc:inventory-demand-planning',
    tags: ['inventory', 'demand', 'forecasting', 'supply-chain', 'logistics'],
  },
  {
    id: 'customs-trade-compliance',
    name: 'Trade Compliance',
    category: 'domain',
    description: 'Customs compliance: HS code classification, trade documentation, sanctions screening.',
    delivers: 'Trade compliance пакет',
    earning: '$2 000 – $10 000 / проект',
    command: '/ecc:customs-trade-compliance',
    tags: ['customs', 'trade', 'compliance', 'hs-code', 'sanctions', 'logistics'],
  },
  {
    id: 'energy-procurement',
    name: 'Energy Procurement',
    category: 'domain',
    description: 'Energy procurement: tariff analysis, supplier comparison, contract strategy.',
    delivers: 'Energy procurement plan',
    earning: '$5 000 – $20 000 / consulting',
    command: '/ecc:energy-procurement',
    tags: ['energy', 'procurement', 'tariff', 'utility', 'strategy'],
  },
];

export const CATEGORIES: Record<Category, { label: string; accent: string; count?: number }> = {
  security:  { label: 'Безопасность', accent: 'var(--accent-security)' },
  'ai-agents': { label: 'AI Агенты',  accent: 'var(--accent-ai)' },
  finance:   { label: 'Финансы',      accent: 'var(--accent-finance)' },
  marketing: { label: 'Маркетинг',    accent: 'var(--accent-marketing)' },
  media:     { label: 'Медиа',        accent: 'var(--accent-media)' },
  research:  { label: 'Исследования', accent: 'var(--accent-research)' },
  backend:   { label: 'Backend',      accent: 'var(--accent-dev)' },
  frontend:  { label: 'Frontend',     accent: 'var(--accent-dev)' },
  devops:    { label: 'DevOps',       accent: 'var(--accent-devops)' },
  testing:   { label: 'Тестирование', accent: 'var(--accent-qa)' },
  ml:        { label: 'ML/AI',        accent: 'var(--accent-ai)' },
  domain:    { label: 'Домены',       accent: 'var(--accent-domain)' },
};
```

---

## Component Specs

### Header
```
┌─────────────────────────────────────────────────────┐
│  ⬡ ECC Skills                          197 скилов   │
│  Command center для AI-powered разработки           │
│                                                     │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐           │
│  │  197  │ │  64   │ │  84   │ │  20   │           │
│  │Скилов │ │Агентов│ │Команд │ │Правил │           │
│  └───────┘ └───────┘ └───────┘ └───────┘           │
└─────────────────────────────────────────────────────┘
```

### SearchBar
- Placeholder: `Поиск скилов... (⌘K)`
- Keyboard shortcut: `Cmd/Ctrl + K` focuses input
- Searches: name, description, tags, delivers, earning
- Shows count: `Найдено: 12 из 197`

### CategoryFilter
- Horizontal scrollable pill row
- `Все` pill first (default selected)
- Each pill shows category label + count badge
- Active pill: filled with category accent color
- Inactive: ghost with subtle border

### SkillCard
```
┌─────────────────────────────────────────┐
│ [accent dot] SECURITY          $500–$50K│
│                                         │
│ Bug Bounty Hunter                       │  ← text-xl font-semibold
│                                         │
│ Hunt exploitable vulnerabilities...     │  ← text-sm text-secondary, 2 lines
│                                         │
│ ─────────────────────────────────────── │
│ Получишь: Готовый HackerOne репорт      │  ← text-xs text-muted
│                                         │
│ ┌─────────────────────────────────┐ 📋 │
│ │ /ecc:security-bounty-hunter     │    │  ← JetBrains Mono, copy on click
│ └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

- Card hover: `translateY(-2px)`, border brightens to `--border-hover`
- Command hover: reveals copy icon `📋`
- Copy: writes to clipboard, shows `✓ Скопировано` for 1.5s
- Earning badge: top-right, small, accent-colored text

### CommandBadge
- Monospace font, dark inner background
- Click → copy to clipboard
- Tooltip on hover: `Нажми чтобы скопировать`

---

## Layout

```
[Header + Stats]
[SearchBar                    ] [Найдено: 197]
[All][Security][AI][Finance][Marketing][Media][Research][Backend][Frontend][DevOps][Testing][Domain]

[Grid: 3 cols desktop, 2 tablet, 1 mobile]
 Card  Card  Card
 Card  Card  Card
 ...
```

Grid: `grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))`

---

## Interactions

1. **Search** — filters cards by name/description/tags/delivers/earning in real-time (useMemo)
2. **Category filter** — shows only that category; combined with search
3. **Copy command** — click command badge → clipboard → toast `✓ Скопировано`
4. **Keyboard:** `⌘K` focus search, `Escape` clear search
5. **Scroll to top** — floating button appears after 300px scroll

---

## Implementation Notes

- All data is static (no API calls) — fast, no loading states needed
- `useMemo` for filtered results — no debounce needed at this scale
- CSS-only animations (no JS animation libraries)
- `navigator.clipboard.writeText()` for copy
- `position: sticky` for the search + filter row
- The grid should feel like it breathes — `gap: 1rem`, not tight

---

## What NOT to do

- No loading spinners (data is static)
- No pagination (197 cards render fine with CSS `content-visibility: auto`)
- No modal detail view — all info is on the card
- No dark/light toggle — dark only
- No external UI component library (shadcn, MUI, etc.)
- No redundant comments in code

---

## Start here

```
npx create-next-app@latest ecc-dashboard --typescript --tailwind --app --no-src-dir
cd ecc-dashboard
```

Then implement in this order:
1. `data/skills.ts` — all skill data
2. `app/globals.css` — CSS tokens + base reset
3. `components/SkillCard.tsx` — the core component
4. `components/CommandBadge.tsx` — copy-to-clipboard
5. `components/CategoryFilter.tsx` — pill filters
6. `components/SearchBar.tsx` — search input
7. `components/Header.tsx` — title + stats
8. `app/page.tsx` — wire everything together
