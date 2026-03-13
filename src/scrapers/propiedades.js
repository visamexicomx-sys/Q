/**
 * Propiedades.com Scraper
 *
 * Propiedades.com is a leading Mexican real estate portal with extensive
 * developer and agency profiles for the Riviera Maya region.
 *
 * URL pattern: https://www.propiedades.com/{state}/{city}/
 */

import { PlaywrightCrawler } from 'crawlee';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://www.propiedades.com';

const LOCATION_SLUGS = {
    'Playa del Carmen': 'quintana-roo/playa-del-carmen',
    'Tulum':            'quintana-roo/tulum',
    'Cancun':           'quintana-roo/cancun',
    'Bacalar':          'quintana-roo/bacalar',
    'Puerto Morelos':   'quintana-roo/puerto-morelos',
    'Akumal':           'quintana-roo/akumal',
    'Cozumel':          'quintana-roo/cozumel',
    'Holbox':           'quintana-roo/holbox',
    'Mahahual':         'quintana-roo/mahahual',
};

/**
 * @param {{ locations: string[], maxLeadsPerSource: number }} opts
 * @returns {Promise<import('../utils/leads.js').Lead[]>}
 */
export async function scrapePropiedades({ locations, maxLeadsPerSource }) {
    const leads = [];

    const startUrls = locations
        .filter(loc => LOCATION_SLUGS[loc])
        .map(loc => ({ url: `${BASE_URL}/${LOCATION_SLUGS[loc]}/`, userData: { city: loc } }));

    const crawler = new PlaywrightCrawler({
        maxRequestsPerCrawl: startUrls.length * 2,
        requestHandlerTimeoutSecs: 30,

        async requestHandler({ page, request }) {
            const { city } = request.userData;
            await page.waitForSelector('[class*="listing"], [class*="property-card"], article', { timeout: 15000 }).catch(() => {});

            const html = await page.content();
            const $ = cheerio.load(html);

            $('[class*="listing-card"], [class*="property-card"], article.listing, .result-item').each((_, el) => {
                const agency  = $(el).find('[class*="agency"], [class*="developer"], [class*="broker"]').first().text().trim();
                const agent   = $(el).find('[class*="agent"], [class*="contact-name"]').first().text().trim();
                const title   = $(el).find('h2, h3, [class*="title"]').first().text().trim();
                const price   = $(el).find('[class*="price"]').first().text().trim();
                const phone   = $(el).find('[href^="tel:"]').attr('href')?.replace('tel:', '') ?? '';
                const email   = $(el).find('[href^="mailto:"]').attr('href')?.replace('mailto:', '') ?? '';
                const address = $(el).find('[class*="location"], [class*="address"], address').first().text().trim();
                const link    = $(el).find('a[href*="/propiedad/"], a[href*="/inmueble/"]').first().attr('href') ?? $(el).find('a').first().attr('href') ?? '';

                if (!agency && !agent && !title) return;

                leads.push({
                    source: 'Propiedades.com',
                    businessName: agency,
                    contactName: agent,
                    email,
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
                    tags: 'real-estate, propiedades-com, riviera-maya',
                });
            });
        },

        failedRequestHandler({ request, error }) {
            console.warn(`  [Propiedades.com] Failed: ${request.url} — ${error.message}`);
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
