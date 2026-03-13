/**
 * Google Maps Scraper
 *
 * Calls the Apify Google Maps Scraper sub-actor constrained to a
 * Quintana Roo bounding box so it never scans all of Mexico.
 *
 * Bounding box for Quintana Roo / Riviera Maya:
 *   SW: 17.9°N, -88.0°W   NE: 21.6°N, -86.7°W
 */

import { Actor } from 'apify';

// Quintana Roo bounding box — keeps the sub-actor from scanning all Mexico
const QR_GEOLOCATION = {
    type: 'Feature',
    geometry: {
        type: 'Polygon',
        coordinates: [[
            [-88.0, 21.6],
            [-86.7, 21.6],
            [-86.7, 17.9],
            [-88.0, 17.9],
            [-88.0, 21.6],
        ]],
    },
};

/**
 * @param {{ searchQueries: string[], locations: string[], maxLeadsPerSource: number }} opts
 * @returns {Promise<import('../utils/leads.js').Lead[]>}
 */
export async function scrapeGoogleMaps({ searchQueries, locations, maxLeadsPerSource }) {
    const leads = [];

    // Cap at 5 queries and 10 places each to finish within the free plan's 5-min timeout
    const queries = searchQueries.slice(0, 5);
    const placesPerQuery = Math.min(10, Math.ceil(maxLeadsPerSource / queries.length));

    let runResult;
    try {
        const run = await Actor.call('nwua9Gu5YrADL7ZDj', {
            searchStringsArray: queries,
            maxCrawledPlacesPerSearch: placesPerQuery,
            language: 'es',
            countryCode: 'mx',
            customGeolocation: QR_GEOLOCATION,  // ← LOCKS search to Quintana Roo
            maxConcurrency: 5,                  // ← faster parallel crawl
            includeWebResults: false,
            exportPlaceUrls: false,
        }, {
            memory: 1024,    // 1GB for sub-actor
            waitSecs: 210,   // wait up to 3.5 min then collect whatever was found
        });
        runResult = await Actor.openDataset(run.defaultDatasetId);
    } catch (err) {
        console.warn('  [Google Maps] Sub-actor error, trying to collect partial results:', err.message);
        // Try to get partial results from any dataset that was created
        try {
            const runs = await Actor.newClient().runs().list({ limit: 3 });
            const gmRun = runs.items?.find(r => r.actId === 'nwua9Gu5YrADL7ZDj');
            if (gmRun?.defaultDatasetId) {
                runResult = await Actor.openDataset(gmRun.defaultDatasetId);
            }
        } catch (_) {}
        if (!runResult) return leads;
    }

    const { items } = await runResult.getData();

    for (const place of items) {
        if (!place.title) continue;
        leads.push({
            source: 'Google Maps',
            businessName: place.title ?? '',
            contactName: '',
            email: place.email ?? extractEmailFromText(place.description ?? ''),
            phone: normalizePhone(place.phone ?? ''),
            website: place.website ?? '',
            address: place.address ?? '',
            city: extractCity(place.address ?? '', locations),
            state: 'Quintana Roo',
            country: 'Mexico',
            category: place.categoryName ?? '',
            rating: place.totalScore ?? '',
            reviewCount: place.reviewsCount ?? 0,
            googleMapsUrl: place.url ?? '',
            description: place.description ?? '',
            tags: inferTags(place),
        });
    }

    return leads.slice(0, maxLeadsPerSource);
}

function normalizePhone(phone) {
    return phone.replace(/[^\d+\s\-()]/g, '').trim();
}

function extractEmailFromText(text) {
    const match = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
    return match ? match[0] : '';
}

function extractCity(address, locations) {
    for (const loc of locations) {
        if (address.toLowerCase().includes(loc.toLowerCase())) return loc;
    }
    return '';
}

function inferTags(place) {
    const tags = [];
    const text = `${place.title ?? ''} ${place.categoryName ?? ''} ${place.description ?? ''}`.toLowerCase();
    if (text.includes('constructor') || text.includes('construc')) tags.push('construction');
    if (text.includes('inmobili') || text.includes('real estate')) tags.push('real-estate');
    if (text.includes('arquitect')) tags.push('architecture');
    if (text.includes('hotel') || text.includes('resort')) tags.push('hospitality');
    if (text.includes('condo') || text.includes('departamento')) tags.push('residential');
    if (text.includes('comercial') || text.includes('oficina')) tags.push('commercial');
    if (text.includes('inversi') || text.includes('invest')) tags.push('investor');
    return tags.join(', ');
}
