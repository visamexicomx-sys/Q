/**
 * Lamudi.com.mx Scraper (stealth edition)
 */

import { PlaywrightCrawler } from 'crawlee';
import * as cheerio from 'cheerio';
import { stealthCrawlerOptions } from '../utils/stealth.js';

const BASE_URL = 'https://www.lamudi.com.mx';

const LOCATION_SLUGS = {
    'Playa del Carmen': 'playa-del-carmen',
    'Tulum':            'tulum',
    'Cancun':           'cancun',
    'Bacalar':          'bacalar',
    'Puerto Morelos':   'puerto-morelos',
    'Akumal':           'akumal',
    'Holbox':           'isla-holbox',
    'Cozumel':          'cozumel',
    'Mahahual':         'mahahual',
};

export async function scrapeLamudi({ locations, maxLeadsPerSource }) {
    const leads = [];

    const startUrls = locations
        .filter(loc => LOCATION_SLUGS[loc])
        .map(loc => `${BASE_URL}/quintana-roo/${LOCATION_SLUGS[loc]}/buy/`);

    const crawler = new PlaywrightCrawler({
        ...stealthCrawlerOptions({ maxRequestsPerCrawl: startUrls.length * 2 }),

        async requestHandler({ page, request }) {
            const locationMatch = request.url.match(/quintana-roo\/([^/]+)\//);
            const locationSlug = locationMatch ? locationMatch[1] : '';
            const city = Object.entries(LOCATION_SLUGS).find(([, slug]) => slug === locationSlug)?.[0] ?? locationSlug;

            await page.waitForSelector('.ListingCell-info, [class*="listing"], article', { timeout: 20000 }).catch(() => {});
            const html = await page.content();
            const $ = cheerio.load(html);

            $('.ListingCell-info, [class*="ListingCell"], article.listing').each((_, el) => {
                const agency  = $(el).find('.broker-name, .listing-broker-name, [class*="broker"]').first().text().trim();
                const agent   = $(el).find('.agent-name, [class*="agent"]').first().text().trim();
                const phone   = $(el).find('[class*="phone"], [href^="tel:"]').first().text().trim();
                const title   = $(el).find('.ListingCell-info-title, h2, h3').first().text().trim();
                const price   = $(el).find('.PriceSection-FirstPrice, [class*="price"]').first().text().trim();
                const address = $(el).find('.ListingCell-KeyInfo-address, [class*="address"]').first().text().trim();
                const link    = $(el).closest('a').attr('href') ?? $(el).find('a').first().attr('href') ?? '';

                if (!agency && !agent && !title) return;

                leads.push({
                    source: 'Lamudi',
                    businessName: agency,
                    contactName: agent,
                    email: '',
                    phone,
                    website: '',
                    address,
                    city,
                    state: 'Quintana Roo',
                    country: 'Mexico',
                    category: 'Real Estate Developer/Agency',
                    rating: '',
                    reviewCount: 0,
                    googleMapsUrl: '',
                    description: `${title} — ${price}`.trim(),
                    listingUrl: link.startsWith('http') ? link : `${BASE_URL}${link}`,
                    tags: 'real-estate, lamudi, riviera-maya',
                });
            });
        },

        failedRequestHandler({ request, error }) {
            console.warn(`  [Lamudi] Failed: ${request.url} — ${error.message}`);
        },
    });

    await crawler.run(startUrls);
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
