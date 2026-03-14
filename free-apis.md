# Free LLM API Resources
> Source: https://github.com/cheahjs/free-llm-api-resources

---

## Completely Free (No Credit Card)

| Provider | API Base URL | Free Limits | Best Models | Sign Up |
|----------|-------------|-------------|-------------|---------|
| **OpenRouter** | `https://openrouter.ai/api/v1` | 20 req/min, 50 req/day (1000/day after $10 topup) | Llama 3.3 70B, Gemma 3, Mistral Small | https://openrouter.ai |
| **Google AI Studio** | `https://generativelanguage.googleapis.com/v1beta` | Gemini Flash: 15 req/min, 1500/day | Gemini 2.0 Flash, Gemma 3 27B | https://aistudio.google.com |
| **Groq** | `https://api.groq.com/openai/v1` | Llama 8B: 14,400/day · 70B: 1,000/day | Llama 3.3 70B, Llama 3.1 8B, Whisper | https://console.groq.com |
| **Cerebras** | `https://api.cerebras.ai/v1` | 30 req/min, 60K tokens/min, 14.4K/day | Llama 3.1 70B, gpt-oss-120b | https://cloud.cerebras.ai |
| **Mistral** | `https://api.mistral.ai/v1` | 1 req/s, 500K tokens/min, 1B tokens/month | Mistral Small, Codestral | https://console.mistral.ai |
| **Cohere** | `https://api.cohere.com/v2` | 20 req/min, 1,000/month | Command R+, Aya 35B | https://cohere.com |
| **Cloudflare Workers AI** | `https://api.cloudflare.com/client/v4/accounts/{id}/ai/run` | 10,000 neurons/day | Llama 3, Qwen, Gemma | https://dash.cloudflare.com |
| **NVIDIA NIM** | `https://integrate.api.nvidia.com/v1` | 40 req/min | Llama 3.1 405B, Mixtral, DeepSeek | https://build.nvidia.com |
| **HuggingFace** | `https://api-inference.huggingface.co` | $0.10/month free credits | Any model <10GB | https://huggingface.co |
| **GitHub Models** | `https://models.inference.ai.azure.com` | Very restrictive (Copilot tier) | GPT-4o, Llama, DeepSeek R1 | https://github.com/marketplace/models |

---

## Trial Credits (Register Once)

| Provider | Credits | Expiry | Best For | URL |
|----------|---------|--------|----------|-----|
| **SambaNova** | $5 | 3 months | Llama 3.1 405B ultra-fast | https://cloud.sambanova.ai |
| **AI21** | $10 | 3 months | Jamba, task-specific models | https://studio.ai21.com |
| **Upstage** | $10 | 3 months | Solar models, document AI | https://console.upstage.ai |
| **Baseten** | $30 | — | Deploy any HF model | https://app.baseten.co |
| **Alibaba Cloud** | 1M tokens/model | — | Qwen models | https://bailian.console.alibabacloud.com |
| **Scaleway** | 1M tokens | — | Llama, Mistral EU-hosted | https://console.scaleway.com/generative-api |
| **Hyperbolic** | $1 | — | Llama 3.1 70B/405B | https://app.hyperbolic.ai |
| **Modal** | $5–30/month | Monthly | Custom deployments | https://modal.com |
| **Fireworks** | $1 | — | Llama 3.1, Mixtral (fast) | https://fireworks.ai |
| **Nebius** | $1 | — | Open source models | https://tokenfactory.nebius.com |
| **NLP Cloud** | $15 | — | Fine-tuned models | https://nlpcloud.com |
| **Novita** | $0.50 | 1 year | Large model variety | https://novita.ai |
| **Inference.net** | $1–25 | — | GPU inference | https://inference.net |

---

## Quick Comparison — Best Free Tiers

| Use Case | Best Provider | Why |
|----------|--------------|-----|
| High volume | Groq | 14,400 req/day on Llama 8B |
| Best model free | NVIDIA NIM | Llama 405B free |
| Most models | OpenRouter | 25+ free models |
| Fastest inference | Cerebras / Groq | Dedicated hardware |
| Google models | AI Studio | Gemini 2.0 Flash free |
| EU data privacy | Scaleway / Mistral | GDPR compliant |
| OpenAI drop-in | Groq / OpenRouter | OpenAI-compatible SDK |

---

## OpenAI-Compatible Providers
These work with `openai` npm/pip package just by changing `baseURL`:

```js
// Groq
const client = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' })

// OpenRouter
const client = new OpenAI({ apiKey: process.env.OPENROUTER_API_KEY, baseURL: 'https://openrouter.ai/api/v1' })

// Cerebras
const client = new OpenAI({ apiKey: process.env.CEREBRAS_API_KEY, baseURL: 'https://api.cerebras.ai/v1' })

// Mistral
const client = new OpenAI({ apiKey: process.env.MISTRAL_API_KEY, baseURL: 'https://api.mistral.ai/v1' })

// NVIDIA NIM
const client = new OpenAI({ apiKey: process.env.NVIDIA_API_KEY, baseURL: 'https://integrate.api.nvidia.com/v1' })
```
