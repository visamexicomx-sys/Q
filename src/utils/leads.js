/**
 * Lead utilities — deduplication, enrichment, and type definitions.
 *
 * @typedef {Object} Lead
 * @property {string} source          - Where the lead was found
 * @property {string} businessName    - Company / developer / agency name
 * @property {string} contactName     - Agent / contact person name
 * @property {string} email           - Contact email
 * @property {string} phone           - Contact phone
 * @property {string} website         - Company website
 * @property {string} address         - Street address
 * @property {string} city            - City (e.g. Tulum)
 * @property {string} state           - State (Quintana Roo)
 * @property {string} country         - Country
 * @property {string} category        - Business category
 * @property {string|number} rating   - Google rating
 * @property {number} reviewCount     - Number of reviews
 * @property {string} googleMapsUrl   - Google Maps URL
 * @property {string} description     - Short description / listing title
 * @property {string} [listingUrl]    - Portal listing URL
 * @property {string} tags            - Comma-separated tags
 * @property {string} [leadScore]     - Computed priority score (High/Medium/Low)
 * @property {string} [scrapedAt]     - ISO timestamp of when lead was scraped
 * @property {string} [notes]         - CRM notes / next-action suggestion
 */

/**
 * Remove duplicate leads by business name + city fingerprint.
 * When duplicates exist, prefer the one with more contact data.
 *
 * @param {Lead[]} leads
 * @returns {Lead[]}
 */
export function deduplicateLeads(leads) {
    const map = new Map();

    for (const lead of leads) {
        const key = fingerprint(lead);
        if (!map.has(key)) {
            map.set(key, lead);
        } else {
            const existing = map.get(key);
            // Prefer whichever has more filled fields
            if (scoreCompleteness(lead) > scoreCompleteness(existing)) {
                map.set(key, lead);
            }
        }
    }

    return Array.from(map.values());
}

/**
 * Add computed fields to a raw lead.
 *
 * @param {Lead} lead
 * @returns {Lead}
 */
export function enrichLead(lead) {
    return {
        ...lead,
        leadScore: computeLeadScore(lead),
        scrapedAt: new Date().toISOString(),
        notes: suggestNextAction(lead),
    };
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function fingerprint(lead) {
    const name = (lead.businessName || lead.contactName || '').toLowerCase().replace(/\s+/g, '');
    const city = (lead.city || '').toLowerCase().replace(/\s+/g, '');
    return `${name}|${city}`;
}

function scoreCompleteness(lead) {
    let score = 0;
    if (lead.email) score += 3;
    if (lead.phone) score += 3;
    if (lead.website) score += 2;
    if (lead.businessName) score += 2;
    if (lead.contactName) score += 1;
    if (lead.address) score += 1;
    return score;
}

/**
 * Lead scoring for Recrea Construction Riviera Maya:
 *  - High   → direct developer / constructora with phone + email
 *  - Medium → agency / architect with at least phone
 *  - Low    → listing only, no contact info
 */
function computeLeadScore(lead) {
    const hasEmail   = !!lead.email;
    const hasPhone   = !!lead.phone;
    const hasWebsite = !!lead.website;
    const tags       = (lead.tags || '').toLowerCase();
    const category   = (lead.category || '').toLowerCase();

    const isDeveloper = category.includes('developer') || tags.includes('construction') || category.includes('constructor');
    const isAgency    = category.includes('agenc') || category.includes('real estate');

    if ((isDeveloper || isAgency) && hasPhone && hasEmail) return 'High';
    if ((isDeveloper || isAgency) && hasPhone) return 'High';
    if (hasPhone || hasEmail) return 'Medium';
    if (hasWebsite || lead.googleMapsUrl) return 'Medium';
    return 'Low';
}

function suggestNextAction(lead) {
    if (lead.email) return `Send intro email to ${lead.email}`;
    if (lead.phone) return `Call ${lead.phone} — ask for construction manager`;
    if (lead.website) return `Visit ${lead.website} and find contact form`;
    if (lead.googleMapsUrl) return 'Visit Google Maps listing to get contact info';
    return 'Research company to find contact details';
}
