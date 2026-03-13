/**
 * Recrea Construction Riviera Maya - Lead Scraper
 *
 * Scrapes Google Maps, real estate portals, and business directories to
 * generate construction & real-estate leads across the Riviera Maya corridor.
 *
 * Sources:
 *  - Google Maps (via Apify Google Maps Scraper actor)
 *  - Inmuebles24.com
 *  - Lamudi.com.mx
 *  - Vivanuncios.com.mx
 *  - Propiedades.com
 */

import { Actor } from 'apify';
import { PlaywrightCrawler, RequestQueue } from 'crawlee';
import { writeLeadsToCsv, writeLeadsToJson } from './utils/exporter.js';
import { scrapeGoogleMaps } from './scrapers/googleMaps.js';
import { scrapeInmuebles24 } from './scrapers/inmuebles24.js';
import { scrapeLamudi } from './scrapers/lamudi.js';
import { scrapeVivanuncios } from './scrapers/vivanuncios.js';
import { scrapePropiedades } from './scrapers/propiedades.js';
import { deduplicateLeads, enrichLead } from './utils/leads.js';

await Actor.init();

const input = await Actor.getInput() ?? {};

const {
    searchQueries = [
        'desarrolladores inmobiliarios Riviera Maya',
        'constructoras Playa del Carmen',
        'bienes raices Tulum construccion',
        'real estate developer Cancun',
        'arquitectos Playa del Carmen',
        'condominios en construccion Tulum',
        'fraccionamientos Riviera Maya',
        'hoteles boutique construccion Riviera Maya',
        'desarrollo inmobiliario Puerto Morelos',
        'inversiones inmobiliarias Bacalar',
    ],
    locations = [
        'Playa del Carmen',
        'Tulum',
        'Cancun',
        'Bacalar',
        'Puerto Morelos',
        'Akumal',
        'Holbox',
        'Cozumel',
        'Mahahual',
    ],
    maxLeadsPerSource = 50,
    sources = ['google_maps', 'inmuebles24', 'lamudi', 'vivanuncios', 'propiedades_com'],
    exportFormat = 'csv',
} = input;

console.log('=== Recrea Construction Riviera Maya — Lead Scraper ===');
console.log(`Sources: ${sources.join(', ')}`);
console.log(`Locations: ${locations.join(', ')}`);
console.log(`Max leads per source: ${maxLeadsPerSource}`);

const allLeads = [];
const dataset = await Actor.openDataset('recrea-leads');

// ─── Google Maps ────────────────────────────────────────────────────────────
if (sources.includes('google_maps')) {
    console.log('\n[1/5] Scraping Google Maps...');
    try {
        const mapsLeads = await scrapeGoogleMaps({ searchQueries, locations, maxLeadsPerSource });
        console.log(`  → Found ${mapsLeads.length} leads from Google Maps`);
        allLeads.push(...mapsLeads);
    } catch (err) {
        console.error('  ✗ Google Maps scrape error:', err.message);
    }
}

// ─── Inmuebles24 ─────────────────────────────────────────────────────────────
if (sources.includes('inmuebles24')) {
    console.log('\n[2/5] Scraping Inmuebles24...');
    try {
        const i24Leads = await scrapeInmuebles24({ locations, maxLeadsPerSource });
        console.log(`  → Found ${i24Leads.length} leads from Inmuebles24`);
        allLeads.push(...i24Leads);
    } catch (err) {
        console.error('  ✗ Inmuebles24 scrape error:', err.message);
    }
}

// ─── Lamudi ──────────────────────────────────────────────────────────────────
if (sources.includes('lamudi')) {
    console.log('\n[3/5] Scraping Lamudi...');
    try {
        const lamudiLeads = await scrapeLamudi({ locations, maxLeadsPerSource });
        console.log(`  → Found ${lamudiLeads.length} leads from Lamudi`);
        allLeads.push(...lamudiLeads);
    } catch (err) {
        console.error('  ✗ Lamudi scrape error:', err.message);
    }
}

// ─── Vivanuncios ─────────────────────────────────────────────────────────────
if (sources.includes('vivanuncios')) {
    console.log('\n[4/5] Scraping Vivanuncios...');
    try {
        const vivaLeads = await scrapeVivanuncios({ locations, maxLeadsPerSource });
        console.log(`  → Found ${vivaLeads.length} leads from Vivanuncios`);
        allLeads.push(...vivaLeads);
    } catch (err) {
        console.error('  ✗ Vivanuncios scrape error:', err.message);
    }
}

// ─── Propiedades.com ──────────────────────────────────────────────────────────
if (sources.includes('propiedades_com')) {
    console.log('\n[5/5] Scraping Propiedades.com...');
    try {
        const propLeads = await scrapePropiedades({ locations, maxLeadsPerSource });
        console.log(`  → Found ${propLeads.length} leads from Propiedades.com`);
        allLeads.push(...propLeads);
    } catch (err) {
        console.error('  ✗ Propiedades.com scrape error:', err.message);
    }
}

// ─── Deduplicate & Enrich ─────────────────────────────────────────────────────
console.log('\n[Post-processing] Deduplicating and enriching leads...');
const uniqueLeads = deduplicateLeads(allLeads);
const enrichedLeads = uniqueLeads.map(enrichLead);
console.log(`  Total unique leads: ${enrichedLeads.length} (from ${allLeads.length} raw)`);

// ─── Save to Apify Dataset ────────────────────────────────────────────────────
await dataset.pushData(enrichedLeads);
console.log('  ✓ Leads saved to Apify dataset');

// ─── Export Files ─────────────────────────────────────────────────────────────
const kvStore = await Actor.openKeyValueStore();

if (exportFormat === 'csv' || exportFormat === 'both') {
    const csvContent = await writeLeadsToCsv(enrichedLeads);
    await kvStore.setValue('leads.csv', csvContent, { contentType: 'text/csv' });
    console.log('  ✓ leads.csv saved to Key-Value Store');
}

if (exportFormat === 'json' || exportFormat === 'both') {
    const jsonContent = writeLeadsToJson(enrichedLeads);
    await kvStore.setValue('leads.json', jsonContent, { contentType: 'application/json' });
    console.log('  ✓ leads.json saved to Key-Value Store');
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════');
console.log('  SCRAPE COMPLETE — RECREA CONSTRUCTION');
console.log('═══════════════════════════════════════════');
console.log(`  Total leads collected : ${enrichedLeads.length}`);
console.log(`  Sources scraped       : ${sources.length}`);
console.log(`  Locations covered     : ${locations.join(', ')}`);
console.log('═══════════════════════════════════════════\n');

await Actor.exit();
