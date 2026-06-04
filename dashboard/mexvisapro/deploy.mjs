#!/usr/bin/env node
/**
 * MexVisa Pro — Hostinger file deployment script
 * Uploads SEO deliverables to mexvisapro.com via Hostinger REST API + TUS protocol
 *
 * Usage: HOSTINGER_API_TOKEN=xxx node deploy.mjs
 */

import { readFileSync, statSync } from 'fs';
import { resolve } from 'path';

const API_TOKEN = process.env.HOSTINGER_API_TOKEN;
const BASE_URL  = 'https://developers.hostinger.com';
const DOMAIN    = 'mexvisapro.com';

if (!API_TOKEN) {
  console.error('❌  HOSTINGER_API_TOKEN env var is not set.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// File manifest — local path → remote path relative to public_html
// ---------------------------------------------------------------------------
const FILES = [
  // Root files
  { local: 'robots.txt',     remote: 'robots.txt'     },
  { local: 'llms.txt',       remote: 'llms.txt'        },
  { local: 'pricing.md',     remote: 'pricing.md'      },
  { local: 'schema.json',    remote: 'schema.json'     },

  // Service pages (markdown — your CMS will render these)
  { local: 'pages/temporary-residency.md', remote: 'pages/temporary-residency.md' },
  { local: 'pages/permanent-residency.md', remote: 'pages/permanent-residency.md' },
  { local: 'pages/work-permit.md',         remote: 'pages/work-permit.md'         },
  { local: 'pages/citizenship.md',         remote: 'pages/citizenship.md'         },
  { local: 'pages/investor-visa.md',       remote: 'pages/investor-visa.md'       },
  { local: 'pages/family-visa.md',         remote: 'pages/family-visa.md'         },
  { local: 'pages/about-team.md',          remote: 'pages/about-team.md'          },

  // SEO reference docs
  { local: 'schema-blog-article.json',     remote: 'schema-blog-article.json'     },
  { local: 'meta-canonical-hreflang.html', remote: 'meta-canonical-hreflang.html' },
  { local: 'blog-faq-additions.md',        remote: 'blog-faq-additions.md'        },
  { local: 'SEO-REPORT.md',               remote: 'SEO-REPORT.md'               },
];

// ---------------------------------------------------------------------------
// Step 1: Get website info (username)
// ---------------------------------------------------------------------------
async function getWebsiteInfo() {
  const res = await fetch(`${BASE_URL}/api/hosting/v1/websites`, {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });
  if (!res.ok) throw new Error(`GET /websites failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const site = data.find(s => s.domain === DOMAIN) || data[0];
  if (!site) throw new Error(`Domain ${DOMAIN} not found in account`);
  console.log(`✅  Found website: ${site.domain} (username: ${site.username})`);
  return site.username;
}

// ---------------------------------------------------------------------------
// Step 2: Get upload credentials
// ---------------------------------------------------------------------------
async function getUploadCredentials(username) {
  const res = await fetch(`${BASE_URL}/api/hosting/v1/files/upload-urls`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, domain: DOMAIN }),
  });
  if (!res.ok) throw new Error(`POST /files/upload-urls failed: ${res.status} ${await res.text()}`);
  const creds = await res.json();
  console.log(`✅  Got upload credentials (uploadUrl: ${creds.uploadUrl})`);
  return creds;
}

// ---------------------------------------------------------------------------
// Step 3: Upload a single file via TUS-style PUT
// ---------------------------------------------------------------------------
async function uploadFile(uploadUrl, authToken, authRestToken, remotePath, localPath) {
  const fullPath = resolve(import.meta.dirname, localPath);
  const content  = readFileSync(fullPath);
  const size     = statSync(fullPath).size;
  const url      = `${uploadUrl}/${remotePath}?override=true`;

  const res = await fetch(url, {
    method:  'POST',
    headers: {
      'X-Auth':        authToken,
      'X-Auth-Rest':   authRestToken,
      'upload-length': String(size),
      'upload-offset': '0',
      'Content-Type':  'application/octet-stream',
    },
    body: content,
  });

  if (res.ok || res.status === 204) {
    console.log(`  ✅  ${remotePath}`);
  } else {
    const text = await res.text();
    console.error(`  ❌  ${remotePath} — ${res.status}: ${text}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\n🚀  MexVisa Pro — Hostinger Deployment\n`);

  const username                               = await getWebsiteInfo();
  const { uploadUrl, authToken, authRestToken } = await getUploadCredentials(username);

  console.log(`\n📤  Uploading ${FILES.length} files…\n`);

  for (const { local, remote } of FILES) {
    await uploadFile(uploadUrl, authToken, authRestToken, remote, local);
  }

  console.log(`\n✅  Deployment complete!\n`);
  console.log(`Next steps:`);
  console.log(`  1. robots.txt      → verify at https://mexvisapro.com/robots.txt`);
  console.log(`  2. llms.txt        → verify at https://mexvisapro.com/llms.txt`);
  console.log(`  3. pricing.md      → verify at https://mexvisapro.com/pricing.md`);
  console.log(`  4. Service pages   → import into your CMS from /pages/*.md`);
  console.log(`  5. schema.json     → paste <script> tag into homepage <head>`);
}

main().catch(err => {
  console.error('\n❌  Fatal error:', err.message);
  process.exit(1);
});
