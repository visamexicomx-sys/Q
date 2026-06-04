#!/usr/bin/env node
/**
 * MexVisa Pro — Hostinger file deployment
 * Uses TUS protocol exactly as hostinger-api-mcp does internally.
 *
 * Usage: HOSTINGER_API_TOKEN=xxx node deploy.mjs
 */

import * as tus from '/opt/node22/lib/node_modules/hostinger-api-mcp/node_modules/tus-js-client/lib.esm/node/index.js';
import axios from '/opt/node22/lib/node_modules/hostinger-api-mcp/node_modules/axios/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_TOKEN = process.env.HOSTINGER_API_TOKEN;
const BASE_URL  = 'https://developers.hostinger.com';
const DOMAIN    = 'mexvisapro.com';
const USERNAME  = 'u788801076';

if (!API_TOKEN) {
  console.error('❌  HOSTINGER_API_TOKEN env var is not set.');
  process.exit(1);
}

// Files to deploy: local path (relative to this script) → remote path in public_html
const FILES = [
  { local: 'robots.txt',                   remote: 'robots.txt'                   },
  { local: 'llms.txt',                     remote: 'llms.txt'                     },
  { local: 'pricing.md',                   remote: 'pricing.md'                   },
  { local: 'schema.json',                  remote: 'schema.json'                  },
  { local: 'schema-blog-article.json',     remote: 'schema-blog-article.json'     },
  { local: 'meta-canonical-hreflang.html', remote: 'meta-canonical-hreflang.html' },
  { local: 'blog-faq-additions.md',        remote: 'blog-faq-additions.md'        },
  { local: 'SEO-REPORT.md',               remote: 'SEO-REPORT.md'               },
  { local: 'pages/temporary-residency.md', remote: 'pages/temporary-residency.md' },
  { local: 'pages/permanent-residency.md', remote: 'pages/permanent-residency.md' },
  { local: 'pages/work-permit.md',         remote: 'pages/work-permit.md'         },
  { local: 'pages/citizenship.md',         remote: 'pages/citizenship.md'         },
  { local: 'pages/investor-visa.md',       remote: 'pages/investor-visa.md'       },
  { local: 'pages/family-visa.md',         remote: 'pages/family-visa.md'         },
  { local: 'pages/about-team.md',          remote: 'pages/about-team.md'          },
];

function normalizePath(p) {
  return p.replace(/\\/g, '/').replace(/^\/+/, '');
}

async function getUploadCredentials() {
  const res = await axios.post(
    `${BASE_URL}/api/hosting/v1/files/upload-urls`,
    { username: USERNAME, domain: DOMAIN },
    {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  );
  // Response: { url, auth_key, rest_auth_key }
  return res.data;
}

async function uploadFile(uploadUrl, authToken, authRestToken, localPath, remotePath) {
  const fullPath  = path.resolve(__dirname, localPath);
  const stats     = fs.statSync(fullPath);
  const fileStream = fs.createReadStream(fullPath);

  const cleanUploadUrl   = uploadUrl.replace(/\/$/, '');
  const normalizedRemote = normalizePath(remotePath);
  const targetUrl        = `${cleanUploadUrl}/${normalizedRemote}?override=true`;

  const headers = {
    'X-Auth':        authToken,
    'X-Auth-Rest':   authRestToken,
    'upload-length': stats.size.toString(),
    'upload-offset': '0',
  };

  // Step 1: Create TUS slot
  await axios.post(targetUrl, '', {
    headers,
    timeout: 60000,
    validateStatus: s => s === 201,
  });

  // Step 2: TUS upload
  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(fileStream, {
      uploadUrl:               targetUrl,
      retryDelays:             [1000, 2000, 4000, 8000],
      uploadDataDuringCreation: false,
      parallelUploads:         1,
      chunkSize:               10 * 1024 * 1024,
      headers,
      removeFingerprintOnSuccess: true,
      uploadSize:              stats.size,
      metadata:                { filename: path.basename(remotePath) },
      onError:   err => reject(new Error(`TUS error: ${err.message}`)),
      onSuccess: ()  => resolve(),
    });
    upload.start();
  });
}

async function main() {
  console.log('\n🚀  MexVisa Pro — Deploying to Hostinger\n');

  console.log('🔑  Getting upload credentials for mexvisapro.com…');
  const { url: uploadUrl, auth_key: authToken, rest_auth_key: authRestToken } =
    await getUploadCredentials();
  console.log(`✅  Upload URL: ${uploadUrl}\n`);

  let ok = 0, fail = 0;
  for (const { local, remote } of FILES) {
    process.stdout.write(`  📤  ${remote} … `);
    try {
      await uploadFile(uploadUrl, authToken, authRestToken, local, remote);
      console.log('✅');
      ok++;
    } catch (err) {
      console.log(`❌  ${err.message}`);
      fail++;
    }
  }

  console.log(`\n─────────────────────────────────────`);
  console.log(`✅  ${ok} uploaded   ❌  ${fail} failed`);
  console.log(`─────────────────────────────────────`);

  if (ok > 0) {
    console.log('\nVerify live files:');
    console.log('  https://mexvisapro.com/robots.txt');
    console.log('  https://mexvisapro.com/llms.txt');
    console.log('  https://mexvisapro.com/pricing.md');
  }
}

main().catch(err => {
  console.error('\n❌  Fatal:', err.message);
  process.exit(1);
});
