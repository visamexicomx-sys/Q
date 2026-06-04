#!/usr/bin/env node
/**
 * MexVisa Pro — Full site deployment to Hostinger
 * Uploads the complete static site (index, service pages, CSS, sitemap, .htaccess)
 * plus the SEO files (robots.txt, llms.txt, pricing.md, schema.json)
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

if (!API_TOKEN) { console.error('❌  HOSTINGER_API_TOKEN not set'); process.exit(1); }

// All files: [localPath, remotePath]
const FILES = [
  // Site files
  ['site/index.html',                          'index.html'],
  ['site/css/style.css',                       'css/style.css'],
  ['site/.htaccess',                           '.htaccess'],
  ['site/sitemap.xml',                         'sitemap.xml'],
  ['site/temporary-residency/index.html',      'temporary-residency/index.html'],
  ['site/permanent-residency/index.html',      'permanent-residency/index.html'],
  ['site/work-permit/index.html',              'work-permit/index.html'],
  ['site/citizenship/index.html',              'citizenship/index.html'],
  ['site/investor-visa/index.html',            'investor-visa/index.html'],
  ['site/family-visa/index.html',              'family-visa/index.html'],
  ['site/about/index.html',                    'about/index.html'],
  ['site/contact/index.html',                  'contact/index.html'],
  // SEO files
  ['robots.txt',                               'robots.txt'],
  ['llms.txt',                                 'llms.txt'],
  ['pricing.md',                               'pricing.md'],
  ['schema.json',                              'schema.json'],
  ['schema-blog-article.json',                 'schema-blog-article.json'],
];

function normalizePath(p) { return p.replace(/\\/g, '/').replace(/^\/+/, ''); }

async function getUploadCredentials() {
  const res = await axios.post(
    `${BASE_URL}/api/hosting/v1/files/upload-urls`,
    { username: USERNAME, domain: DOMAIN },
    { headers: { Authorization: `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' }, timeout: 60000 }
  );
  return res.data;
}

async function uploadFile(uploadUrl, authToken, authRestToken, localPath, remotePath) {
  const fullPath   = path.resolve(__dirname, localPath);
  const stats      = fs.statSync(fullPath);
  const fileStream = fs.createReadStream(fullPath);
  const targetUrl  = `${uploadUrl.replace(/\/$/, '')}/${normalizePath(remotePath)}?override=true`;
  const headers    = { 'X-Auth': authToken, 'X-Auth-Rest': authRestToken, 'upload-length': stats.size.toString(), 'upload-offset': '0' };

  await axios.post(targetUrl, '', { headers, timeout: 60000, validateStatus: s => s === 201 });

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(fileStream, {
      uploadUrl, retryDelays: [1000, 2000, 4000, 8000],
      uploadDataDuringCreation: false, parallelUploads: 1, chunkSize: 10 * 1024 * 1024,
      headers, removeFingerprintOnSuccess: true, uploadSize: stats.size,
      metadata: { filename: path.basename(remotePath) },
      onError: err => reject(new Error(`TUS: ${err.message}`)),
      onSuccess: () => resolve(),
    });
    // Override uploadUrl to point to the file-specific URL
    upload.options.uploadUrl = targetUrl;
    upload.start();
  });
}

async function main() {
  console.log('\n🚀  MexVisa Pro — Full Site Deployment\n');
  const { url: uploadUrl, auth_key: authToken, rest_auth_key: authRestToken } = await getUploadCredentials();
  console.log(`✅  Upload session: ${uploadUrl}\n`);

  let ok = 0, fail = 0;
  for (const [local, remote] of FILES) {
    process.stdout.write(`  📤  ${remote.padEnd(45)} `);
    try {
      await uploadFile(uploadUrl, authToken, authRestToken, local, remote);
      console.log('✅');
      ok++;
    } catch (err) {
      console.log(`❌  ${err.message}`);
      fail++;
    }
  }

  console.log(`\n${'─'.repeat(55)}`);
  console.log(`  ✅  ${ok} uploaded   ❌  ${fail} failed`);
  console.log(`${'─'.repeat(55)}\n`);
  console.log('Live site: https://mexvisapro.com');
  console.log('Verify:    https://mexvisapro.com/robots.txt');
  console.log('           https://mexvisapro.com/sitemap.xml');
}

main().catch(err => { console.error('\n❌  Fatal:', err.message); process.exit(1); });
