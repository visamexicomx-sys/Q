/**
 * run-local.js — запуск скраперов без Apify.
 *
 * Scrapes OpenStreetMap, Inmuebles24, Lamudi, Vivanuncios, Propiedades.com directly,
 * enriches with AI pitches via Groq (or other free providers),
 * and saves results to ./leads/leads.csv and ./leads/leads.json
 *
 * Usage:
 *   node run-local.js
 *   node run-local.js --sources=openstreetmap
 *   node run-local.js --max=30 --locations="Tulum,Cancun"
 */

import 'dotenv/config';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { scrapeOpenStreetMap } from './src/scrapers/openstreetmap.js';
import { scrapeInmuebles24 }  from './src/scrapers/inmuebles24.js';
import { scrapeLamudi }       from './src/scrapers/lamudi.js';
import { scrapeVivanuncios }  from './src/scrapers/vivanuncios.js';
import { scrapePropiedades }  from './src/scrapers/propiedades.js';
import { deduplicateLeads, enrichLeadWithAI } from './src/utils/leads.js';
import { writeLeadsToCsv, writeLeadsToJson }  from './src/utils/exporter.js';
import { createLLMClient }    from './src/utils/llm.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Parse CLI args ────────────────────────────────────────────────────────────
const args = Object.fromEntries(
    process.argv.slice(2)
        .filter(a => a.startsWith('--'))
        .map(a => a.replace('--', '').split('='))
);

const MAX_PER_SOURCE = parseInt(args.max ?? '50', 10);
const LOCATIONS = (args.locations ?? 'Playa del Carmen,Tulum,Cancun,Bacalar,Puerto Morelos,Akumal,Holbox,Cozumel,Mahahual')
    .split(',').map(l => l.trim());
const SOURCES = (args.sources ?? 'openstreetmap,inmuebles24,lamudi,vivanuncios,propiedades_com')
    .split(',').map(s => s.trim());

const SCRAPERS = {
    openstreetmap:  { label: 'OpenStreetMap', fn: scrapeOpenStreetMap },
    inmuebles24:    { label: 'Inmuebles24',    fn: scrapeInmuebles24 },
    lamudi:         { label: 'Lamudi',         fn: scrapeLamudi },
    vivanuncios:    { label: 'Vivanuncios',    fn: scrapeVivanuncios },
    propiedades_com:{ label: 'Propiedades.com',fn: scrapePropiedades },
};

// ─── Main ──────────────────────────────────────────────────────────────────────
console.log('\n╔═══════════════════════════════════════════════════╗');
console.log('║  RECREA CONSTRUCTION — Local Lead Scraper         ║');
console.log('╚═══════════════════════════════════════════════════╝');
console.log(`  Sources   : ${SOURCES.join(', ')}`);
console.log(`  Locations : ${LOCATIONS.join(', ')}`);
console.log(`  Max/source: ${MAX_PER_SOURCE}`);
console.log('');

const llmClient = createLLMClient();

const allLeads = [];
let srcNum = 0;

for (const source of SOURCES) {
    const scraper = SCRAPERS[source];
    if (!scraper) {
        console.warn(`  ⚠ Unknown source "${source}" — skipped`);
        continue;
    }
    srcNum++;
    console.log(`\n[${srcNum}/${SOURCES.length}] Scraping ${scraper.label}...`);
    try {
        const leads = await scraper.fn({ locations: LOCATIONS, maxLeadsPerSource: MAX_PER_SOURCE });
        console.log(`  → ${leads.length} raw leads from ${scraper.label}`);
        allLeads.push(...leads);
    } catch (err) {
        console.error(`  ✗ ${scraper.label} error: ${err.message}`);
    }
}

// ─── Deduplicate ───────────────────────────────────────────────────────────────
console.log(`\n[Post-processing] Deduplicating ${allLeads.length} raw leads...`);
const uniqueLeads = deduplicateLeads(allLeads);
console.log(`  → ${uniqueLeads.length} unique leads`);

// ─── Enrich with AI ────────────────────────────────────────────────────────────
console.log(`\n[AI Enrichment] Generating personalized pitches...`);
const enrichedLeads = [];
for (let i = 0; i < uniqueLeads.length; i++) {
    const lead = uniqueLeads[i];
    process.stdout.write(`  ${i + 1}/${uniqueLeads.length} ${lead.businessName || lead.contactName || 'unknown'}...`);
    const enriched = await enrichLeadWithAI(lead, llmClient);
    enrichedLeads.push(enriched);
    process.stdout.write(enriched.aiEnriched ? ' ✓ AI\n' : ' (template)\n');
}

const aiCount = enrichedLeads.filter(l => l.aiEnriched).length;
console.log(`\n  AI pitches: ${aiCount}/${enrichedLeads.length}`);

// ─── Save Results ──────────────────────────────────────────────────────────────
const outDir = path.join(__dirname, 'leads');
await mkdir(outDir, { recursive: true });

const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
const csvPath  = path.join(outDir, `leads-${ts}.csv`);
const jsonPath = path.join(outDir, `leads-${ts}.json`);
const csvLatest  = path.join(outDir, 'leads-latest.csv');
const jsonLatest = path.join(outDir, 'leads-latest.json');

const csvContent  = await writeLeadsToCsv(enrichedLeads);
const jsonContent = writeLeadsToJson(enrichedLeads);

await Promise.all([
    writeFile(csvPath,   csvContent,  'utf8'),
    writeFile(jsonPath,  jsonContent, 'utf8'),
    writeFile(csvLatest, csvContent,  'utf8'),
    writeFile(jsonLatest,jsonContent, 'utf8'),
]);

// ─── Summary ───────────────────────────────────────────────────────────────────
console.log('\n╔═══════════════════════════════════════════════════╗');
console.log('║  ГОТОВО — РЕЗУЛЬТАТЫ                              ║');
console.log('╚═══════════════════════════════════════════════════╝');
console.log(`  Total leads  : ${enrichedLeads.length}`);
console.log(`  AI-enriched  : ${aiCount} (${llmClient ? llmClient.providerNames : 'disabled'})`);
console.log(`  High score   : ${enrichedLeads.filter(l => l.leadScore === 'High').length}`);
console.log(`  Medium score : ${enrichedLeads.filter(l => l.leadScore === 'Medium').length}`);
console.log(`  Brokers      : ${enrichedLeads.filter(l => l.leadType === 'broker').length}`);
console.log(`  Investors    : ${enrichedLeads.filter(l => l.leadType === 'investor').length}`);
console.log(`  Work opps    : ${enrichedLeads.filter(l => l.leadType === 'work').length}`);
console.log('');
console.log(`  CSV  → ${csvLatest}`);
console.log(`  JSON → ${jsonLatest}`);
console.log('');

// Top 5 High-priority leads
const top5 = enrichedLeads.filter(l => l.leadScore === 'High').slice(0, 5);
if (top5.length > 0) {
    console.log('  ─── Top 5 High-Priority Leads ────────────────────');
    top5.forEach((l, i) => {
        console.log(`  ${i + 1}. ${l.businessName || l.contactName} (${l.city})`);
        console.log(`     ${l.leadType} | ${l.phone || l.email || l.website || 'no contact'}`);
    });
    console.log('');
}
