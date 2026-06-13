#!/usr/bin/env node
/**
 * website-factory — autonomous website builder for businesses without a web presence
 *
 * Usage:
 *   npx tsx scripts/website-factory/index.ts --location "Manchester, UK" --category plumbing --limit 50
 *   npx tsx scripts/website-factory/index.ts --location "London" --category roofing --dry-run
 *
 * Required env vars:
 *   GOOGLE_PLACES_API_KEY  — Google Places API key
 *   ANTHROPIC_API_KEY      — Anthropic API key (for site generation)
 *   VERCEL_TOKEN           — Vercel personal access token
 *
 * Optional (enables SMS outreach):
 *   TWILIO_ACCOUNT_SID     — Twilio account SID
 *   TWILIO_AUTH_TOKEN      — Twilio auth token
 *   TWILIO_FROM_NUMBER     — Your Twilio phone number (e.g. +14155551234)
 */

import { runPipeline } from './pipeline.ts';

function parseArgs(): {
  location: string;
  category: string;
  limit: number;
  dryRun: boolean;
} {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const location = get('--location') ?? get('-l') ?? 'London, UK';
  const category = get('--category') ?? get('-c') ?? 'plumbing';
  const limit = parseInt(get('--limit') ?? get('-n') ?? '20', 10);
  const dryRun = args.includes('--dry-run') || args.includes('-d');

  return { location, category, limit, dryRun };
}

function checkRequiredEnv(): void {
  const required = ['GOOGLE_PLACES_API_KEY', 'ANTHROPIC_API_KEY', 'VERCEL_TOKEN'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(
      `\n❌ Missing required environment variables:\n${missing.map((k) => `   ${k}`).join('\n')}\n`
    );
    console.error('See skills/website-factory/SKILL.md for setup instructions.\n');
    process.exit(1);
  }
}

const config = parseArgs();
checkRequiredEnv();
runPipeline(config).catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
