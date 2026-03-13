/**
 * Google Maps Scraper
 *
 * Uses Apify's built-in Google Maps Scraper actor as a sub-actor,
 * or falls back to a direct Playwright-based scrape of Google Maps search.
 *
 * Target categories for Recrea Construction leads:
 *  - Real estate developers / Desarrolladores inmobiliarios
 *  - Architects / Arquitectos
 *  - Construction companies / Constructoras
 *  - Real estate agents / Agentes inmobiliarios
 *  - Hotels & Resorts (potential construction clients)
 */

import { Actor } from 'apify';

/**
 * @param {{ searchQueries: string[], locations: string[], maxLeadsPerSource: number }} opts
 * @returns {Promise<import('../utils/leads.js').Lead[]>}
 */
export async function scrapeGoogleMaps({ searchQueries, locations, maxLeadsPerSource }) {
    const leads = [];

    // Build combined queries: each query × each location
    const combinedQueries = [];
    for (const query of searchQueries) {
        for (const location of locations) {
            combinedQueries.push(`${query} ${location}`);
        }
    }

    // Call the Apify Google Maps Scraper actor (nwua9Gu5YrADL7ZDj)
    // This is the official Apify actor for Google Maps scraping
    let runResult;
    try {
        const run = await Actor.call('nwua9Gu5YrADL7ZDj', {
            searchStringsArray: combinedQueries.slice(0, 20), // cap at 20 combined queries
            maxCrawledPlacesPerSearch: Math.ceil(maxLeadsPerSource / locations.length),
            language: 'es',
            countryCode: 'mx',
            includeWebResults: false,
            exportPlaceUrls: false,
        });
        runResult = await Actor.openDataset(run.defaultDatasetId);
    } catch (err) {
        console.warn('  [Google Maps] Could not call sub-actor, skipping:', err.message);
        return leads;
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
