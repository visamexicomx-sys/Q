/**
 * Inmuebles24.com Scraper (stealth edition)
 * Uses stealth Playwright to bypass 403 anti-bot blocking.
 */

import { PlaywrightCrawler } from 'crawlee';
import { stealthCrawlerOptions } from '../utils/stealth.js';

const BASE_URL = 'https://www.inmuebles24.com';

const LOCATION_SLUGS = {
    'Playa del Carmen': 'playa-del-carmen',
    'Tulum':            'tulum',
    'Cancun':           'cancun',
    'Bacalar':          'bacalar',
    'Puerto Morelos':   'puerto-morelos',
    'Akumal':           'akumal',
    'Holbox':           'holbox',
    'Cozumel':          'cozumel',
    'Mahahual':         'mahahual',
};

export async function scrapeInmuebles24({ locations, maxLeadsPerSource }) {
    const leads = [];

    const startUrls = locations
        .filter(loc => LOCATION_SLUGS[loc])
        .map(loc => ({
            url: `${BASE_URL}/inmuebles-en-venta-en-${LOCATION_SLUGS[loc]}.html`,
            userData: { location: loc },
        }));

    const crawler = new PlaywrightCrawler({
        ...stealthCrawlerOptions({ maxRequestsPerCrawl: startUrls.length * 3 }),

        async requestHandler({ page, request, enqueueLinks }) {
            const { location } = request.userData;
            await page.waitForSelector('[data-qa="posting PROPERTY"], .posting-card, article', { timeout: 20000 }).catch(() => {});

            const listings = await page.$$eval(
                '[data-qa="posting PROPERTY"], .posting-card, article.avisoNormal',
                (cards) => cards.map(card => ({
                    agency:  card.querySelector('[data-qa="posting-card-publisher-name"], .publisher-name')?.textContent?.trim() ?? '',
                    agent:   card.querySelector('[data-qa="posting-card-publisher-agent"], .agent-name')?.textContent?.trim() ?? '',
                    phone:   card.querySelector('[data-qa="posting-card-phone"], [href^="tel:"]')?.textContent?.trim() ?? '',
                    title:   card.querySelector('[data-qa="posting-card-title"], h2, h3')?.textContent?.trim() ?? '',
                    price:   card.querySelector('[data-qa="posting-card-price"], .price')?.textContent?.trim() ?? '',
                    address: card.querySelector('[data-qa="posting-card-location"], .address')?.textContent?.trim() ?? '',
                    link:    card.querySelector('a')?.href ?? '',
                }))
            ).catch(() => []);

            for (const listing of listings) {
                if (!listing.agency && !listing.agent) continue;
                leads.push({
                    source: 'Inmuebles24',
                    businessName: listing.agency,
                    contactName: listing.agent,
                    email: '',
                    phone: listing.phone,
                    website: '',
                    address: listing.address,
                    city: location,
                    state: 'Quintana Roo',
                    country: 'Mexico',
                    category: 'Real Estate Agency',
                    rating: '',
                    reviewCount: 0,
                    googleMapsUrl: '',
                    description: `${listing.title} — ${listing.price}`.trim(),
                    listingUrl: listing.link,
                    tags: 'real-estate, inmuebles24',
                });
            }

            if (leads.length < maxLeadsPerSource) {
                await enqueueLinks({ selector: '[data-qa="PAGING_NEXT"], a[rel="next"]' }).catch(() => {});
            }
        },

        failedRequestHandler({ request, error }) {
            console.warn(`  [Inmuebles24] Failed: ${request.url} — ${error.message}`);
        },
    });

    await crawler.run(startUrls.map(r => r.url));
    return dedup(leads).slice(0, maxLeadsPerSource);
}

function dedup(leads) {
    const seen = new Set();
    return leads.filter(l => {
        const key = `${l.businessName}|${l.contactName}|${l.city}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}
