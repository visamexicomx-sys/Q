# CLAUDE.md — Recrea Construction Lead Scraper

## Project purpose
Apify actor that scrapes leads (real estate developers, constructoras, architects, agencies) across the Riviera Maya corridor for **Recrea Construction Rivera Maya**.

## Repository structure

```
/
├── src/
│   ├── main.js                  # Actor entrypoint — orchestrates all scrapers
│   ├── scrapers/
│   │   ├── googleMaps.js        # Google Maps via Apify sub-actor (nwua9Gu5YrADL7ZDj)
│   │   ├── inmuebles24.js       # Inmuebles24.com (PlaywrightCrawler)
│   │   ├── lamudi.js            # Lamudi.com.mx (PlaywrightCrawler + cheerio)
│   │   ├── vivanuncios.js       # Vivanuncios.com.mx (PlaywrightCrawler + cheerio)
│   │   └── propiedades.js       # Propiedades.com (PlaywrightCrawler + cheerio)
│   └── utils/
│       ├── leads.js             # Lead type, deduplication, enrichment, scoring
│       └── exporter.js          # CSV and JSON export helpers
├── .actor/
│   ├── actor.json               # Apify actor manifest
│   ├── input_schema.json        # Input schema (shown in Apify Console UI)
│   └── Dockerfile               # Uses apify/actor-node-playwright-chrome:18
├── package.json                 # ESM project, entry: src/main.js
└── README.md                    # Usage, deployment, CRM integration
```

## Key conventions

- **ESM modules** — `"type": "module"` in package.json; use `import/export`, not `require`.
- **Lead shape** — defined as JSDoc `@typedef Lead` in `src/utils/leads.js`. All scrapers must return arrays of `Lead` objects with the same fields.
- **Deduplication key** — `businessName + city` (lowercased, no spaces). When a duplicate is found, keep the record with more filled contact fields.
- **Lead scoring** — `High / Medium / Low` computed in `enrichLead()`. Developers/constructoras with phone+email = High.
- **Error handling** — each scraper catches its own errors and logs a warning; the main orchestrator continues to the next source.
- **Apify APIs** — use `Actor.call()` for sub-actors, `Actor.openDataset()` for persistence, `Actor.openKeyValueStore()` for file exports.

## Target locations
Playa del Carmen, Tulum, Cancun, Bacalar, Puerto Morelos, Akumal, Holbox, Cozumel, Mahahual — all in **Quintana Roo, Mexico**.

## Adding a new scraper
1. Create `src/scrapers/{name}.js` — export `async function scrape{Name}({ locations, maxLeadsPerSource })` returning `Lead[]`.
2. Import and call it in `src/main.js` inside a `try/catch`, guarded by `sources.includes('{name}')`.
3. Add the source key to `input_schema.json` enum list.

## Deployment
```bash
apify login        # authenticate with Apify token
apify push         # deploy actor to Apify cloud
```
Local test: `npm start` (results in `./storage/`).
