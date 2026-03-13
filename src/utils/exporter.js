/**
 * Lead export utilities — CSV and JSON output.
 */

/** CSV column headers in the order they appear in the export */
const CSV_COLUMNS = [
    'leadScore',
    'leadType',
    'isBroker',
    'isInvestor',
    'isWorkOpportunity',
    'businessName',
    'contactName',
    'email',
    'phone',
    'website',
    'city',
    'state',
    'country',
    'address',
    'category',
    'tags',
    'rating',
    'reviewCount',
    'description',
    'source',
    'googleMapsUrl',
    'listingUrl',
    'notes',
    'commissionPitch',
    'scrapedAt',
];

/**
 * Convert leads array to a CSV string.
 *
 * @param {import('./leads.js').Lead[]} leads
 * @returns {Promise<string>}
 */
export async function writeLeadsToCsv(leads) {
    const header = CSV_COLUMNS.join(',');
    const rows = leads.map(lead =>
        CSV_COLUMNS.map(col => {
            const val = String(lead[col] ?? '');
            // Escape fields that contain commas, quotes, or newlines
            if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        }).join(',')
    );
    return [header, ...rows].join('\n');
}

/**
 * Convert leads array to a pretty-printed JSON string.
 *
 * @param {import('./leads.js').Lead[]} leads
 * @returns {string}
 */
export function writeLeadsToJson(leads) {
    return JSON.stringify(
        {
            generatedAt: new Date().toISOString(),
            totalLeads: leads.length,
            business: 'Recrea Construction Riviera Maya',
            leads,
        },
        null,
        2
    );
}
