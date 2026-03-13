# Recrea Construction Riviera Maya — Lead Scraper

Automated lead generation for **Recrea Construction** operating in the Riviera Maya corridor (Quintana Roo, Mexico).

## What it scrapes

| Source | Data extracted |
|--------|---------------|
| **Google Maps** | Business name, phone, email, website, address, rating, category |
| **Inmuebles24** | Agency name, agent name, phone, listing details |
| **Lamudi** | Developer/agency name, phone, listing details |
| **Vivanuncios** | Seller/agency name, phone, listing details |
| **Propiedades.com** | Agency, agent, phone, email, listing details |

## Target locations

- Playa del Carmen
- Tulum
- Cancun
- Bacalar
- Puerto Morelos
- Akumal
- Holbox
- Cozumel
- Mahahual

## Target lead categories

- Real estate developers (desarrolladores inmobiliarios)
- Construction companies (constructoras)
- Architects (arquitectos)
- Real estate agencies (inmobiliarias)
- Hotel / resort developers
- Residential condo developers
- Land owners / investors

## Lead scoring

| Score | Criteria |
|-------|---------|
| **High** | Developer or agency with phone + email |
| **Medium** | Has phone OR email OR website |
| **Low** | Listing only — needs manual research |

## Running on Apify

### 1. Deploy to Apify

```bash
npm install -g apify-cli
apify login
apify push
```

### 2. Run via Apify Console

1. Go to [Apify Console](https://console.apify.com)
2. Find actor `recrea-construction-riviera-maya-leads`
3. Set input (or use defaults)
4. Click **Run**
5. Download results as CSV or JSON from the **Dataset** tab

### 3. Run locally (for testing)

```bash
npm install
npm start
```

Results are saved to `./storage/datasets/recrea-leads/` and `./storage/key_value_stores/default/`.

## Input configuration

```json
{
  "searchQueries": [
    "desarrolladores inmobiliarios Riviera Maya",
    "constructoras Playa del Carmen"
  ],
  "locations": ["Playa del Carmen", "Tulum", "Cancun"],
  "maxLeadsPerSource": 50,
  "sources": ["google_maps", "inmuebles24", "lamudi", "vivanuncios", "propiedades_com"],
  "exportFormat": "csv"
}
```

## Output CSV columns

`leadScore, businessName, contactName, email, phone, website, city, state, country, address, category, tags, rating, reviewCount, description, source, googleMapsUrl, listingUrl, notes, scrapedAt`

## CRM integration

Export the CSV and import directly into:
- **HubSpot** → Contacts → Import
- **Pipedrive** → Leads → Import
- **Google Sheets** → File → Import
- **Notion** → Database → Import CSV

---

*Built for Recrea Construction Riviera Maya — commercial construction & development services.*
