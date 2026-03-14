#!/usr/bin/env node
/**
 * test-free-apis.js
 * Tests all configured free LLM APIs and reports which ones work.
 * Run: node test-free-apis.js
 */

import 'dotenv/config';

const PROMPT = 'Reply with just the word: WORKING';

const providers = [
  {
    name: 'Groq',
    key: process.env.GROQ_API_KEY,
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.1-8b-instant',
    style: 'openai',
  },
  {
    name: 'OpenRouter',
    key: process.env.OPENROUTER_API_KEY,
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    style: 'openai',
    extraHeaders: { 'HTTP-Referer': 'https://recrea.mx', 'X-Title': 'Recrea Test' },
  },
  {
    name: 'Cerebras',
    key: process.env.CEREBRAS_API_KEY,
    url: 'https://api.cerebras.ai/v1/chat/completions',
    model: 'llama3.1-8b',
    style: 'openai',
  },
  {
    name: 'Mistral',
    key: process.env.MISTRAL_API_KEY,
    url: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-small-latest',
    style: 'openai',
  },
  {
    name: 'NVIDIA NIM',
    key: process.env.NVIDIA_API_KEY,
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    model: 'meta/llama-3.1-8b-instruct',
    style: 'openai',
  },
  {
    name: 'Google AI Studio',
    key: process.env.GOOGLE_API_KEY,
    url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`,
    model: 'gemini-2.0-flash',
    style: 'google',
  },
  {
    name: 'Cohere',
    key: process.env.COHERE_API_KEY,
    url: 'https://api.cohere.com/v2/chat',
    model: 'command-r-plus-08-2024',
    style: 'cohere',
  },
  {
    name: 'SambaNova',
    key: process.env.SAMBANOVA_API_KEY,
    url: 'https://api.sambanova.ai/v1/chat/completions',
    model: 'Meta-Llama-3.1-8B-Instruct',
    style: 'openai',
  },
  {
    name: 'Fireworks',
    key: process.env.FIREWORKS_API_KEY,
    url: 'https://api.fireworks.ai/inference/v1/chat/completions',
    model: 'accounts/fireworks/models/llama-v3p1-8b-instruct',
    style: 'openai',
  },
  {
    name: 'Hyperbolic',
    key: process.env.HYPERBOLIC_API_KEY,
    url: 'https://api.hyperbolic.xyz/v1/chat/completions',
    model: 'meta-llama/Llama-3.2-3B-Instruct',
    style: 'openai',
  },
  {
    name: 'HuggingFace',
    key: process.env.HUGGINGFACE_API_KEY,
    url: 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3/v1/chat/completions',
    model: 'mistralai/Mistral-7B-Instruct-v0.3',
    style: 'openai',
  },
];

async function testOpenAI(provider) {
  const res = await fetch(provider.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.key}`,
      ...provider.extraHeaders,
    },
    body: JSON.stringify({
      model: provider.model,
      messages: [{ role: 'user', content: PROMPT }],
      max_tokens: 10,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data));
  return data.choices?.[0]?.message?.content?.trim();
}

async function testGoogle(provider) {
  const res = await fetch(provider.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: PROMPT }] }] }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data));
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
}

async function testCohere(provider) {
  const res = await fetch(provider.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.key}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages: [{ role: 'user', content: PROMPT }],
    }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || JSON.stringify(data));
  return data.message?.content?.[0]?.text?.trim();
}

async function testProvider(provider) {
  if (!provider.key) return { status: 'SKIP', reason: 'No API key in .env' };
  try {
    let reply;
    if (provider.style === 'openai') reply = await testOpenAI(provider);
    else if (provider.style === 'google') reply = await testGoogle(provider);
    else if (provider.style === 'cohere') reply = await testCohere(provider);
    return { status: 'OK', reply };
  } catch (err) {
    return { status: 'FAIL', reason: err.message.slice(0, 120) };
  }
}

const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';

console.log(`\n${BOLD}Testing Free LLM APIs...${RESET}\n`);
console.log('Provider'.padEnd(20), 'Status'.padEnd(8), 'Details');
console.log('─'.repeat(70));

let ok = 0, fail = 0, skip = 0;

for (const provider of providers) {
  process.stdout.write(`${provider.name.padEnd(20)} `);
  const result = await testProvider(provider);

  if (result.status === 'OK') {
    ok++;
    console.log(`${GREEN}OK${RESET}     `, result.reply);
  } else if (result.status === 'SKIP') {
    skip++;
    console.log(`${YELLOW}SKIP${RESET}   `, result.reason);
  } else {
    fail++;
    console.log(`${RED}FAIL${RESET}   `, result.reason);
  }
}

console.log('\n' + '─'.repeat(70));
console.log(`${BOLD}Results:${RESET} ${GREEN}${ok} working${RESET} · ${RED}${fail} failed${RESET} · ${YELLOW}${skip} skipped (no key)${RESET}`);
console.log(`\nGet free keys at: ${BOLD}free-apis.md${RESET}\n`);
