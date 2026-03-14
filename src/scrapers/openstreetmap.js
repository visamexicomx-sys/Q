/**
 * OpenStreetMap / Overpass API Scraper
 *
 * Queries the free public Overpass API for real businesses in Quintana Roo:
 * real estate agencies, construction companies, architecture firms,
 * hotels, resorts, and residential developments.
 *
 * No API key required — 100% free and public.
 * Quintana Roo bounding box: SW(17.9, -88.1) → NE(21.6, -86.7)
 */

import { execSync } from 'child_process';

const BBOX = '17.9,-88.1,21.6,-86.7'; // Quintana Roo

// Overpass queries — broad set to capture all relevant business types
const QUERIES = [
    // Real estate agents & agencies
    `node["office"="estate_agent"](${BBOX});`,
    `way["office"="estate_agent"](${BBOX});`,
    `node["shop"="real_estate"](${BBOX});`,
    // Construction & architecture
    `node["office"="architect"](${BBOX});`,
    `way["office"="architect"](${BBOX});`,
    `node["craft"="construction"](${BBOX});`,
    `node["office"="company"]["name"~"construct|construc|builder|inmobili|realt|reales",i](${BBOX});`,
    // Hotels & hospitality (potential construction clients)
    `node["tourism"="hotel"](${BBOX});`,
    `way["tourism"="hotel"](${BBOX});`,
    `node["tourism"="resort"](${BBOX});`,
    `way["tourism"="resort"](${BBOX});`,
    // All companies (catch-all)
    `node["office"="company"](${BBOX});`,
    `way["office"="company"](${BBOX});`,
];

const LOCATIONS = [
    'Playa del Carmen', 'Tulum', 'Cancun', 'Bacalar',
    'Puerto Morelos', 'Akumal', 'Holbox', 'Cozumel', 'Mahahual',
];

/**
 * @param {{ locations: string[], maxLeadsPerSource: number }} opts
 * @returns {Promise<import('../utils/leads.js').Lead[]>}
 */
export async function scrapeOpenStreetMap({ locations, maxLeadsPerSource }) {
    const query = `[out:json][timeout:30];(${QUERIES.join('')});out center ${maxLeadsPerSource * 3};`;

    console.log('  [OSM] Querying Overpass API...');
    let raw;
    try {
        raw = execSync(
            `curl -s --max-time 35 "https://overpass-api.de/api/interpreter" --data-urlencode ${JSON.stringify('data=' + query)}`,
            { maxBuffer: 20 * 1024 * 1024 }
        );
    } catch (err) {
        // Try fallback mirror
        try {
            raw = execSync(
                `curl -s --max-time 35 "https://overpass.kumi.systems/api/interpreter" --data-urlencode ${JSON.stringify('data=' + query)}`,
                { maxBuffer: 20 * 1024 * 1024 }
            );
        } catch {
            throw new Error(`Overpass API failed: ${err.message}`);
        }
    }

    const data = JSON.parse(raw.toString());
    const elements = data.elements ?? [];
    console.log(`  [OSM] Got ${elements.length} raw elements`);

    const leads = [];
    const seen = new Set();

    for (const el of elements) {
        const tags = el.tags ?? {};
        const name = tags.name || tags['name:en'] || tags['name:es'] || '';
        if (!name || name.length < 3) continue;

        // Deduplicate by name
        const key = name.toLowerCase().replace(/\s+/g, '');
        if (seen.has(key)) continue;
        seen.add(key);

        // Get coordinates (nodes have lat/lon directly; ways have center)
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;

        const city = detectCity(tags, lat, lon, locations);
        const category = detectCategory(tags);
        const tagsList = inferTagsFromOSM(tags, category);

        leads.push({
            source: 'OpenStreetMap',
            businessName: name,
            contactName: tags['contact:person'] ?? tags.operator ?? '',
            email: tags.email ?? tags['contact:email'] ?? '',
            phone: normalizePhone(tags.phone ?? tags['contact:phone'] ?? tags['contact:mobile'] ?? ''),
            website: tags.website ?? tags['contact:website'] ?? tags.url ?? '',
            address: buildAddress(tags),
            city,
            state: 'Quintana Roo',
            country: 'Mexico',
            category,
            rating: '',
            reviewCount: 0,
            googleMapsUrl: lat && lon ? `https://maps.google.com/?q=${lat},${lon}` : '',
            description: tags.description ?? tags['description:es'] ?? tags.note ?? '',
            listingUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
            tags: tagsList,
        });
    }

    return leads.slice(0, maxLeadsPerSource);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectCity(tags, lat, lon, locations) {
    const addrText = `${tags['addr:city'] ?? ''} ${tags['addr:suburb'] ?? ''} ${tags.name ?? ''}`.toLowerCase();
    for (const loc of locations) {
        if (addrText.includes(loc.toLowerCase())) return loc;
    }
    if (!lat || !lon) return '';

    // Simple bounding box checks for major cities
    const cityBoxes = [
        { name: 'Cancun',           latMin: 21.0, latMax: 21.3, lonMin: -86.9, lonMax: -86.7 },
        { name: 'Playa del Carmen', latMin: 20.5, latMax: 20.8, lonMin: -87.2, lonMax: -87.0 },
        { name: 'Tulum',            latMin: 20.1, latMax: 20.3, lonMin: -87.5, lonMax: -87.4 },
        { name: 'Cozumel',          latMin: 20.3, latMax: 20.6, lonMin: -87.1, lonMax: -86.8 },
        { name: 'Puerto Morelos',   latMin: 20.8, latMax: 20.9, lonMin: -87.0, lonMax: -86.9 },
        { name: 'Holbox',           latMin: 21.5, latMax: 21.6, lonMin: -87.5, lonMax: -87.3 },
        { name: 'Bacalar',          latMin: 18.6, latMax: 18.8, lonMin: -88.4, lonMax: -88.1 },
        { name: 'Mahahual',         latMin: 18.6, latMax: 18.8, lonMin: -87.8, lonMax: -87.6 },
    ];
    const match = cityBoxes.find(b => lat >= b.latMin && lat <= b.latMax && lon >= b.lonMin && lon <= b.lonMax);
    return match?.name ?? 'Quintana Roo';
}

function detectCategory(tags) {
    const office  = tags.office ?? '';
    const shop    = tags.shop ?? '';
    const tourism = tags.tourism ?? '';
    const craft   = tags.craft ?? '';
    const name    = (tags.name ?? '').toLowerCase();

    if (office === 'estate_agent' || shop === 'real_estate') return 'Real Estate Agency';
    if (office === 'architect') return 'Architecture Firm';
    if (craft === 'construction') return 'Construction Company';
    if (tourism === 'hotel') return 'Hotel';
    if (tourism === 'resort') return 'Resort';
    if (name.includes('construct') || name.includes('construc')) return 'Construction Company';
    if (name.includes('inmobili') || name.includes('real estate') || name.includes('realt')) return 'Real Estate Agency';
    if (name.includes('arquitect') || name.includes('architect')) return 'Architecture Firm';
    if (office === 'company') return 'Company';
    return 'Business';
}

function inferTagsFromOSM(tags, category) {
    const t = [];
    if (category.includes('Real Estate')) t.push('real-estate');
    if (category.includes('Construction')) t.push('construction');
    if (category.includes('Architecture')) t.push('architecture');
    if (category.includes('Hotel') || category.includes('Resort')) t.push('hospitality');
    const n = (tags.name ?? '').toLowerCase();
    if (n.includes('condo') || n.includes('residen')) t.push('residential');
    if (n.includes('comerci') || n.includes('comercial')) t.push('commercial');
    if (n.includes('inversion') || n.includes('invest')) t.push('investor');
    t.push('openstreetmap');
    return t.join(', ');
}

function buildAddress(tags) {
    const parts = [
        tags['addr:street'],
        tags['addr:housenumber'],
        tags['addr:suburb'],
        tags['addr:city'],
        tags['addr:postcode'],
    ].filter(Boolean);
    return parts.join(', ');
}

function normalizePhone(phone) {
    return phone.replace(/[^\d+\s\-()]/g, '').trim();
}
