/**
 * Inmuebles24.com Scraper
 *
 * Scrapes real estate developer / agency listings from Mexico's largest
 * real estate portal. Extracts agency name, agent name, phone, email,
 * and location for the Riviera Maya corridor.
 *
 * URL pattern: https://www.inmuebles24.com/inmuebles-en-venta-en-{location}.html
 */

import { PlaywrightCrawler, RequestList } from 'crawlee';

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

/**
 * @param {{ locations: string[], maxLeadsPerSource: number }} opts
 * @returns {Promise<import('../utils/leads.js').Lead[]>}
 */
export async function scrapeInmuebles24({ locations, maxLeadsPerSource }) {
    const leads = [];

    const startUrls = locations
        .filter(loc => LOCATION_SLUGS[loc])
        .map(loc => ({
            url: `${BASE_URL}/inmuebles-en-venta-en-${LOCATION_SLUGS[loc]}.html`,
            userData: { location: loc, page: 1 },
        }));

    const crawler = new PlaywrightCrawler({
        maxRequestsPerCrawl: startUrls.length * 3,
        requestHandlerTimeoutSecs: 30,

        async requestHandler({ page, request, enqueueLinks }) {
            const { location } = request.userData;
            await page.waitForSelector('[data-qa="posting PROPERTY"]', { timeout: 15000 }).catch(() => {});

            const listings = await page.$$eval('[data-qa="posting PROPERTY"]', (cards) =>
                cards.map(card => {
                    const agency = card.querySelector('[data-qa="posting-card-publisher-name"]')?.textContent?.trim() ?? '';
                    const agent  = card.querySelector('[data-qa="posting-card-publisher-agent"]')?.textContent?.trim() ?? '';
                    const phone  = card.querySelector('[data-qa="posting-card-phone"]')?.textContent?.trim() ?? '';
                    const title  = card.querySelector('[data-qa="posting-card-title"]')?.textContent?.trim() ?? '';
                    const price  = card.querySelector('[data-qa="posting-card-price"]')?.textContent?.trim() ?? '';
                    const address = card.querySelector('[data-qa="posting-card-location"]')?.textContent?.trim() ?? '';
                    const link   = card.querySelector('a')?.href ?? '';
                    return { agency, agent, phone, title, price, address, link };
                })
            );

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
                    description: `${listing.title} — ${listing.price}`,
                    listingUrl: listing.link,
                    tags: 'real-estate, inmuebles24',
                });
            }

            if (leads.length < maxLeadsPerSource) {
                const nextButton = await page.$('[data-qa="PAGING_NEXT"]');
                if (nextButton) {
                    await enqueueLinks({ selector: '[data-qa="PAGING_NEXT"]' });
                }
            }
        },

        failedRequestHandler({ request, error }) {
            console.warn(`  [Inmuebles24] Failed: ${request.url} — ${error.message}`);
        },
    });

    const requestList = await RequestList.open(null, startUrls);
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
