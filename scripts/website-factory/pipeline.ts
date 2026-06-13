import type { Business, DeployedSite, PipelineState } from './types.ts';
import { findBusinessesWithoutWebsites } from './find-businesses.ts';
import { generateSite } from './generate-site.ts';
import { deployToVercel } from './deploy-vercel.ts';
import { sendSms } from './send-sms.ts';

const CONCURRENCY = 3; // parallel deploys at a time

export async function runPipeline(config: {
  location: string;
  category: string;
  limit: number;
  dryRun?: boolean;
}): Promise<PipelineState> {
  const state: PipelineState = {
    working: 0,
    completed: [],
    failed: [],
    startedAt: new Date(),
  };

  log(`\n🏭 website-factory pipeline starting`);
  log(`   location : ${config.location}`);
  log(`   category : ${config.category}`);
  log(`   limit    : ${config.limit}`);
  log(`   dry-run  : ${config.dryRun ?? false}\n`);

  log('🔍 Finding businesses without websites...');
  let businesses: Business[];

  try {
    businesses = await findBusinessesWithoutWebsites(
      config.location,
      config.category,
      config.limit
    );
  } catch (err) {
    log(`❌ Discovery failed: ${err}`);
    return state;
  }

  log(`✅ Found ${businesses.length} businesses to build for\n`);

  // Process in batches of CONCURRENCY
  for (let i = 0; i < businesses.length; i += CONCURRENCY) {
    const batch = businesses.slice(i, i + CONCURRENCY);
    state.working = batch.length;

    renderStatus(state, businesses.length);

    await Promise.all(
      batch.map((business) => processBusiness(business, state, config.dryRun ?? false))
    );

    state.working = 0;
  }

  renderFinalStatus(state);
  return state;
}

async function processBusiness(
  business: Business,
  state: PipelineState,
  dryRun: boolean
): Promise<void> {
  const tag = `[${business.name}]`;

  try {
    log(`${tag} generating site...`);
    const site = await generateSite(business);

    let url: string;

    if (dryRun) {
      url = `https://${business.slug}.vercel.app`; // simulated
      log(`${tag} dry-run — would deploy to ${url}`);
    } else {
      log(`${tag} deploying to Vercel...`);
      url = await deployToVercel(site);
      log(`${tag} site live → ${url}`);
    }

    let smsSent = false;
    if (!dryRun) {
      smsSent = await sendSms(business, url);
      if (smsSent) log(`${tag} SMS sent to ${business.phone}`);
    }

    const deployed: DeployedSite = {
      business,
      url,
      deployedAt: new Date(),
      smsSent,
    };

    state.completed.push(deployed);
    log(`${tag} ✓ pipeline complete · site: ${url}`);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    state.failed.push({ name: business.name, error });
    log(`${tag} ✗ failed: ${error}`);
  }
}

function renderStatus(state: PipelineState, total: number): void {
  const elapsed = Math.round((Date.now() - state.startedAt.getTime()) / 1000);
  process.stdout.write(
    `\r  ⏳ ${state.working} working · ${state.completed.length} completed · ${state.failed.length} failed · ${elapsed}s elapsed`
  );
}

function renderFinalStatus(state: PipelineState): void {
  const elapsed = Math.round((Date.now() - state.startedAt.getTime()) / 1000);
  const smsSent = state.completed.filter((d) => d.smsSent).length;

  log(`\n\n${'─'.repeat(60)}`);
  log(`  🏁 Pipeline complete`);
  log(`  ✅ ${state.completed.length} sites deployed`);
  log(`  📱 ${smsSent} SMS sent to business owners`);
  log(`  ❌ ${state.failed.length} failures`);
  log(`  ⏱️  ${elapsed}s total`);
  log(`${'─'.repeat(60)}\n`);

  if (state.completed.length > 0) {
    log('Deployed sites:');
    for (const d of state.completed) {
      log(`  ${d.business.name.padEnd(40)} ${d.url}${d.smsSent ? ' 📱' : ''}`);
    }
    log('');
  }

  if (state.failed.length > 0) {
    log('Failures:');
    for (const f of state.failed) {
      log(`  ✗ ${f.name}: ${f.error}`);
    }
  }
}

function log(msg: string): void {
  console.log(msg);
}
