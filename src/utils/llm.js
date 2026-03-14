/**
 * Multi-provider free LLM client with automatic fallback.
 *
 * Provider priority (fastest / most generous free tier first):
 *   1. Groq        — 14,400 req/day, fastest inference
 *   2. Cerebras    — 14,400 req/day, dedicated hardware
 *   3. Mistral     — 1B tokens/month
 *   4. OpenRouter  — 50 req/day (25+ models)
 *   5. Google      — Gemini 2.0 Flash, 1500 req/day
 *   6. Cohere      — 1,000 req/month
 *   7. SambaNova   — $5 trial, Llama 405B
 *   8. Fireworks   — $1 trial, fast Llama
 *   9. NVIDIA NIM  — 40 req/min, Llama 405B
 *
 * Usage:
 *   const llm = createLLMClient();
 *   if (llm) {
 *     const text = await llm.complete('Your prompt here');
 *   }
 */

const PROVIDERS = [
    {
        name: 'Groq',
        keyEnv: 'GROQ_API_KEY',
        url: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.3-70b-versatile',
        style: 'openai',
        maxTokens: 1024,
    },
    {
        name: 'Cerebras',
        keyEnv: 'CEREBRAS_API_KEY',
        url: 'https://api.cerebras.ai/v1/chat/completions',
        model: 'llama-3.3-70b',
        style: 'openai',
        maxTokens: 1024,
    },
    {
        name: 'Mistral',
        keyEnv: 'MISTRAL_API_KEY',
        url: 'https://api.mistral.ai/v1/chat/completions',
        model: 'mistral-small-latest',
        style: 'openai',
        maxTokens: 1024,
    },
    {
        name: 'OpenRouter',
        keyEnv: 'OPENROUTER_API_KEY',
        url: 'https://openrouter.ai/api/v1/chat/completions',
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        style: 'openai',
        maxTokens: 1024,
        extraHeaders: {
            'HTTP-Referer': 'https://recrea.mx',
            'X-Title': 'Recrea Construction Lead Scraper',
        },
    },
    {
        name: 'Google',
        keyEnv: 'GOOGLE_API_KEY',
        model: 'gemini-2.0-flash',
        style: 'google',
        maxTokens: 1024,
    },
    {
        name: 'Cohere',
        keyEnv: 'COHERE_API_KEY',
        url: 'https://api.cohere.com/v2/chat',
        model: 'command-r-plus-08-2024',
        style: 'cohere',
        maxTokens: 1024,
    },
    {
        name: 'SambaNova',
        keyEnv: 'SAMBANOVA_API_KEY',
        url: 'https://api.sambanova.ai/v1/chat/completions',
        model: 'Meta-Llama-3.1-70B-Instruct',
        style: 'openai',
        maxTokens: 1024,
    },
    {
        name: 'Fireworks',
        keyEnv: 'FIREWORKS_API_KEY',
        url: 'https://api.fireworks.ai/inference/v1/chat/completions',
        model: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
        style: 'openai',
        maxTokens: 1024,
    },
    {
        name: 'NVIDIA NIM',
        keyEnv: 'NVIDIA_API_KEY',
        url: 'https://integrate.api.nvidia.com/v1/chat/completions',
        model: 'meta/llama-3.1-8b-instruct',
        style: 'openai',
        maxTokens: 1024,
    },
];

async function callOpenAI(provider, prompt, key) {
    const res = await fetch(provider.url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
            ...provider.extraHeaders,
        },
        body: JSON.stringify({
            model: provider.model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: provider.maxTokens,
            temperature: 0.7,
        }),
        signal: AbortSignal.timeout(20000),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
    return data.choices?.[0]?.message?.content?.trim() ?? '';
}

async function callGoogle(provider, prompt, key) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${key}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: provider.maxTokens, temperature: 0.7 },
        }),
        signal: AbortSignal.timeout(20000),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}

async function callCohere(provider, prompt, key) {
    const res = await fetch(provider.url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
            model: provider.model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: provider.maxTokens,
        }),
        signal: AbortSignal.timeout(20000),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data.message?.content?.[0]?.text?.trim() ?? '';
}

/**
 * Create a multi-provider LLM client.
 * Returns null if no API keys are configured.
 *
 * @returns {{ complete: (prompt: string) => Promise<string>, providerName: string } | null}
 */
export function createLLMClient() {
    // Find first provider with a key configured
    const activeProviders = PROVIDERS.filter(p => process.env[p.keyEnv]);

    if (activeProviders.length === 0) {
        console.log('  ℹ No LLM API keys found — AI enrichment disabled. Add keys to .env to enable.');
        return null;
    }

    const names = activeProviders.map(p => p.name).join(', ');
    console.log(`  ✓ LLM providers available: ${names}`);

    /**
     * Call the LLM with automatic fallback across all configured providers.
     * @param {string} prompt
     * @returns {Promise<string>}
     */
    async function complete(prompt) {
        for (const provider of activeProviders) {
            const key = process.env[provider.keyEnv];
            try {
                let result;
                if (provider.style === 'openai') result = await callOpenAI(provider, prompt, key);
                else if (provider.style === 'google') result = await callGoogle(provider, prompt, key);
                else if (provider.style === 'cohere') result = await callCohere(provider, prompt, key);
                if (result) return result;
            } catch (err) {
                const isRateLimit = err.message.includes('429') || err.message.toLowerCase().includes('rate');
                console.warn(`  ⚠ ${provider.name} error (${isRateLimit ? 'rate limit' : err.message.slice(0, 60)}) — trying next provider`);
            }
        }
        throw new Error('All LLM providers failed or rate-limited');
    }

    return { complete, providerNames: names };
}
