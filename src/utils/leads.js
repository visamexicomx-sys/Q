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
 * @property {string} [leadType]      - broker | investor | work | general
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
 * AI-powered enrichment — generates a personalized Spanish pitch using the LLM.
 * Falls back to template-based pitch if LLM is unavailable or fails.
 *
 * @param {Lead} lead
 * @param {{ complete: (prompt: string) => Promise<string> } | null} llmClient
 * @returns {Promise<Lead>}
 */
export async function enrichLeadWithAI(lead, llmClient) {
    const base = enrichLead(lead);
    if (!llmClient) return base;

    try {
        const prompt = buildAIPrompt(lead, base.leadType);
        const aiPitch = await llmClient.complete(prompt);
        return { ...base, commissionPitch: aiPitch, aiEnriched: true };
    } catch {
        return { ...base, aiEnriched: false };
    }
}

function buildAIPrompt(lead, leadType) {
    const name   = lead.contactName || lead.businessName || 'Estimado';
    const city   = lead.city || 'Riviera Maya';
    const biz    = lead.businessName || '';
    const cat    = lead.category || '';
    const desc   = lead.description || '';
    const rating = lead.rating ? `(Google rating: ${lead.rating}/5, ${lead.reviewCount || 0} reviews)` : '';
    const context = [biz, cat, desc, rating].filter(Boolean).join(' | ');

    const roleMap = {
        investor: 'real estate investor or investment fund looking to invest in the Riviera Maya',
        work:     'developer or property owner with a construction project underway',
        broker:   'real estate broker or agent operating in the Riviera Maya',
        general:  'business or contact in the real estate / construction sector in Riviera Maya',
    };

    return `You are a senior sales copywriter for Recrea Construction, a premium construction company in the Riviera Maya, Mexico.

Write a SHORT, personalized WhatsApp/email outreach message in SPANISH to this lead:

Name: ${name}
Company: ${context}
City: ${city}
Lead type: ${roleMap[leadType] || roleMap.general}

Instructions:
- Maximum 150 words
- Warm, professional tone — not salesy
- Mention their company name and city naturally
- Tailor to their role: ${leadType === 'broker' ? 'offer referral commission' : leadType === 'investor' ? 'co-investment opportunity with ROI focus' : leadType === 'work' ? 'free construction quote for their project' : 'introduce Recrea services'}
- End with a clear call to action (WhatsApp or meeting)
- Sign off as: Recrea Construction Riviera Maya
- Do NOT use markdown, headers, or bullet points — plain conversational text only

Write only the message, nothing else.`;
}

/**
 * Add computed fields to a raw lead.
 *
 * @param {Lead} lead
 * @returns {Lead}
 */
export function enrichLead(lead) {
    const isBroker   = detectBroker(lead);
    const isInvestor = detectInvestor(lead);
    const isWork     = detectWorkOpportunity(lead);
    const leadType   = isBroker ? 'broker' : isInvestor ? 'investor' : isWork ? 'work' : 'general';

    return {
        ...lead,
        leadScore: computeLeadScore(lead),
        leadType,
        isBroker,
        isInvestor,
        isWorkOpportunity: isWork,
        commissionPitch: buildOutreachPitch(lead, leadType),
        scrapedAt: new Date().toISOString(),
        notes: suggestNextAction(lead, leadType),
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
 *  - High   → investor / developer / broker with phone + email
 *  - Medium → agency / work project with at least phone
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
    const isInvestor  = detectInvestor(lead);
    const isWork      = detectWorkOpportunity(lead);

    if ((isDeveloper || isAgency || isInvestor || isWork) && hasPhone && hasEmail) return 'High';
    if ((isDeveloper || isAgency || isInvestor || isWork) && hasPhone) return 'High';
    if (hasPhone || hasEmail) return 'Medium';
    if (hasWebsite || lead.googleMapsUrl) return 'Medium';
    return 'Low';
}

function suggestNextAction(lead, leadType) {
    const contact = lead.email || lead.phone || lead.website;
    if (leadType === 'investor') {
        if (lead.email) return `Send investment portfolio email to ${lead.email} — showcase Recrea projects & ROI`;
        if (lead.phone) return `WhatsApp/call ${lead.phone} — present investment opportunity in Riviera Maya construction`;
        if (lead.website) return `Visit ${lead.website} — find contact for investment proposal`;
    }
    if (leadType === 'work') {
        if (lead.email) return `Email ${lead.email} — offer construction quote for their project`;
        if (lead.phone) return `Call ${lead.phone} — ask about construction needs and quote project`;
        if (lead.website) return `Visit ${lead.website} — identify decision maker for construction contract`;
    }
    if (leadType === 'broker') {
        if (lead.email) return `Send commission offer email to ${lead.email}`;
        if (lead.phone) return `WhatsApp/call ${lead.phone} — offer referral commission for construction clients`;
    }
    if (lead.email) return `Send intro email to ${lead.email}`;
    if (lead.phone) return `Call ${lead.phone} — ask for decision maker`;
    if (lead.website) return `Visit ${lead.website} and find contact form`;
    if (lead.googleMapsUrl) return 'Visit Google Maps listing to get contact info';
    return 'Research company to find contact details';
}

/**
 * Returns true if the lead is likely a real estate broker/agent.
 */
function detectBroker(lead) {
    const text = `${lead.businessName} ${lead.contactName} ${lead.category} ${lead.tags} ${lead.description}`.toLowerCase();
    return (
        text.includes('agente') ||
        text.includes('broker') ||
        text.includes('asesor') ||
        text.includes('realtor') ||
        text.includes('inmobiliaria') ||
        text.includes('inmobiliario') ||
        text.includes('real estate agent') ||
        text.includes('real estate broker') ||
        text.includes('agency') ||
        text.includes('agencia')
    );
}

/**
 * Returns true if the lead is likely a real estate investor or investment fund.
 */
function detectInvestor(lead) {
    const text = `${lead.businessName} ${lead.contactName} ${lead.category} ${lead.tags} ${lead.description}`.toLowerCase();
    return (
        text.includes('inversionista') ||
        text.includes('inversor') ||
        text.includes('inversion') ||
        text.includes('inversión') ||
        text.includes('investor') ||
        text.includes('investment') ||
        text.includes('fondo') ||
        text.includes('fund') ||
        text.includes('capital') ||
        text.includes('fideicomiso') ||
        text.includes('crowdfunding') ||
        text.includes('venture') ||
        text.includes('private equity') ||
        text.includes('grupo empresarial') ||
        text.includes('holding')
    );
}

/**
 * Returns true if the lead represents a project that needs construction work.
 */
function detectWorkOpportunity(lead) {
    const text = `${lead.businessName} ${lead.contactName} ${lead.category} ${lead.tags} ${lead.description}`.toLowerCase();
    return (
        text.includes('en construccion') ||
        text.includes('en construcción') ||
        text.includes('under construction') ||
        text.includes('obra nueva') ||
        text.includes('proyecto') ||
        text.includes('por construir') ||
        text.includes('en preventa') ||
        text.includes('pre-construccion') ||
        text.includes('pre-venta') ||
        text.includes('terreno con proyecto') ||
        text.includes('lote con proyecto') ||
        text.includes('desarrollo') ||
        text.includes('fraccionamiento') ||
        text.includes('villa') ||
        text.includes('boutique hotel') ||
        text.includes('hotel boutique') ||
        text.includes('condo') ||
        text.includes('residencial')
    );
}

/**
 * Builds a personalized outreach pitch based on lead type.
 */
function buildOutreachPitch(lead, leadType) {
    const name = lead.contactName || lead.businessName || 'Estimado';
    const city = lead.city || 'Riviera Maya';

    if (leadType === 'investor') {
        return (
            `Hola ${name},\n\n` +
            `Soy de Recrea Construction, empresa constructora con amplia experiencia en proyectos residenciales, comerciales y de hospitalidad en ${city} y toda la Riviera Maya.\n\n` +
            `Estamos en búsqueda de socios inversionistas para co-desarrollar proyectos de alto rendimiento en la zona. La Riviera Maya es uno de los mercados inmobiliarios con mayor crecimiento en Latinoamérica.\n\n` +
            `💼 ¿Qué ofrecemos?\n` +
            `✅ Proyectos con ROI comprobado en Riviera Maya\n` +
            `✅ Villas residenciales, condos, hoteles boutique y comerciales\n` +
            `✅ Gestión integral: permisos, construcción y entrega llave en mano\n` +
            `✅ Transparencia total: reportes de avance y estados financieros\n` +
            `✅ Equipo con más de 10 años en el mercado local\n\n` +
            `¿Te interesa conocer nuestro portafolio de inversión? ¡Hablemos!\n\n` +
            `Recrea Construction Riviera Maya`
        );
    }

    if (leadType === 'work') {
        return (
            `Hola ${name},\n\n` +
            `Somos Recrea Construction, constructora especializada en proyectos residenciales y comerciales en ${city} y la Riviera Maya.\n\n` +
            `Vimos su proyecto y nos gustaría presentarles una propuesta de construcción adaptada a sus necesidades.\n\n` +
            `🔨 ¿Por qué elegirnos?\n` +
            `✅ Presupuesto detallado sin costo\n` +
            `✅ Experiencia en villas, condos, hoteles boutique y comercio\n` +
            `✅ Materiales de calidad y acabados de primer nivel\n` +
            `✅ Cumplimiento de plazos y presupuesto garantizado\n` +
            `✅ Permisos y trámites incluidos\n\n` +
            `¿Podemos agendar una visita a su terreno/proyecto para presentar nuestra propuesta?\n\n` +
            `Recrea Construction Riviera Maya`
        );
    }

    // Default: broker commission pitch
    return (
        `Hola ${name},\n\n` +
        `Soy de Recrea Construction, empresa constructora especializada en proyectos residenciales y comerciales en ${city} y toda la Riviera Maya.\n\n` +
        `Te invitamos a ser parte de nuestro programa de referidos: por cada cliente que nos refieras y concrete un proyecto de construcción, te ofrecemos una COMISIÓN COMPETITIVA sobre el valor total de la obra.\n\n` +
        `✅ Comisión atractiva por referido\n` +
        `✅ Proyectos residenciales, condos, hoteles boutique y comerciales\n` +
        `✅ Empresa con experiencia comprobada en Riviera Maya\n` +
        `✅ Acompañamiento completo durante todo el proyecto\n\n` +
        `¿Tienes clientes que buscan construir en la zona? ¡Hablemos!\n\n` +
        `Recrea Construction Riviera Maya`
    );
}
